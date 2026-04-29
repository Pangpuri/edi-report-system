// services/edi-parser.ts
import iconv from "iconv-lite";
import { db } from "@/db";
import { EDH_tmp, EDL_tmp, prodcode, customer, custAddress } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

// Core Modules
import { EDIPreProcessor } from "./edi-preprocessor";
import { insertRawLines } from "./edi-raw-service";
import { BigCNormalizer } from "./bigc-normalizer";
import { CJNormalizer } from "./cj-normalizer";

// Parsers
import { EDIParserModule } from "./parsers/base-parser";
import { BigCParser } from "./parsers/parser-bigc";
import { CJParser } from "./parsers/parser-cj";
import { CentralParser } from "./parsers/parser-central";

// ============================================
// 📊 Master Data Lookup Logic (Read-Only)
// ============================================

async function lookupCustomerMaster(vendorCode: string) {
  if (!vendorCode || vendorCode === "UNKNOWN") return null;
  const cleanedCode = vendorCode.trim();
  
  const master = await db.query.customer.findFirst({
    where: (c, { eq }) => eq(sql`TRIM(${c.customer_code})`, cleanedCode)
  });

  if (master) {
    return {
      shortName: master.short_name || "",
      companyName: master.company_name || "",
      customerCode: master.customer_code || ""
    };
  }

  const addr = await db.query.custAddress.findFirst({
    where: (a, { eq }) => eq(sql`TRIM(${a.customer_no})`, cleanedCode)
  });

  return addr ? {
    shortName: addr.branch_short_name || cleanedCode,
    companyName: addr.company_name || "",
    customerCode: cleanedCode
  } : null;
}

async function lookupProductMaster(barcode: string) {
  if (!barcode) return null;
  const cleanedBarcode = barcode.replace(/[^\d.]/g, "").trim();
  if (cleanedBarcode.length < 13) return null;

  const product = await db.query.prodcode.findFirst({
    where: (p, { eq }) => eq(sql`TRIM(${p.ean_product_code})`, cleanedBarcode)
  });

  return product ? {
    description: product.product_description || "",
    barcode: product.ean_product_code || cleanedBarcode,
    internalCode: product.product_code || ""
  } : null;
}

// ============================================
// 🛠️ Dispatcher & Formatting
// ============================================

function getParserByVendor(vendorCode: string): EDIParserModule {
  const vCode = vendorCode.trim();
  if (vCode === "983181") return BigCParser;
  if (vCode === "231086") return CJParser;
  if (vCode === "983927") return CentralParser;
  return CJParser;
}

function formatDecimal(raw: string | null | undefined, dotPos: number): string {
  if (!raw) return "0.00";
  const cleaned = raw.replace(/[^\d.]/g, "").trim();
  if (!cleaned || cleaned === "0") return "0.00";
  const num = parseFloat(cleaned);
  const divisor = Math.pow(10, dotPos);
  return (num / divisor).toFixed(2);
}

function extractBuyerName(line: string): string {
  const trimmed = line.trim();
  let match = trimmed.match(/\d+\s+\d+\s+([A-Za-z0-9\u0E00-\u0E7F ]+)$/);
  if (match && match[1]) return match[1].trim();
  match = trimmed.match(/R\d+\s+([A-Za-z0-9\u0E00-\u0E7F ]+)$/);
  if (match && match[1]) return match[1].trim();
  return "";
}

// ============================================
// 🚀 Main Intelligence Parser Pipeline
// ============================================

