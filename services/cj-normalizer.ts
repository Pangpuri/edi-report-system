import { db } from "@/db";
import { EDH_tmp, EDL_tmp, customer, prodcode, ediRawStaging } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * 🧡 CJNormalizer: ระบบประมวลผลสำหรับห้าง CJ (231086)
 * [Update]: ใช้พิกัดแม่นยำสูง และลอจิกการคำนวณทศนิยมตามบรีฟมากิ (Zero-Tolerance)
 */
export class CJNormalizer {
  
  /**
   * 🛡️ ฟังก์ชัน safeExtract: หั่นข้อมูลและ Trim ช่องว่าง
   */
  private static safeExtract(line: string, start: number, end: number): string {
    if (!line || line.length < start) return "";
    return line.substring(start, end).trim();
  }

  /**
   * 💰 ฟังก์ชันจัดการตัวเลขและทศนิยม (หาร 100)
   */
  private static parseAmount(raw: string, dotPos: number = 2): string {
    const cleaned = raw.replace(/[^0-9]/g, "");
    if (!cleaned) return "0.00";
    const divisor = Math.pow(10, dotPos);
    return (parseFloat(cleaned) / divisor).toFixed(2);
  }

  /**
   * 🚀 ประมวลผลจากตาราง edi_raw_staging
   */
  static async processFromStaging(fileName: string) {
    console.log(`\n🧹 [CJ Strict Normalizer] เริ่มประมวลผล: ${fileName}`);

    const rawLines = await db.query.ediRawStaging.findMany({
      where: and(
        eq(ediRawStaging.fileName, fileName),
        eq(ediRawStaging.status, "PENDING")
      ),
      orderBy: (t, { asc }) => [asc(t.lineNumber)],
    });

    if (rawLines.length === 0) return { success: true, count: 0 };

    let currentPO = "";
    let masterCustomer: any = null;
    let headerCount = 0;
    let detailCount = 0;

    for (const raw of rawLines) {
      const line = raw.lineContent;
      const type = raw.lineType;

      try {
        if (type === "H") {
          // 📍 พิกัด Header (0-based) อ้างอิง OR992191.TXT
          currentPO = this.safeExtract(line, 1, 15);
          const datePo = this.safeExtract(line, 22, 30);
          const dateShip = this.safeExtract(line, 30, 38);
          const vendorCode = "231086"; 

          // ยอดรวมทั้งใบ: ปรับตัวหารเป็น 1000 เพื่อให้ยอดเงินออกมาถูกต้อง (เช่น 3442.10)
          const rawAmount = this.safeExtract(line, 97, 109);

          const cust = await db.query.customer.findFirst({
            where: eq(sql`TRIM(${customer.customer_code})`, vendorCode),
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
            totalAmount: (parseFloat(rawAmount.replace(/[^0-9]/g, "")) / 1000).toFixed(2),
            fileName: fileName,
            rawLineId: raw.id, 
          });
          headerCount++;
        } 
        else if (type === "D") {
          // 📍 พิกัด Detail (0-based) - พิสูจน์แล้วจาก OR992191.TXT
          const seqNum = this.safeExtract(line, 22, 27);
          const rawName = this.safeExtract(line, 40, 80);
          const barcode = this.safeExtract(line, 85, 98);
          const packSize = this.safeExtract(line, 99, 101);

          // 🛡️ ใช้ Regex Match ลอจิก CN โดยจำกัดความยาวเพื่อไม่ให้ยาวเกินฟิลด์ DB (Varchar 30)
          const cnMatch = line.match(/CN\d{1,10}/);
          const vendorProdCode = cnMatch ? cnMatch[0] : "";

          // 💰 ปรับลอจิกตัวเลขตามบรีฟ "จิ๊กซอว์สลับชิ้น" ของมากิ
          // Quantity: 0003360 -> / 1000 = 3.36
          const qtyRaw = this.safeExtract(line, 110, 117);
          // Price (Gross): 009244700 -> / 100000 = 92.4470
          const priceRaw = this.safeExtract(line, 101, 110);
          // Free Qty
          const freeRaw = this.safeExtract(line, 117, 124);
          // Total Amount (Net): หาร 10000 ตามบรีฟล่าสุด
          const amountRaw = this.safeExtract(line, 124, 133);

          const product = await db.query.prodcode.findFirst({
            where: eq(sql`TRIM(${prodcode.ean_product_code})`, barcode),
          });

          await db.insert(EDL_tmp).values({
            dType: "D",
            customerPo: currentPO,
            customerNum: masterCustomer?.customer_code || "231086",
            seqNum: seqNum.trim(), 
            productName: product?.product_description || rawName,
            packSize: packSize || "CN",
            eanNum: product?.ean_product_code || barcode,
            buyerProdCode: masterCustomer?.customer_code || "231086",
            vendorProdCode: vendorProdCode, 
            qtyOrder: (parseFloat(qtyRaw.replace(/[^0-9]/g, "")) / 1000).toFixed(2), 
            priceUnit: (parseFloat(priceRaw.replace(/[^0-9]/g, "")) / 100000).toFixed(4), 
            freeQty: this.parseAmount(freeRaw, 2),
            totalAmount: (parseFloat(amountRaw.replace(/[^0-9]/g, "")) / 10000).toFixed(2),
            fileName: fileName,
            checkNameOldProd: rawName, 
            rawLineId: raw.id, 
          });
          detailCount++;
        }

        await db.update(ediRawStaging)
          .set({ status: "PROCESSED" })
          .where(eq(ediRawStaging.id, raw.id));

      } catch (err) {
        console.error(`❌ ผิดพลาดที่บรรทัด ${raw.lineNumber} [CJ]:`, err);
        await db.update(ediRawStaging)
          .set({ status: "ERROR" })
          .where(eq(ediRawStaging.id, raw.id));
      }
    }

    revalidatePath("/");
    return { success: true, headerCount, detailCount };
  }
}
