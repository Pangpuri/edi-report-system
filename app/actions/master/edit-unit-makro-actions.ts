"use server";

import { db } from "@/db";
import { Edit_Unit_Makro, prodcode } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { checkSession } from "@/lib/auth-utils";

interface ActionResponse {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * ดึงรายการสินค้าทั้งหมดจาก prodcode
 */
export async function getAllProductsAction() {
  noStore();
  try {
    await checkSession();
    const products = await db.select().from(prodcode);
    return { success: true, data: products };
  } catch (error) {
    console.error("❌ Get Products Error:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Internal Server Error",
    };
  }
}

/**
 * ดึงรายการ Edit_Unit_Makro ที่ยังเป็น active
 */
export async function getEditUnitMakroListAction() {
  noStore();
  try {
    await checkSession();
    const records = await db
      .select()
      .from(Edit_Unit_Makro)
      .where(eq(Edit_Unit_Makro.status, "active"));
    return { success: true, data: records };
  } catch (error) {
    console.error("❌ Get Edit Unit Makro List Error:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Internal Server Error",
    };
  }
}

/**
 * บันทึกข้อมูล Edit_Unit_Makro
 */
export async function createEditUnitMakroAction(payload: {
  product_id: string;
  product_name: string;
  unit_product: number;
  unit_cn: string;
  discount_1?: number | null;
  discount_2?: number | null;
  discount_3?: number | null;
  discount_amount?: number | null;
}): Promise<ActionResponse> {
  try {
    await checkSession();

    // ตรวจสอบว่ามีรายการนี้อยู่แล้วหรือไม่
    const existing = await db
      .select()
      .from(Edit_Unit_Makro)
      .where(
        and(
          eq(Edit_Unit_Makro.product_id, payload.product_id),
          eq(Edit_Unit_Makro.status, "active")
        )
      );

    if (existing.length > 0) {
      // อัปเดตรายการที่มีอยู่
      await db
        .update(Edit_Unit_Makro)
        .set({
          product_name: payload.product_name,
          unit_product: payload.unit_product.toFixed(2),
          unit_cn: payload.unit_cn,
          discount_1: payload.discount_1?.toString() || null,
          discount_2: payload.discount_2?.toString() || null,
          discount_3: payload.discount_3?.toString() || null,
          discount_amount: payload.discount_amount?.toString() || null,
          updatedAt: new Date(),
        })
        .where(eq(Edit_Unit_Makro.id, existing[0].id));
    } else {
      // บันทึกรายการใหม่
      await db.insert(Edit_Unit_Makro).values({
        product_id: payload.product_id,
        product_name: payload.product_name,
        unit_product: payload.unit_product.toFixed(2),
        unit_cn: payload.unit_cn,
        discount_1: payload.discount_1 ? payload.discount_1.toString() : null,
        discount_2: payload.discount_2 ? payload.discount_2.toString() : null,
        discount_3: payload.discount_3 ? payload.discount_3.toString() : null,
        discount_amount: payload.discount_amount ? payload.discount_amount.toString() : null,
        status: "active",
      } as any);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Create/Update Edit Unit Makro Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ",
    };
  }
}

/**
 * ลบรายการ Edit_Unit_Makro (soft delete)
 */
export async function deleteEditUnitMakroAction(id: number): Promise<ActionResponse> {
  try {
    await checkSession();

    await db
      .update(Edit_Unit_Makro)
      .set({
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(Edit_Unit_Makro.id, id));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Delete Edit Unit Makro Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ลบข้อมูลไม่สำเร็จ",
    };
  }
}

/**
 * ดึงรายการ Edit_Unit_Makro ตามรหัสสินค้า
 */
export async function getEditUnitMakroByProductAction(productId: string) {
  noStore();
  try {
    await checkSession();
    const record = await db
      .select()
      .from(Edit_Unit_Makro)
      .where(
        and(
          eq(Edit_Unit_Makro.product_id, productId),
          eq(Edit_Unit_Makro.status, "active")
        )
      );
    return { success: true, data: record[0] || null };
  } catch (error) {
    console.error("❌ Get Edit Unit Makro By Product Error:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Internal Server Error",
    };
  }
}
