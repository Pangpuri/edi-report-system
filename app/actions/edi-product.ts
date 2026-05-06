"use server";

import { db } from "@/db";
import { prodcode } from "@/db/schema";
import { desc } from "drizzle-orm";
import { unstable_noStore as noStore } from 'next/cache';
import { checkSession } from "@/lib/auth-utils";

/**
 * ดึงข้อมูล Master Data ของสินค้าระบบ EDI
 * บังคับเป็น Dynamic Request เสมอ (noStore) เพื่อไม่ให้แสดงข้อมูลที่ถูก Cache ไว้
 * 
 * @returns {Promise<{success: boolean, data: any[], error?: string}>} ออบเจ็กต์ระบุสถานะสำเร็จพร้อมข้อมูลสินค้า หรือ ข้อความผิดพลาด
 */
export async function getProductMaster() {
  noStore();
  try {
    await checkSession();
    
    // 1. ดึงข้อมูลมาตรงๆ
    const rawData = await db.select().from(prodcode);

    // 2. เช็คก่อนว่ามีข้อมูลไหม ถ้าไม่มีให้ส่ง Array ว่าง (ป้องกัน undefined)
    if (!rawData) {
      return { success: true, data: [] };
    }

    // 3. ปรับโครงสร้างข้อมูลให้ชัวร์ว่าไม่มีค่า null หลุดไปหา Frontend
    const data = rawData.map(item => ({
      ean_product_code: item.ean_product_code ?? "",
      product_description: item.product_description ?? "",
      // สำคัญมาก: เปลี่ยนชื่อจาก id เป็น internal_product_code 
      // เพื่อให้ตรงกับที่ Frontend (useMasterData) รอรับอยู่ค่ะ
      internal_product_code: item.id ?? "", 
    }));

    return { success: true, data: data };
  } catch (error) {
    console.error("❌ Fetch Product Error:", error);
    // ต้องส่ง Object ที่มีโครงสร้างชัดเจนกลับไปเสมอ
    return { 
      success: false, 
      data: [], 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    };
  }
}