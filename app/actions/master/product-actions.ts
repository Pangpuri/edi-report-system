"use server";

import { db } from "@/db";
import { prodcode } from "@/db/schema";
import { eq } from "drizzle-orm";
import { prodcodeSchema } from "@/lib/validations/edi";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { checkSession } from "@/lib/auth-utils";

interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * ดึงข้อมูล Master Data ของสินค้าระบบ EDI
 */
export async function getProductMaster() {
  noStore();
  try {
    await checkSession();
    const rawData = await db.select().from(prodcode);
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
 * สร้างข้อมูลสินค้าใหม่
 */
export async function createProductAction(data: z.infer<typeof prodcodeSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = prodcodeSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลสินค้าไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.insert(prodcode).values({
      id: values.internal_product_code ?? values.ean_product_code, 
      ean_product_code: values.ean_product_code,
      product_description: values.product_description,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Product Insert Error:", error);
    const msg = error instanceof Error ? error.message : "";
    return { 
      success: false, 
      error: msg.includes("unique constraint") ? "รหัสบาร์โค้ดนี้มีอยู่ในระบบแล้ว" : "บันทึกสินค้าไม่สำเร็จ" 
    };
  }
}

/**
 * อัปเดตข้อมูลสินค้า
 */
export async function updateProductAction(id: string, data: z.infer<typeof prodcodeSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = prodcodeSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.update(prodcode)
      .set({ 
        ean_product_code: values.ean_product_code,
        product_description: values.product_description,
        id: values.internal_product_code ?? values.ean_product_code,
      })
      .where(eq(prodcode.ean_product_code, id));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Product Update Error:", error);
    return { success: false, error: "อัปเดตข้อมูลสินค้าไม่สำเร็จ" };
  }
}
