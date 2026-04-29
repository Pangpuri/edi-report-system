// services/edi-preprocessor.ts
import { db } from "@/db";
import { customer } from "@/db/schema";

export interface NormalizedLine {
  content: string;
  type: "H" | "D" | "L" | "UNKNOWN";
  index: number;
}

/**
 * 🧠 ระบบกรองไฟล์อัจฉริยะ (Intelligent EDI Preprocessor)
 * ทำหน้าที่ตรวจหาลูกค้า และจัดระเบียบฟอร์มก่อนการประมวลผลจริง
 */
export class EDIPreProcessor {
  
  /**
   * 1. ตรวจสอบรหัสลูกค้าจากไฟล์ดิบ (Auto-Detection)
   */
  static async detectVendor(text: string): Promise<string> {
    const sample = text.substring(0, 2000); // เพิ่มระยะสแกนเป็น 2000
    const allCustomers = await db.select({ code: customer.customer_code }).from(customer);
    
    // เรียงรหัสลูกค้าตามความยาวจากมากไปน้อย เพื่อป้องกันการ match รหัสสั้นที่ซ้อนอยู่ในรหัสยาว
    const sortedCustomers = allCustomers
      .filter(c => c.code)
      .sort((a, b) => (b.code?.length || 0) - (a.code?.length || 0));

    // ตรวจหา BigC 983181 ก่อนเป็นอันดับแรกเพื่อความแม่นยำ (Priority)
    if (sample.includes("983181")) return "983181";
    
    for (const cust of sortedCustomers) {
      if (cust.code && sample.includes(cust.code.trim())) {
        return cust.code.trim();
      }
    }

    const firstLine = text.split(/\r?\n/)[0];
    const vMatch = firstLine.match(/(\d{6})\s*$/);
    return vMatch ? vMatch[1] : "UNKNOWN";
  }

  /**
   * 2. จัดระเบียบข้อความแบบรักษา "หางว่าว"
   */
  static normalizeText(text: string): string[] {
    // ⚠️ ห้ามใช้ .trim() กับบรรทัดในจังหวะนี้เด็ดขาด! เพื่อรักษาพิกัด Index
    return text.split(/\r?\n/).filter(line => line.length > 0); 
  }

  /**
   * 3. วิเคราะห์โครงสร้างบรรทัดแบบใช้ Index นำทาง
   */
  static analyzeStructure(lines: string[]): NormalizedLine[] {
    return lines.map((line, idx) => {
      // ⚠️ ใช้ charAt(0) แทน trim()[0] เพื่อรักษาตำแหน่งพิกัดของ String ดั้งเดิม
      const firstChar = line.charAt(0).toUpperCase();
      let type: "H" | "D" | "L" | "UNKNOWN" = "UNKNOWN";
      
      if (firstChar === "H") type = "H";
      else if (firstChar === "D") type = "D";
      else if (firstChar === "L") type = "L";
      
      return {
        content: line, // เก็บหางว่าวแบบดั้งเดิมไว้เพื่อนับช่อง
        type,
        index: idx + 1
      };
    });
  }
}
