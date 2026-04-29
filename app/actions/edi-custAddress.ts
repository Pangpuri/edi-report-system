"use server";

import { db } from "@/db";
import { custAddress } from "@/db/schema";
import { desc } from "drizzle-orm";
import { unstable_noStore as noStore } from 'next/cache';
import { checkSession } from "@/lib/auth-utils";

/**
 * ดึงข้อมูลที่อยู่ของลูกค้าทั้งหมด (Address Master Data)
 * คืนค่าสูงสุด 100 รายการล่าสุด
 * 
 * @returns {Promise<{success: boolean, data: any[], error?: string}>} ข้อมูลที่อยู่พร้อมสถานะการดึงข้อมูล
 */
export async function getCustomerAddresses(): Promise<{ success: boolean; data: any[]; error?: string }> {
  noStore();
  try {
    // ผู้ใช้ต้องเข้าสู่ระบบก่อนดึงข้อมูล
    await checkSession();
    
    const rawData = await db.select({
      customer_no: custAddress.customer_no,
      ean_location_code: custAddress.ean_location_code, 
      company_name: custAddress.company_name,
      local_name: custAddress.local_name,
      address1: custAddress.address1,
      address2: custAddress.address2,
      // ดึงข้อมูลเมืองและรหัสไปรษณีย์
      city: custAddress.city,
      zip_code: custAddress.zip_code,
      telephone: custAddress.telephone,
      fax_no: custAddress.fax_no,
      branch_code: custAddress.branch_code,
      branch_short_name: custAddress.branch_short_name, 
      tax_id: custAddress.tax_id,
      ship_to_code: custAddress.ship_to_code,          
      usage_code: custAddress.usage_code,              
      product_table: custAddress.product_table,       
      signature: custAddress.signature,
      doc_ref_pttrm: custAddress.doc_ref_pttrm,          
    })
    .from(custAddress)
    .orderBy(desc(custAddress.customer_no)); 

    // แปลงค่าจากฐานข้อมูล ถ้าพบค่า null จะให้กลายเป็น undefined
    // เพื่อให้เข้ากันได้กับ Validation Schema ของ Zod ในฝั่ง Frontend
    const data = rawData.map(item => ({
      ...item,
      ean_location_code: item.ean_location_code ?? undefined,
      company_name: item.company_name ?? undefined,
      local_name: item.local_name ?? undefined,
      address1: item.address1 ?? undefined,
      address2: item.address2 ?? undefined,
      city: item.city ?? undefined,
      zip_code: item.zip_code ?? undefined,
      telephone: item.telephone ?? undefined,
      fax_no: item.fax_no ?? undefined,
      branch_code: item.branch_code ?? undefined,
      branch_short_name: item.branch_short_name ?? undefined,
      tax_id: item.tax_id ?? undefined,
      ship_to_code: item.ship_to_code ?? undefined,
      usage_code: item.usage_code ?? undefined,
      product_table: item.product_table ?? undefined,
      signature: item.signature ?? undefined,
      doc_ref_pttrm: item.doc_ref_pttrm ?? undefined,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[EDI-FETCH-ERROR]:", error);
    return { 
      success: false, 
      data: [], 
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูล" 
    };
  }
}