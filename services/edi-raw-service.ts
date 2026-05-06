// services/edi-raw-service.ts
import { db } from "@/db";
import { ediRawStaging } from "@/db/schema";

interface RawLineInput {
  fileName: string;
  lines: string[];
  vendorCode?: string;
}

/// ฟังก์ชันสำหรับบันทึกข้อมูลดิบจากไฟล์ EDI ลงในตาราง staging
export async function insertRawLines({ fileName, lines, vendorCode }: RawLineInput) {
  if (!lines || lines.length === 0) return { success: false, count: 0 };

  console.log(`📦 [Raw Staging] กำลังเตรียมบันทึกข้อมูลดิบ: ${fileName} (${lines.length} บรรทัด)`);

  const dataToInsert = lines.map((content, index) => {
    // ระบุประเภทบรรทัดจากตัวอักษรตัวแรก
    const firstChar = (content[0] || "").toUpperCase();
    let lineType = "UNKNOWN";
    
    if (firstChar === "H") lineType = "H";
    else if (firstChar === "D") lineType = "D";
    else if (firstChar === "L") lineType = "L";

    return {
      fileName,
      lineContent: content, 
      lineType,
      lineNumber: index + 1, 
      vendorCode: vendorCode || null,
      status: "PENDING",
    };
  });

  try {
    
    const chunkSize = 200;
    for (let i = 0; i < dataToInsert.length; i += chunkSize) {
      const chunk = dataToInsert.slice(i, i + chunkSize);
      await db.insert(ediRawStaging).values(chunk);
    }

    console.log(`✅ [Raw Staging] บันทึกข้อมูลดิบสำเร็จ: ${dataToInsert.length} รายการ`);
    return { success: true, count: dataToInsert.length };
  } catch (error) {
    console.error("🚨 [Raw Staging] เกิดข้อผิดพลาดในการ Bulk Insert:", error);
    throw error;
  }
}
