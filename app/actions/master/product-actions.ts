"use server";

import { db } from "@/db";
import { prodcode } from "@/db/schema";
import { eq, like, or, asc } from "drizzle-orm";
import { prodcodeSchema } from "@/lib/validations/edi";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { checkSession } from "@/lib/auth-utils";

interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * ค้นหาสินค้าใกล้เคียงเพื่อช่วยในการ Reconciliation
 */
export async function searchSuggestedProductsAction(query: string) {
  try {
    if (!query || query.length < 2) return [];

    // ค้นหาจากบาร์โค้ด หรือ ชื่อสินค้า (รองรับภาษาไทย)
    const results = await db.select()
      .from(prodcode)
      .where(or(
        like(prodcode.ean_product_code, `%${query}%`),
        like(prodcode.product_description, `%${query}%`)
      ))
      .limit(10);

    return results;
  } catch (error) {
    console.error("Search Suggestion Error:", error);
    return [];
  }
}

/**
 * ดึงข้อมูล Master Data ของสินค้าระบบ EDI
 */
export async function getProductMaster() {
  noStore();
  try {
    await checkSession();
    const rawData = await db.select().from(prodcode).orderBy(asc(prodcode.product_description));
    if (!rawData) return { success: true, data: [] };

    const data = rawData.map(item => ({
      ean_product_code: item.ean_product_code ?? "",
      product_description: item.product_description ?? "",
      internal_product_code: item.id ?? "", 
    }));

    return { success: true, data: data };
  } catch (error) {
    console.error("❌ Fetch Product Error:", error);
    return { 
      success: false, 
      data: [], 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    };
  }
}

/**
 * สร้างหรืออัปเดตข้อมูลสินค้า (Upsert)
 */
export async function createProductAction(data: z.infer<typeof prodcodeSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = prodcodeSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลสินค้าไม่ถูกต้อง" };

    const values = validatedFields.data;
    
    // ใช้รหัสบาร์โค้ด (EAN) เป็นเกณฑ์ในการเช็ค หรือจะใช้ ID ก็ได้ 
    // แต่ตามที่ระบุมา ID คือ Internal Code และ EAN คือ บาร์โค้ด
    // ในที่นี้เราจะทำ Upsert โดยใช้ ID (รหัสภายใน) เป็นหลัก
    
    await db.insert(prodcode).values({
      id: values.internal_product_code || values.ean_product_code, // รหัสสินค้าภายใน -> id
      ean_product_code: values.ean_product_code,                  // EAN Product Code -> ean_product_code
      product_description: values.product_description,            // รายละเอียดสินค้า -> product_description
    })
    .onConflictDoUpdate({
      target: prodcode.id,
      set: {
        ean_product_code: values.ean_product_code,
        product_description: values.product_description,
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Product Upsert Error:", error);
    return { success: false, error: "บันทึกข้อมูลสินค้าไม่สำเร็จ" };
  }
}

/**
 * อัปเดตข้อมูลสินค้า
 */
export async function updateProductAction(id: string, data: z.infer<typeof prodcodeSchema>): Promise<ActionResponse> {
  // ในที่นี้ใช้ createProductAction แทนได้เลยเพราะเป็น Upsert
  return createProductAction(data);
}
