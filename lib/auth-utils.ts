import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * ตรวจสอบ Session การเข้าสู่ระบบในฝั่ง Server
 * มักใช้เรียกใน Server Actions เพื่อป้องกันไม่ให้ผู้ที่ยังไม่ได้ Login ดำเนินการ
 * 
 * @throws {Error} หากไม่มี Session หรือยังไม่ได้เข้าสู่ระบบ
 * @returns {Promise<any>} ข้อมูล Session ของผู้ใช้ปัจจุบัน
 */
export async function checkSession() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  
  if (!session) {
    throw new Error("Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ");
  }
  
  return session;
}
