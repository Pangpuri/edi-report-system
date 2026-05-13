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
      .orderBy(asc(customer.company_name));

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
 * สร้างหรืออัปเดตข้อมูลลูกค้า (Upsert)
 */
export async function createCustomerAction(data: z.infer<typeof customerSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = customerSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลลูกค้าไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.insert(customer).values({
      customer_code: values.customer_code,      // รหัสลูกค้า -> customer_code
      ean_location_code: values.ean_location_code, // บาร์โค้ดลูกค้า -> ean_location_code
      company_name: values.company_name,           // ชื่อบริษัท -> company_name
      short_name: values.short_name,               // ชื่อย่อลูกค้า -> short_name
    })
    .onConflictDoUpdate({
      target: customer.customer_code,
      set: {
        ean_location_code: values.ean_location_code,
        company_name: values.company_name,
        short_name: values.short_name,
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Customer Upsert Error:", error);
    return { success: false, error: "บันทึกข้อมูลลูกค้าไม่สำเร็จ" };
  }
}

/**
 * อัปเดตข้อมูลลูกค้า
 */
export async function updateCustomerAction(id: string, data: z.infer<typeof customerSchema>): Promise<ActionResponse> {
  // ใช้ createCustomerAction แทนได้เลยเพราะเป็น Upsert
  return createCustomerAction(data);
}