export async function parseEDIFileDelphi(buffer: Buffer, fileName: string, shouldClear: boolean = true) {
  console.log(`\n🚀 [Strict Mapping Parser] เริ่มประมวลผล: ${fileName}`);

  try {
    const text = iconv.decode(buffer, "cp874");
    // 🧠 สำหรับ BigC/CJ เราจะเก็บแบบ Hex String เพื่อรักษาพิกัด Byte ให้แม่นยำ 100% ไม่โดน Encoding ดีด
    const rawLinesBytePerfect = buffer.toString("hex").match(/.{1,674}/g) || []; // สมมติความยาวบรรทัดเฉลี่ย
    // แต่เพื่อความชัวร์ เราจะแยกบรรทัดจาก Buffer จริงๆ
    const rawBufferLines: string[] = [];
    let start = 0;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0x0a || buffer[i] === 0x0d) {
        if (i > start) rawBufferLines.push(buffer.slice(start, i).toString("hex"));
        if (buffer[i] === 0x0d && buffer[i+1] === 0x0a) i++;
        start = i + 1;
      }
    }
    
    // 1. 🧠 Pre-scan ตรวจหาลูกค้า
    const detectedVendor = await EDIPreProcessor.detectVendor(text);
    console.log(`🔍 ตรวจพบรหัสห้าง: ${detectedVendor}`);

    // 2. 🧹 จัดระเบียบข้อความ
    const rawLines = EDIPreProcessor.normalizeText(text);
    const structuredLines = EDIPreProcessor.analyzeStructure(rawLines);

    // 3. 💾 บันทึก Audit Staging (ใช้ Hex เพื่อความแม่นยำระดับไบต์)
    if (detectedVendor === "983181") {
      await insertRawLines({ fileName, lines: rawBufferLines, vendorCode: detectedVendor });
    } else {
      await insertRawLines({ fileName, lines: rawLines, vendorCode: detectedVendor });
    }

    // 4. 🚀 ใช้ Normalizer เฉพาะราย (กรณี Big C หรือ CJ) หรือ Pipeline ปกติ
    if (detectedVendor === "983181") {
       console.log("🎯 เข้าสู่โหมด BigC Binary Pipeline (Direct Buffer Mode)");
       if (shouldClear) {
         await db.delete(EDH_tmp);
         await db.delete(EDL_tmp);
       }
       // 🛡️ ส่ง Buffer ดิบๆ เข้าไปหั่นที่ระดับไบต์เพื่อความแม่นยำ 100%
       return await BigCNormalizer.processBuffer(buffer, fileName, detectedVendor);
    }

    if (detectedVendor === "231086") {
       console.log("🎯 เข้าสู่โหมด CJ Strict Normalization");
       if (shouldClear) {
         await db.delete(EDH_tmp);
         await db.delete(EDL_tmp);
       }
       return await CJNormalizer.processFromStaging(fileName);
    }

    // --- Pipeline ปกติสำหรับห้างอื่น ---
    if (shouldClear) {
      await db.delete(EDH_tmp);
      await db.delete(EDL_tmp);
    }

    const detailMap = new Map<string, any>();
    let currentCustomerPo = "";
    let masterCustomer: any = null;
    let headerCount = 0;

    const parser = getParserByVendor(detectedVendor);

    for (const lineObj of structuredLines) {
      const { content, type } = lineObj;
      
      try {
        if (type === "H") {
          const raw = parser.extractH(content, detectedVendor);
          currentCustomerPo = raw.customerPo;

          // 🔍 Enrichment: Lookup Customer Master Data
          masterCustomer = await lookupCustomerMaster(detectedVendor);

          await db.insert(EDH_tmp).values({
            hType: "H",
            customerPo: currentCustomerPo,
            customerNum: masterCustomer?.shortName || detectedVendor,
            buyerName: masterCustomer?.customerCode || detectedVendor, 
            customerName: masterCustomer?.companyName || "",
            datePo: raw.orderDate,
            dateShip: raw.requestDate,
            totalAmount: formatDecimal(raw.rawTotalAmount, 2),
            fileName: fileName,
          });
          headerCount++;
        }
        else if (type === "D") {
          const raw = parser.extractD(content, detectedVendor);
          if (!raw) continue;

          const productInfo = await lookupProductMaster(raw.barcode);
          const unitPrice = formatDecimal(raw.unitPrice, 2);
          const orderQty = formatDecimal(raw.orderQty, 0); 
          
          let netAmount = formatDecimal(raw.rawNetAmount || "0", 2);
          if (netAmount === "0.00") {
             netAmount = (parseFloat(unitPrice) * parseFloat(orderQty)).toFixed(2);
          }

          const key = `${currentCustomerPo}|${raw.seqNum}`;

          detailMap.set(key, {
            dType: "D",
            customerPo: currentCustomerPo,
            customerNum: masterCustomer?.customerCode || detectedVendor,
            seqNum: raw.seqNum,
            productName: productInfo?.description || raw.rawProductName, 
            packSize: "CN", 
            eanNum: productInfo?.barcode || raw.barcode, 
            buyerProdCode: masterCustomer?.customerCode || detectedVendor,
            vendorProdCode: raw.buyerProdCode || "", 
            qtyOrder: orderQty,
            priceUnit: unitPrice,
            freeQty: formatDecimal(raw.freeQty, 0),
            discount1: formatDecimal(raw.discountPct, 2),
            discount2: formatDecimal(raw.discountAmt, 2),
            totalAmount: netAmount, 
            fileName: fileName,
            checkNameOldProd: raw.rawProductName, 
          });
        }
        else if (type === "L") {
          if (!parser.extractL) continue;
          const rawL = parser.extractL(content, detectedVendor);
          if (!rawL) continue;

          const key = `${currentCustomerPo}|${rawL.seqNum}`;
          const existing = detailMap.get(key);
          if (existing) {
             const qty = formatDecimal(rawL.qty, 2);
             existing.qtyOrder = (parseFloat(existing.qtyOrder) + parseFloat(qty)).toFixed(2);
          }
        }
      } catch (lineErr) {
        console.error(`❌ ผิดพลาดที่บรรทัด ${lineObj.index}:`, lineErr);
      }
    }

    const detailsToInsert = Array.from(detailMap.values());
    if (detailsToInsert.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < detailsToInsert.length; i += chunkSize) {
        await db.insert(EDL_tmp).values(detailsToInsert.slice(i, i + chunkSize));
      }
    }

    revalidatePath("/");
    return { success: true, headerCount, detailCount: detailsToInsert.length };
  } catch (err) {
    console.error("🚨 CRITICAL ERROR:", err);
    return { success: false, error: String(err) };
  }
}
