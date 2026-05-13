"use server";

import { db } from "@/db";
import { customer, custAddress } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { addressSchema } from "@/lib/validations/edi";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { checkSession } from "@/lib/auth-utils";

interface ActionResponse {
  success: boolean;
  error?: string;
}

export interface CustomerAddressData {
  customer_no: string | null;
  ean_location_code: string | null;
  company_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip_code: string | null;
  telephone: string | null;
  fax_no: string | null;
  master_company_name: string | null;
  master_short_name: string | null;
}

/**
 * ดึงข้อมูลที่อยู่ของลูกค้าทั้งหมด (Address Master Data) พร้อม Join ข้อมูลลูกค้า
 */
export async function getCustomerAddresses(): Promise<{ 
  success: boolean; 
  data: CustomerAddressData[]; 
  error?: string 
}> {
  noStore();
  try {
    await checkSession();
    
    const rawData = await db.select({
      customer_no: custAddress.customer_no,
      ean_location_code: custAddress.ean_location_code, 
      company_name: custAddress.company_name,
      address1: custAddress.address1,
      address2: custAddress.address2,
      city: custAddress.city,
      zip_code: custAddress.zip_code,
      telephone: custAddress.telephone,
      fax_no: custAddress.fax_no,
      // ดึงจากตาราง customer มาด้วย
      master_company_name: customer.company_name,
      master_short_name: customer.short_name,
    })
    .from(custAddress)
    .leftJoin(customer, eq(custAddress.ean_location_code, customer.ean_location_code))
    .orderBy(asc(custAddress.company_name)); 

    return { success: true, data: rawData };
  } catch (error) {
    console.error("[EDI-FETCH-ERROR]:", error);
    return { 
      success: false, 
      data: [], 
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูล" 
    };
  }
}

/**
 * สร้างข้อมูลที่อยู่ใหม่
 */
export async function createAddressAction(data: z.infer<typeof addressSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = addressSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลที่อยู่ไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.insert(custAddress).values({
      ...values,
      customer_no: values.customer_no ?? "", 
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Address Insert Error:", error);
    const msg = error instanceof Error ? error.message : "";
    return { 
      success: false, 
      error: msg.includes("unique constraint") ? "รหัสลูกค้านี้มีที่อยู่อยู่แล้ว" : "บันทึกที่อยู่ไม่สำเร็จ" 
    };
  }
}

/**
 * อัปเดตข้อมูลที่อยู่
 */
export async function updateAddressAction(id: string, data: z.infer<typeof addressSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = addressSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลไม่ถูกต้อง" };

    await db.update(custAddress)
      .set({ ...validatedFields.data })
      .where(eq(custAddress.customer_no, id));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Address Update Error:", error);
    return { success: false, error: "อัปเดตที่อยู่ไม่สำเร็จ" };
  }
}
