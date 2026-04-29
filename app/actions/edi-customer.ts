"use server";

import { db } from "@/db";
import { customer } from "@/db/schema";
import { asc } from "drizzle-orm";
import { unstable_noStore as noStore } from 'next/cache';
import { checkSession } from "@/lib/auth-utils";

/**
 * ดึงข้อมูล Master Data ของลูกค้าระบบ EDI
 * บังคับเป็น Dynamic Request เสมอ (noStore) เพื่อให้ดึงข้อมูลล่าสุด
 * 
 * @returns {Promise<{success: boolean, data: any[], error?: string}>} ออบเจ็กต์ระบุสถานะสำเร็จพร้อมข้อมูลลูกค้า หรือ ข้อความผิดพลาด
 */
export async function getCustomerMaster() {
  noStore();
  try {
    // ต้องเข้าสู่ระบบก่อนจึงจะดึงข้อมูลได้
    await checkSession();
    
    const rawData = await db.select({
      customer_code: customer.customer_code,
      ean_location_code: customer.ean_location_code,
      company_name: customer.company_name,
      short_name: customer.short_name,
    })
      .from(customer)
      // จัดเรียงตาม ean_location_code จากน้อยไปมาก เนื่องจากมักจะใช้เป็นตัวชี้วัดลำดับ
      .orderBy(asc(customer.ean_location_code));

    // แปลงข้อมูลที่ Query ได้โดยเปลี่ยนค่า null ให้เป็น String ว่าง ("", Empty String)
    // ตรงตามเงื่อนไขของไฟล์ EDI ที่มักแทนค่าว่างด้วยอักขระ Space ในภายหลัง
    const data = rawData.map(item => ({
      ...item,
      ean_location_code: item.ean_location_code ?? "",
      company_name: item.company_name ?? "",
      short_name: item.short_name ?? "",
    }));

    return { success: true, data };
  } catch (error) {
    console.error("❌ Fetch Customer Error:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลลูกค้าได้"
    };
  }
}