"use server";

import { db } from "@/db"; 
import { custAddress, customer, prodcode } from "@/db/schema"; 
import { eq } from "drizzle-orm";
import { addressSchema, customerSchema, prodcodeSchema } from "@/lib/validations/edi";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkSession } from "@/lib/auth-utils";

// --- 🛡️ Types ---
interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * สร้างข้อมูลที่อยู่ (Address Master) รายการใหม่
 * 
 * @param data - ข้อมูลที่พื้นที่และพารามิเตอร์ของสาขา/ที่อยู่
 * @returns {Promise<ActionResponse>} ผลลัพธ์การทำงาน (สำเร็จหรือไม่)
 */
export async function createAddressAction(data: z.infer<typeof addressSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = addressSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลที่อยู่ไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.insert(custAddress).values({
      ...values,
      // บังคับให้เป็น string เพื่อให้สอดคล้องกับชนิดข้อมูลใน Database
      customer_no: values.customer_no ?? "", 
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Address Insert Error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unauthorized")) return { success: false, error: msg };
    return { 
      success: false, 
      error: msg.includes("unique constraint") ? "รหัสลูกค้านี้มีที่อยู่อยู่แล้ว" : "บันทึกที่อยู่ไม่สำเร็จ" 
    };
  }
}

/**
 * อัปเดตข้อมูลที่อยู่ที่มีอยู่แล้วในระบบ
 * 
 * @param id - รหัสลูกค้า (customer_no)
 * @param data - ข้อมูลที่พื้นที่รายละเอียดที่ต้องการแก้ไข
 * @returns {Promise<ActionResponse>} ผลลัพธ์การทำงาน (สำเร็จหรือไม่)
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
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unauthorized")) return { success: false, error: msg };
    return { success: false, error: "อัปเดตที่อยู่ไม่สำเร็จ" };
  }
}

/**
 * สร้างข้อมูลลูกค้า (Customer Master) รายการใหม่
 * 
 * @param data - ข้อมูลลูกค้าที่ถูกต้องตาม Schema
 * @returns {Promise<ActionResponse>} ผลลัพธ์การทำงาน (สำเร็จหรือไม่)
 */
export async function createCustomerAction(data: z.infer<typeof customerSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = customerSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลลูกค้าไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.insert(customer).values({
      ...values,
      // บังคับให้เป็น string เพื่อให้ตรงกับ Primary Key ใน Schema
      customer_code: values.customer_code ?? "", 
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Customer Insert Error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unauthorized")) return { success: false, error: msg };
    return { 
      success: false, 
      error: msg.includes("unique constraint") ? "รหัสลูกค้านี้มีอยู่ในระบบแล้ว" : "บันทึกข้อมูลลูกค้าไม่สำเร็จ" 
    };
  }
}

/**
 * อัปเดตข้อมูลลูกค้าในระบบ
 * 
 * @param id - รหัสลูกค้า (customer_code)
 * @param data - ข้อมูลลูกค้าที่ต้องการแก้ไข
 * @returns {Promise<ActionResponse>} ผลลัพธ์การแก้ไขข้อมูล
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
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unauthorized")) return { success: false, error: msg };
    return { success: false, error: "อัปเดตข้อมูลลูกค้าไม่สำเร็จ" };
  }
}

/**
 * สร้างข้อมูลสินค้า (Product Master) รายการใหม่
 * 
 * @param data - ข้อมูลสินค้าที่จะลงทะเบียน
 * @returns {Promise<ActionResponse>} ผลลัพธ์การเพิ่มข้อมูล
 */
export async function createProductAction(data: z.infer<typeof prodcodeSchema>): Promise<ActionResponse> {
  try {
    await checkSession();
    const validatedFields = prodcodeSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "ข้อมูลสินค้าไม่ถูกต้อง" };

    const values = validatedFields.data;
    await db.insert(prodcode).values({
      id: values.internal_product_code ?? values.ean_product_code, // ใช้ internal_product_code เป็น id
      ean_product_code: values.ean_product_code,
      product_description: values.product_description,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Product Insert Error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unauthorized")) return { success: false, error: msg };
    return { 
      success: false, 
      error: msg.includes("unique constraint") ? "รหัสบาร์โค้ดนี้มีอยู่ในระบบแล้ว" : "บันทึกสินค้าไม่สำเร็จ" 
    };
  }
}

/**
 * อัปเดตข้อมูลสินค้าที่มีอยู่แล้ว
 * 
 * @param id - รหัสบาร์โค้ดสินค้า (ean_product_code)
 * @param data - ข้อมูลสินค้าที่ต้องการแก้ไข
 * @returns {Promise<ActionResponse>} ผลลัพธ์การแก้ไขข้อมูล
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
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unauthorized")) return { success: false, error: msg };
    return { success: false, error: "อัปเดตข้อมูลสินค้าไม่สำเร็จ" };
  }
}

/**
 * ลบข้อมูล Master Data ตามประเภทที่ระบุ
 * เข้าถึงได้เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น
 * 
 * @param id - Primary Key ของข้อมูลที่ต้องการลบ
 * @param type - ประเภทข้อมูลที่ต้องการลบ (customer, product, address)
 * @returns {Promise<ActionResponse>} ผลการลบข้อมูล
 */
export async function deleteMasterDataAction(
  id: string, 
  type: "customer" | "product" | "address"
): Promise<ActionResponse> {
  try {
    const session = await checkSession();
    const user = session.user as { role?: string };
    
    // ตรวจสอบสิทธิ์ว่าต้องเป็น Admin เท่านั้นสำหรับการทำลายข้อมูล
    if (user.role !== "admin") {
      return { 
        success: false, 
        error: "สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบข้อมูลได้" 
      };
    }

    if (type === "customer") {
      await db.delete(customer).where(eq(customer.customer_code, id));
    } 
    else if (type === "product") {
      await db.delete(prodcode).where(eq(prodcode.ean_product_code, id));
    } 
    else if (type === "address") {
      await db.delete(custAddress).where(eq(custAddress.customer_no, id));
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ Deletion Failed:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unauthorized")) return { success: false, error: msg };
    return { 
      success: false, 
      error: msg.includes("foreign key") 
        ? "ลบไม่ได้: ข้อมูลนี้ถูกใช้งานในส่วนอื่นอยู่ฮะ!" 
        : "ไม่สามารถลบข้อมูลได้" 
    };
  }
}