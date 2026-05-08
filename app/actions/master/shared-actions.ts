"use server";

import { db } from "@/db"; 
import { custAddress, customer, prodcode } from "@/db/schema"; 
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkSession } from "@/lib/auth-utils";

interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * ลบข้อมูล Master Data ตามประเภทที่ระบุ
 */
export async function deleteMasterDataAction(
  id: string, 
  type: "customer" | "product" | "address"
): Promise<ActionResponse> {
  try {
    const session = await checkSession();
    const user = session.user as { role?: string };
    
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
    return { 
      success: false, 
      error: msg.includes("foreign key") 
        ? "ลบไม่ได้: ข้อมูลนี้ถูกใช้งานในส่วนอื่นอยู่!" 
        : "ไม่สามารถลบข้อมูลได้" 
    };
  }
}
