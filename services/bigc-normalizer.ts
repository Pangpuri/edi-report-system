import { db } from "@/db";
import { EDH_tmp, EDL_tmp, customer, prodcode, ediRawStaging } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import iconv from "iconv-lite";

/**
 * 🧠 BigCNormalizer: ระบบประมวลผลระดับ Binary (Surgical Precision Mode V6 - Final Strike)
 * แก้ปัญหาจำนวนและรหัสผู้ผลิตเยื้อง โดยปรับพิกัดสัมพัทธ์และตัวหารให้ถูกต้อง
 */
export class BigCNormalizer {
  
  private static sliceBuffer(buffer: Buffer, start: number, end: number, isThai: boolean = false): string {
    if (!buffer || buffer.length < start) return "";
    const slice = buffer.slice(start, end);
    if (isThai) return iconv.decode(slice, "cp874").trim();
    return slice.toString("ascii").trim();
  }

  private static toDecimal(raw: string, divisor: number = 100): string {
    const cleaned = raw.replace(/[^0-9]/g, "");
    if (!cleaned) return "0.00";
    return (parseFloat(cleaned) / divisor).toFixed(2);
  }

  static async processBuffer(buffer: Buffer, fileName: string, detectedVendor?: string) {
    console.log(`\n🚀 [BigC Final Strike Pipeline] เริ่มประมวลผล: ${fileName}`);

    const lineStrings = buffer.toString("binary").split(/\r?\n|\r|\n/);
    const lineBuffers = lineStrings.map(s => Buffer.from(s, "binary"));

    let currentPO = "";
    let masterCustomer: any = null;
    let headerCount = 0;
    let detailCount = 0;

    for (const lineBuffer of lineBuffers) {
      if (lineBuffer.length < 10) continue;
      const typeChar = String.fromCharCode(lineBuffer[0]);

      try {
        if (typeChar === "H") {
          currentPO = this.sliceBuffer(lineBuffer, 1, 11);
          const datePo = this.sliceBuffer(lineBuffer, 22, 30);
          const dateShip = this.sliceBuffer(lineBuffer, 30, 38);
          
          const lineStr = lineBuffer.toString("binary");
          const locMatch = lineStr.match(/885\d{10}/);
          let rawAmount = "0";
          if (locMatch && locMatch.index !== undefined) {
             const startAmt = locMatch.index - 10;
             if (startAmt >= 0) {
               rawAmount = lineStr.substring(startAmt, locMatch.index);
             }
          }
          
          const vendorCode = detectedVendor || "983181";
          const cust = await db.query.customer.findFirst({
            where: eq(sql`TRIM(${customer.customer_code})`, vendorCode.trim()),
          });
          masterCustomer = cust;

          await db.insert(EDH_tmp).values({
            hType: "H",
            customerPo: currentPO,
            customerNum: cust?.short_name || vendorCode,
            buyerName: cust?.customer_code || vendorCode,
            customerName: cust?.company_name || "",
            datePo,
            dateShip,
            totalAmount: this.toDecimal(rawAmount),
            fileName,
          });
          headerCount++;
        } 
        else if (typeChar === "D") {
          const lineStr = lineBuffer.toString("binary");
          const barcodeMatch = lineStr.match(/885\d{10}/);
          
          if (barcodeMatch && barcodeMatch.index !== undefined) {
            const bIdx = barcodeMatch.index;
            const barcode = barcodeMatch[0];

            // 📏 พิกัดสัมพัทธ์ (Relative Offsets) V6 - ปรับตามผลวิเคราะห์ล่าสุด
            const vendorProdCode = this.sliceBuffer(lineBuffer, bIdx + 14, bIdx + 23); // CN Code (9 ไบต์) -> CN0097877
            const priceRaw       = this.sliceBuffer(lineBuffer, bIdx + 16, bIdx + 22); // ราคาต่อหน่วย (6 ไบต์) -> 009787
            const qtyRaw         = this.sliceBuffer(lineBuffer, bIdx + 23, bIdx + 32); // จำนวน (9 ไบต์) -> 000001900
            const totalRaw       = this.sliceBuffer(lineBuffer, bIdx + 32, bIdx + 48); // ยอดรวมบรรทัด (16 ไบต์)
            
            const seqNum = this.sliceBuffer(lineBuffer, 22, 25);
            const rawName = this.sliceBuffer(lineBuffer, 40, bIdx, true); 

            const tailStart = bIdx + 64;
            const freeQtyRaw = this.sliceBuffer(lineBuffer, tailStart, tailStart + 7);
            const discPctRaw = this.sliceBuffer(lineBuffer, tailStart + 7, tailStart + 12);
            const discAmtRaw = this.sliceBuffer(lineBuffer, tailStart + 12, tailStart + 23);

            const product = await db.query.prodcode.findFirst({
              where: eq(sql`TRIM(${prodcode.ean_product_code})`, barcode),
            });

            console.log(`🎯 [V6-Match] Barcode:${barcode} | QtyRaw:${qtyRaw} | CN:${vendorProdCode}`);

            await db.insert(EDL_tmp).values({
              dType: "D",
              customerPo: currentPO,
              customerNum: masterCustomer?.customer_code || "983181",
              seqNum,
              productName: product?.product_description || rawName,
              packSize: "CN",
              eanNum: product?.ean_product_code || barcode,
              buyerProdCode: masterCustomer?.customer_code || "983181",
              vendorProdCode: vendorProdCode,
              qtyOrder: this.toDecimal(qtyRaw, 10),         // 🎯 Qty หาร 10 เพื่อให้ได้ 190.00
              priceUnit: this.toDecimal(priceRaw, 100),     
              freeQty: this.toDecimal(freeQtyRaw, 100),
              discount1: this.toDecimal(discPctRaw, 100),   
              discount2: this.toDecimal(discAmtRaw, 100),   
              totalAmount: this.toDecimal(totalRaw, 100),  
              fileName,
              checkNameOldProd: rawName, 
            });
            detailCount++;
          }
        }
      } catch (err) {
        console.error(`❌ ผิดพลาดในการประมวลผล:`, err);
      }
    }

    revalidatePath("/");
    return { success: true, headerCount, detailCount };
  }

  static async processFromStaging(fileName: string, detectedVendor?: string) {
    return { success: false, message: "Use processBuffer" };
  }
}
