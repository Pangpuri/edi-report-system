"use server";

import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { db } from "@/db";
import { customer, custAddress, prodcode } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";


// Remove leading and trailing spaces
function clean(str: string): string {
  return str ? str.trim() : "";
}

// Import Customer Master

type NewCustomer = typeof customer.$inferInsert;
export async function importCustomerMaster() {
  try {
    const filePath = path.join(process.cwd(), "data", "CUST.TAB");
    if (!fs.existsSync(filePath)) return { success: false, message: "ไม่พบไฟล์ CUST.TAB" };

    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, "win874");
    const lines = content.split(/\r\n|\n|\r/);

    const dataToInsert: NewCustomer[] = []; 
    
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      const fields = line.split("|").map(f => clean(f));

      if (!fields[3]) continue; 

      dataToInsert.push({
        ean_location_code: fields[1],
        company_name: fields[2],
        customer_code: fields[3], // ตัวนี้ target conflict
        short_name: fields[4],
      });
    }

    if (dataToInsert.length > 0) {
      await db.insert(customer).values(dataToInsert).onConflictDoUpdate({
        target: customer.customer_code,
        set: {
          ean_location_code: sql`excluded.ean_location_code`,
          company_name: sql`excluded.company_name`,
          short_name: sql`excluded.short_name`,
        }
      });
    }

    revalidatePath("/");
    return { success: true, message: `นำเข้าข้อมูลลูกค้าสำเร็จ ${dataToInsert.length} รายการ` };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

// Import Address Master
type NewAddress = typeof custAddress.$inferInsert;
export async function importAddressMaster() {
  try {
    const filePath = path.join(process.cwd(), "data", "Address.tab");
    if (!fs.existsSync(filePath)) return { success: false, message: "ไม่พบไฟล์ Address.tab" };

    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, "win874");
    const lines = content.split(/\r\n|\n|\r/);

    await db.delete(custAddress);
    
    // บันทึก Log การล้างข้อมูล
    console.log("Cleared cust_address table for fresh import");

    const dataToInsert: NewAddress[] = []; 

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.includes("|")) continue;
      
      // แยกด้วย | แล้วดึงค่าดิบออกมาทั้งหมด (รวมถึงช่องว่าง)
      const fields = line.split("|").map(f => f.trim());
      
      // ข้อมูลเริ่มที่ index 1 เพราะบรรทัดมักจะเริ่มด้วย | ตัวแรก
      if (fields.length < 2) continue;

      dataToInsert.push({
        ean_location_code: fields[1] || "", 
        company_name: fields[2] || "",
        address1: fields[3] || "",
        address2: fields[4] || "",
        city: fields[5] || "",
        zip_code: fields[6] || "",
        telephone: fields[7] || "",
        fax_no: fields[8] || "",
        customer_no: fields[9] || "",
        ship_to_code: fields[10] || "",
        usage_code: fields[11] || "",
        product_table: fields[12] || "",
        local_name: fields[13] || "",
        branch_code: fields[14] || "",
        tax_id: fields[15] || "",
        branch_short_name: fields[16] || "",
        signature: fields[17] || "",
        doc_ref_pttrm: fields[18] || "",
      });
    }

    if (dataToInsert.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < dataToInsert.length; i += chunkSize) {
        const chunk = dataToInsert.slice(i, i + chunkSize);
        await db.insert(custAddress).values(chunk);
      }
    }

    revalidatePath("/");
    return { success: true, message: `นำเข้าข้อมูลที่อยู่สำเร็จ ${dataToInsert.length} รายการ (บันทึกข้อมูลครบถ้วนทุกฟิลด์)` };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Import Address Error:", err);
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

// Import Product Master
type NewProduct = typeof prodcode.$inferInsert;
export async function importProductMaster() {
  try {
    const filePath = path.join(process.cwd(), "data", "prodcode.Tab");
    if (!fs.existsSync(filePath)) return { success: false, message: "ไม่พบไฟล์ prodcode.Tab" };

    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, "win874");
    const lines = content.split(/\r\n|\n|\r/);

    const dataToInsert: NewProduct[] = []; 
    
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      const fields = line.split("|").map(f => clean(f));

      const ean = fields[1];
      const desc = fields[2];
      const internal = fields[3];

      if (!internal) continue;

      dataToInsert.push({
        id: internal, 
        ean_product_code: ean,
        product_description: desc,
      });
    }

    if (dataToInsert.length > 0) {
      await db.insert(prodcode).values(dataToInsert).onConflictDoUpdate({
        target: prodcode.id,
        set: {
          ean_product_code: sql`excluded.ean_product_code`,
          product_description: sql`excluded.product_description`,
        }
      });
    }

    revalidatePath("/");
    return { success: true, message: `นำเข้าข้อมูลสินค้าสำเร็จ ${dataToInsert.length} รายการ` };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

// Import All Master
export async function importAllMasterData() {
  const results = [
    await importCustomerMaster(),
    await importAddressMaster(),
    await importProductMaster(),
  ];

  const successCount = results.filter(r => r.success).length;
  return {
    success: successCount > 0,
    message: `ประมวลผลเสร็จสิ้น: สำเร็จ ${successCount} พลาด ${results.length - successCount}`,
    details: results
  };
}