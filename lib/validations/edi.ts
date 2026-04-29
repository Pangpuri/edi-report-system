import { customer } from "@/db/schema";
import * as z from "zod";

// 🏠 กฎสำหรับตาราง CustAddress
export const addressSchema = z.object({
  ean_location_code: z.string().trim().max(13, "EAN ต้องไม่เกิน 13 หลัก").nullable().optional(),
  company_name:      z.string().trim().max(50, "ชื่อบริษัทสูงสุด 50").nullable().optional(),
  address1:          z.string().trim().max(50, "ที่อยู่ 1 สูงสุด 50").nullable().optional(),
  address2:          z.string().trim().max(50, "ที่อยู่ 2 สูงสุด 50").nullable().optional(),
  city:              z.string().trim().max(20, "จังหวัดสูงสุด 20").nullable().optional(),
  zip_code:          z.string().trim().max(5, "รหัสไปรษณีย์ 5 หลัก").nullable().optional(),
  telephone:         z.string().trim().max(16, "โทรศัพท์สูงสุด 16").nullable().optional(),
  fax_no:            z.string().trim().max(13, "แฟกซ์สูงสุด 13").nullable().optional(),
  // 🔑 Primary Key: ใช้ .min(1) เพื่อให้ Type เป็น string แน่นอน และห้ามว่างค่ะ
  customer_no:       z.string().trim().min(1, "ระบุรหัสลูกค้า").max(10, "รหัสลูกค้าสูงสุด 10"),
  ship_to_code:      z.string().trim().max(4, "Ship to Code 4 หลัก").nullable().optional(),
  usage_code:        z.string().trim().max(1, "Usage Code 1 หลักเท่านั้น").nullable().optional(),
  product_table:     z.string().trim().max(10, "Product Table 10 หลัก").nullable().optional(),
  local_name:        z.string().trim().max(10, "Local Name 10 หลัก").nullable().optional(),
  branch_code:       z.string().trim().max(20, "Branch Code 20 หลัก").nullable().optional(),
  tax_id:            z.string().trim().max(50, "Tax ID 50 หลัก").nullable().optional(),
  branch_short_name: z.string().trim().max(30, "ชื่อย่อสาขา 30 หลัก").nullable().optional(),
  signature:         z.string().trim().max(1, "Signature 1 หลักเท่านั้น").nullable().optional(),
  doc_ref_pttrm:     z.string().trim().max(20, "DocRef 20 หลัก").nullable().optional(),
});

// 🏢 กฎสำหรับตาราง Customer
export const customerSchema = z.object({
  ean_location_code: z.string().trim().max(13).nullable().optional(),
  company_name:      z.string().trim().max(50).nullable().optional(),
  // 🔑 Primary Key: เปลี่ยนเป็น string แบบไม่ติด optional/null
  customer_code:     z.string().trim().min(1, "ระบุรหัสลูกค้า").max(25),
  short_name:        z.string().trim().max(10).nullable().optional(),
});

// 📦 กฎสำหรับตาราง Prodcode
export const prodcodeSchema = z.object({
  // 🔑 Primary Key: เปลี่ยนเป็น string แบบไม่ติด optional/null
  ean_product_code:      z.string().trim().min(1, "ระบุบาร์โค้ด").max(15),
  product_description:   z.string().trim().max(35).nullable().optional(),
  internal_product_code: z.string().trim().max(25).nullable().optional(),
});