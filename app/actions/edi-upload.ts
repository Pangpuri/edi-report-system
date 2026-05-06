"use server";

import { revalidatePath } from "next/cache";
import { parseEDIFileDelphi } from "@/services/edi-parser";

export type UploadState = {
  success: boolean;
  message: string;
};

/**
 * Server Action สำหรับรับไฟล์ EDI จาก Form
 */
export async function uploadEdiAction(
  prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  // 1. ดึงไฟล์จาก FormData
  const file = formData.get("ediFile") as File;

  // ตรวจสอบเบื้องต้น
  if (!file || file.size === 0) {
    return { success: false, message: "กรุณาเลือกไฟล์ .TXT" };
  }

  // ตรวจสอบนามสกุลไฟล์
  if (!file.name.toLowerCase().endsWith(".txt")) {
    return { success: false, message: "ระบบรองรับเฉพาะไฟล์ .TXT" };
  }

  try {
    // 2. แปลงไฟล์เป็น ArrayBuffer และ Buffer
    // การใช้ Buffer จะช่วยให้เราจัดการ Byte ของภาษาไทย (win874) ได้แม่นยำขึ้น
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. ส่งไปให้ Parser ประมวลผล (ส่งชื่อไฟล์ไปด้วยเพื่อเก็บเป็นประวัติ)
    await parseEDIFileDelphi(buffer, file.name);

    // 4. ล้าง Cache หน้าประวัติเพื่อให้ข้อมูลใหม่โชว์ทันที
    revalidatePath("/history");

    return { 
      success: true, 
      message: `นำเข้าไฟล์ ${file.name} เรียบร้อยแล้ว` 
    };
  } catch (error) {
    console.error("Upload Error:", error);
    return { 
      success: false, 
      message: "เกิดข้อผิดพลาดระหว่างนำเข้าข้อมูล ลองเช็คตำแหน่ง Byte อีกทีครั้ง" 
    };
  }
}