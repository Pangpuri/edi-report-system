import { pgTable, serial, varchar, text, timestamp, integer, boolean, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { Flag } from "lucide-react";

// --- กลุ่มตารางระบบ Auth และ User Management ---

export const user = pgTable("user", { /* เก็บข้อมูล User และ Role ระบบ */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  phone: text("phone"),
  role: text("role").notNull().default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", { /* จัดการ Session การ Login */
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", { /* ข้อมูล OAuth / Provider ต่างๆ */
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", { /* เก็บ Token ตรวจสอบความถูกต้อง (Email/OTP) */
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// --- กลุ่มตาราง Master Data (อ้างอิงข้อมูลหลัก) ---

export const customer = pgTable("customer", { /* ข้อมูลลูกค้าหลัก (Master Customer) */
  ean_location_code: varchar("ean_location_code", { length: 100 }),
  company_name: varchar("company_name", { length: 255 }),
  customer_code: varchar("customer_code", { length: 50 }).notNull().primaryKey(),
  short_name: varchar("short_name", { length: 100 }),
});

export const custAddress = pgTable("cust_address", { /* สมุดที่อยู่ลูกค้า/สาขา และการตั้งค่าเอกสาร */
  id: serial("id").primaryKey(),
  customer_no: varchar("customer_no", { length: 50 }),
  company_name: varchar("company_name", { length: 255 }),
  address1: varchar("address1", { length: 255 }),
  address2: varchar("address2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  zip_code: varchar("zip_code", { length: 20 }),
  telephone: varchar("telephone", { length: 50 }),
  fax_no: varchar("fax_no", { length: 50 }),
  ean_location_code: varchar("ean_location_code", { length: 50 }),
  ship_to_code: varchar("ship_to_code", { length: 20 }),
  usage_code: varchar("usage_code", { length: 10 }),
  product_table: varchar("product_table", { length: 50 }),
  local_name: varchar("local_name", { length: 100 }),
  branch_code: varchar("branch_code", { length: 50 }),
  tax_id: varchar("tax_id", { length: 50 }),
  branch_short_name: varchar("branch_short_name", { length: 100 }),
  signature: varchar("signature", { length: 10 }),
  doc_ref_pttrm: varchar("doc_ref_pttrm", { length: 100 }),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const prodcode = pgTable("prodcode", { /* ข้อมูลรหัสสินค้าและ EAN (Master Product) */
  id: varchar("id", { length: 50 }).notNull().primaryKey(),
  ean_product_code: varchar("ean_product_code", { length: 50 }),
  product_description: varchar("product_description", { length: 255 }),
});

// --- กลุ่มตาราง Temp (พักข้อมูลระหว่าง Parse ไฟล์) ---

export const EDH_temp = pgTable("EDH_tmp", { /* พักข้อมูลส่วนหัว (Header) จากไฟล์ TXT/TAB ชั่วคราว */
  id: serial("id").primaryKey(),
  H_Type: varchar("H_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Customer_Num: varchar("Customer_Num", { length: 20 }),
  Customer_Name: text("Customer_Name"),
  Buyer_Name: text("Buyer_Name"),
  Date_PO: varchar("Date_PO", { length: 10 }),
  Date_Ship: varchar("Date_Ship", { length: 10 }),
  Total_Amount: numeric("Total_Amount", { precision: 12, scale: 2 }),
  File_Name: varchar("File_Name", { length: 255 }),
  Created_At: timestamp("Created_At").defaultNow(),
});

export const EDL_temp = pgTable("EDL_tmp", { /* พักข้อมูลรายการสินค้า (Detail) จากไฟล์ TXT/TAB ชั่วคราว */
  id: serial("id").primaryKey(),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Line_Num: varchar("Line_Num", { length: 10 }),
  Item_Num: varchar("Item_Num", { length: 30 }),
  Product_Name: text("Product_Name"),
  EAN_Num: varchar("EAN_Num", { length: 20 }),
  Price_Unit: numeric("Price_Unit", { precision: 12, scale: 2 }),
  Qty_Order: numeric("Qty_Order", { precision: 12, scale: 2 }),
  Free_Qty: numeric("Free_Qty", { precision: 12, scale: 2 }),
  Total_Amount: numeric("Total_Amount", { precision: 12, scale: 2 }),
  Discount_1: numeric("Discount_1", { precision: 12, scale: 2 }),
  Discount_2: numeric("Discount_2", { precision: 12, scale: 2 }),
  Discount_3: numeric("Discount_3", { precision: 12, scale: 2 }),
  File_Name: varchar("File_Name", { length: 255 }),
});

// --- กลุ่มตาราง History (คลังข้อมูลหลักที่ใช้ส่งเข้า AS/400) ---

export const TEDH = pgTable("EDH_history", { /* ข้อมูล Header ที่ตรวจสอบแล้ว พร้อมรอส่งเข้า AS/400 */
  id: serial("id").primaryKey(),
  H_Type: varchar("H_Type", { length: 1 }), 
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Customer_Num: varchar("Customer_Num", { length: 20 }),
  Customer_Name: text("Customer_Name"),
  Buyer_Name: text("Buyer_Name"),
  Date_PO: varchar("Date_PO", { length: 10 }),
  Date_Ship: varchar("Date_Ship", { length: 10 }),
  Total_Amount: numeric("Total_Amount", { precision: 12, scale: 2 }),
  File_Name: varchar("File_Name", { length: 255 }),
  AS400_Status: boolean("AS400_Status").default(true),
  Flag: boolean("Flag").default(false),
  Cus_Name_OP: text("Cus_Name_OP"),
  Cus_Prod_Change: text("Cus_Prod_Change"),
  AS400_Imported_At: timestamp("AS400_Imported_At").defaultNow(),
  Created_At: timestamp("Created_At").defaultNow(),
});

export const TEDL = pgTable("EDL_history", { /* รายการสินค้าใน History ผูกกับ Header_Id */
  id: serial("id").primaryKey(),
  Header_Id: integer("Header_Id").references(() => TEDH.id, { onDelete: "cascade" }),
  D_Type: varchar("D_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Customer_Num: varchar("Customer_Num", { length: 20 }),
  Line_Num: varchar("Line_Num", { length: 10 }),
  Product_Name: text("Product_Name"),
  Pack_Size: varchar("Pack_Size", { length: 50 }),
  EAN_Num: varchar("EAN_Num", { length: 20 }),
  Buyer_Prod_Code: varchar("Buyer_Prod_Code", { length: 30 }),
  Vendor_Prod_Code: varchar("Vendor_Prod_Code", { length: 30 }),
  Qty_Order: numeric("Qty_Order", { precision: 12, scale: 2 }),
  Price_Unit: numeric("Price_Unit", { precision: 12, scale: 2 }),
  Free_Qty: numeric("Free_Qty", { precision: 12, scale: 2 }),
  Discount_1: numeric("Discount_1", { precision: 12, scale: 2 }),
  Discount_2: numeric("Discount_2", { precision: 12, scale: 2 }),
  Discount_3: numeric("Discount_3", { precision: 12, scale: 2 }),
  Total_Amount: numeric("Total_Amount", { precision: 12, scale: 2 }),
  File_Name: varchar("File_Name", { length: 50 }),
  Check_Bar_In: numeric("Check_Bar_In",{ precision: 15 }),
  Check_Name_Old_Prod: varchar("Check_Name_Old_Prod",{ length: 50 }),
  Change_Item: varchar("Change_Item", { length: 30 }),
  Change_Prod_Name: varchar("Change_Prod_Name", { length:50 }),
  Created_At: timestamp("Created_At").defaultNow(),
});

// --- กลุ่มตาราง Log และ System Config ---

export const as400_logs = pgTable("as400_logs", { // เก็บผลลัพธ์/Error ของแต่ละรายการที่ส่งเข้า AS/400 
  id: serial("id").primaryKey(),
  historyId: integer("history_id").references(() => TEDH.id, { onDelete: "cascade" }),
  status: text("status"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rawFileArchives = pgTable("raw_file_archives", { // เก็บประวัติไฟล์ดิบและที่อยู่ไฟล์ใน Storage 
  id: serial("id").primaryKey().notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  storagePath: text("storage_path").notNull(),
  branchId: integer("branch_id"),
});

export const branches = pgTable("branches", { // ข้อมูลสาขาต้นทางและ Path สำหรับดึงไฟล์ 
  id: serial("id").primaryKey().notNull(),
  branchName: varchar("branch_name", { length: 100 }).notNull(),
  branchCode: varchar("branch_code", { length: 50 }).notNull().unique(),
  sourcePath: text("source_path"),
  ipAddress: varchar("ip_address", { length: 50 }),
  username: varchar("username", { length: 100 }),
  password: varchar("password", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemConfigs = pgTable("system_configs", { /* ตั้งค่าระบบ เช่น STAGING_PATH */
  id: serial("id").primaryKey().notNull(),
  configKey: varchar("config_key", { length: 100 }).unique().notNull(),
  configValue: text("config_value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const importLogs = pgTable("import_logs", { /* บันทึกสถานะการ Import ไฟล์จากแต่ละสาขา */
  id: serial("id").primaryKey().notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  fileName: varchar("file_name", { length: 255 }),
  status: varchar("status", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ediRawStaging = pgTable("edi_raw_staging", { /* พักเนื้อหาไฟล์แบบบรรทัดต่อบรรทัดก่อน Parse เข้า Temp */
  id: serial("id").primaryKey().notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  lineContent: text("line_content").notNull(),
  lineType: varchar("line_type", { length: 10 }).notNull(),
  lineNumber: integer("line_number").notNull(),
  vendorCode: varchar("vendor_code", { length: 50 }),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(),
  importDate: timestamp("import_date").defaultNow().notNull(),
}, (table) => {
  return {
    fileNameIdx: index("file_name_idx").on(table.fileName),
    vendorCodeIdx: index("vendor_code_idx").on(table.vendorCode),
  };
});

// --- การนิยามความสัมพันธ์ (Relations) ---

export const TEDHRelations = relations(TEDH, ({ many }) => ({
  details: many(TEDL),
  logs: many(as400_logs),
}));

export const TEDLRelations = relations(TEDL, ({ one }) => ({
  header: one(TEDH, {
    fields: [TEDL.Header_Id],
    references: [TEDH.id],
  }),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  importLogs: many(importLogs),
  rawArchives: many(rawFileArchives),
}));