"use server";

import { db } from "@/db";
import { customer } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { customerSchema } from "@/lib/validations/edi";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { checkSession } from "@/lib/auth-utils";

interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * ดึงข้อมูล Master Data ของลูกค้าระบบ EDI
 */
export async function getCustomerMaster() {
  noStore();
  try {
    await checkSession();
    const rawData = await db.select({
      customer_code: customer.customer_code,
      ean_location_code: customer.ean_location_code,
      company_name: customer.company_name,
      short_name: customer.short_name,
    })
      .from(customer)
      .orderBy(asc(customer.ean_location_code));

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

/**
 * สร้างข้อมูลลูกค้าใหม่
 */
export async function createCustomerAction(data: z.infer<typeof customerSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = customerSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลลูกค้าไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.insert(customer).values({
      ...values,
      customer_code: values.customer_code ?? "", 
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Customer Insert Error:", error);
    const msg = error instanceof Error ? error.message : "";
    return { 
      success: false, 
      error: msg.includes("unique constraint") ? "รหัสลูกค้านี้มีอยู่ในระบบแล้ว" : "บันทึกข้อมูลลูกค้าไม่สำเร็จ" 
    };
  }
}

/**
 * อัปเดตข้อมูลลูกค้า
 */
export async function updateCustomerAction(id: string, data: z.infer<typeof customerSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = customerSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลไม่ถูกต้อง" };

    await db.update(customer)
      .set({ ...validatedFields.data })
      .where(eq(customer.customer_code, id));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Customer Update Error:", error);
    return { success: false, error: "อัปเดตข้อมูลลูกค้าไม่สำเร็จ" };
  }
}
