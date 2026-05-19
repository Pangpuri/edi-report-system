import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { file } from "zod";
import { create } from "domain";

// --- กลุ่มตารางระบบ Auth และ User Management ---

export const user = pgTable("user", {
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

export const session = pgTable("session", {
 id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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

export const verification = pgTable("verification", {
 id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// --- กลุ่มตาราง Master Data (อ้างอิงข้อมูลหลัก) ---

export const customer = pgTable("customer", {
  ean_location_code: varchar("ean_location_code", { length: 100 }),
  company_name: varchar("company_name", { length: 255 }),
  customer_code: varchar("customer_code", { length: 50 })
    .notNull()
    .primaryKey(),
  short_name: varchar("short_name", { length: 100 }),
});

export const custAddress = pgTable("cust_address", {
  id: serial("id").primaryKey(),
  customer_no: varchar("customer_no", { length: 50 }),
  company_name: varchar("company_name", { length: 255 }),
  address1: varchar("address1", { length: 255 }),
  address2: varchar("address2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  zip_code: varchar("zip_code", { length: 20 }),
  telephone: varchar("telephone", { length: 50 }),
  fax_no: varchar("fax_no", { length: 50 }),
  ean_location_code: varchar("ean_location_code", { length: 100 }), 
  barcode: varchar("barcode", { length: 100 }), 
  ship_to_code: varchar("ship_to_code", { length: 50 }), 
  usage_code: varchar("usage_code", { length: 20 }),     
  product_table: varchar("product_table", { length: 50 }),
  local_name: varchar("local_name", { length: 255 }),    
  branch_code: varchar("branch_code", { length: 50 }),
  tax_id: varchar("tax_id", { length: 50 }),
  branch_short_name: varchar("branch_short_name", { length: 100 }),
  signature: varchar("signature", { length: 50 }),       
  doc_ref_pttrm: varchar("doc_ref_pttrm", { length: 100 }),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const prodcode = pgTable("prodcode", {
  id: varchar("id", { length: 50 }).notNull().primaryKey(),
  ean_product_code: varchar("ean_product_code", { length: 50 }),
  product_description: varchar("product_description", { length: 255 }),
});

// --- กลุ่มตาราง Temp (พักข้อมูลระหว่าง Parse ไฟล์) ---

export const EDH_temp = pgTable("EDH_tmp", {
  id: serial("id").primaryKey(),
  H_Type: varchar("H_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Customer_Num: varchar("Customer_Num", { length: 20 }),
  Oder_Date: varchar("Oder_Date", { length: 10 }),
  Request_Date: varchar("Request_Date", { length: 10 }),
  Term_Pay: varchar("Term_Pay", { length: 10 }),
  Oder_Qty: varchar("Oder_Qty", { length: 25 }),
  Order_Amount: varchar("Order_Amount", { length: 25 }),
  Discount_Amount: varchar("Discount_Amount", { length: 25 }),
  S_Discount_Amount: varchar("S_Discount_Amount", { length: 25 }),
  Tax_Amount: varchar("Tax_Amount", { length: 25 }),
  Customer_Name: text("Customer_Name"),
  Buyer_Name: text("Buyer_Name"),
  Date_PO: varchar("Date_PO", { length: 30 }),
  Date_Ship: varchar("Date_Ship", { length: 30 }),
  Total_Amount: numeric("Total_Amount", { precision: 30, scale: 2 }),
  Ship_To_Address: text("Ship_To_Address"),
  Order_Note: text("Order_Note"),
  Generate_Date: varchar("Generate_Date", { length: 20 }),
  Process_Date: varchar("Process_Date", { length: 20 }),
  Deli_Time: varchar("Deli_Time", { length: 10 }),
  File_Name: varchar("File_Name", { length: 255 }),
  Created_At: timestamp("Created_At").defaultNow(),
});

export const EDL_temp = pgTable("EDL_tmp", {
  id: serial("id").primaryKey(),
  D_Type: varchar("D_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Customer_Num: varchar("Customer_Num", { length: 20 }),
  Line_Num: varchar("Line_Num", { length: 10 }),
  Item_Num: varchar("Item_Num", { length: 30 }),
  Product_Name: text("Product_Name"),
  Item_Description: text("Item_Description"),
  Bar_Code_Item: varchar("Bar_Code_Item", { length: 20 }),
  Unit_Measure: varchar("Unit_Measure", { length: 10 }),
  Order_Qty: varchar("Order_Qty", { length: 25 }),
  Order_Date: varchar("Order_Date", { length: 10 }),
  Request_Date: varchar("Request_Date", { length: 10 }),
  Price_Unit: numeric("Price_Unit", { precision: 12, scale: 2 }),
  Qty_Order: numeric("Qty_Order", { precision: 12, scale: 2 }),
  Free_Qty: numeric("Free_Qty", { precision: 12, scale: 2 }),
  Net_Amount: numeric("Net_Amount", { precision: 12, scale: 2 }),
  Discount_1: numeric("Discount_1", { precision: 12, scale: 2 }),
  Discount_2: numeric("Discount_2", { precision: 12, scale: 2 }),
  Discount_3: numeric("Discount_3", { precision: 12, scale: 2 }),
  Discount_Amount_Unit: numeric("Discount_Amount_Unit", {
    precision: 12,
    scale: 2,
  }),
  Buyer_Internal_Prod_code: varchar("Buyer_Internal_Prod_code", { length: 30 }),
  File_Name: varchar("File_Name", { length: 255 }),
});

// --- กลุ่มตาราง History (คลังข้อมูลหลักที่ใช้ส่งเข้า AS/400) ---

export const TEDH = pgTable("EDH_history", {

  id: serial("id").primaryKey(),
  H_Type: varchar("H_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Line_Num: varchar("Line_Num", { length: 10 }),
  Item_Num: varchar("Item_Num", { length: 30 }),
  Item_Description: text("Item_Description"),
  Bar_Code_Item: varchar("Bar_Code_Item", { length: 20 }),
  Unit_Measure: varchar("Unit_Measure", { length: 10 }),
  Unit_Price: numeric("Unit_Price", { precision: 12, scale: 2 }),
  Order_Qty: numeric("Order_Qty", { precision: 12, scale: 2 }),
  Net_Amount: numeric("Net_Amount", { precision: 12, scale: 2 }),
  Order_Date: varchar("Order_Date", { length: 10 }),
  Request_Date: varchar("Request_Date", { length: 10 }),
  Deli_Time: varchar("Deli_Time", { length: 10 }),
  Discount_1: numeric("Discount_1", { precision: 12, scale: 2 }),
  Discount_2: numeric("Discount_2", { precision: 12, scale: 2 }),
  Discount_3: numeric("Discount_3", { precision: 12, scale: 2 }),
  Discount_Amount_Unit: numeric("Discount_Amount_Unit", {
    precision: 12,
    scale: 2,
  }),
  Buyer_Internal_Prod_code: varchar("Buyer_Internal_Prod_code", { length: 30 }),
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

export const TEDL = pgTable("EDL_history", {
  id: serial("id").primaryKey(),
  Header_Id: integer("Header_Id").references(() => TEDH.id, {
    onDelete: "cascade",
  }),
  D_Type: varchar("D_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Customer_Num: varchar("Customer_Num", { length: 20 }),
  Line_Num: varchar("Line_Num", { length: 10 }),
  Product_Name: text("Product_Name"),
  Pack_Size: varchar("Pack_Size", { length: 50 }),
  Bar_Code_Item: varchar("Bar_Code_Item", { length: 20 }),
  Buyer_Prod_Code: varchar("Buyer_Prod_Code", { length: 30 }),
  Vendor_Prod_Code: varchar("Vendor_Prod_Code", { length: 30 }),
  Qty_Order: numeric("Qty_Order", { precision: 12, scale: 2 }),
  Price_Unit: numeric("Price_Unit", { precision: 12, scale: 2 }),
  Free_Qty: numeric("Free_Qty", { precision: 12, scale: 2 }),
  Discount_1: numeric("Discount_1", { precision: 12, scale: 2 }),
  Discount_2: numeric("Discount_2", { precision: 12, scale: 2 }),
  Discount_3: numeric("Discount_3", { precision: 12, scale: 2 }),
  Net_Amount: numeric("Net_Amount", { precision: 12, scale: 2 }),
  Check_Bar_Int: varchar("Check_Bar_Int", { length: 30 }),
  File_Name: varchar("File_Name", { length: 255 }),
  Change_Item: varchar("Change_Item", { length: 30 }),
  Change_Prod_Name: text("Change_Prod_Name"),
  Check_Name_Old_Prod: text("Check_Name_Old_Prod"), // เก็บชื่อเก่าจากไฟล์ (Audit)
  Created_At: timestamp("Created_At").defaultNow(),
});

// --- กลุ่มตาราง Log และ System Config ---

export const master_data_logs = pgTable("master_data_logs", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 50 }).notNull(), // 'CREATE', 'UPDATE_NAME', 'UPDATE_BARCODE'
  barcode: varchar("barcode", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

//ข้อมูลที่ต้องเปลี่ยนรหัส
export const Edit_Detail = pgTable("Edit_Detail", {
  id: serial("id").primaryKey(),
  BarCode: varchar("Bar_code", { length: 25 }).notNull(),//บาร์โค้ด
  Internal_Code1: varchar("Internal_Code1", { length: 20 }).notNull(), // รหัสใหม่จากไฟล์
  Cus_Code: varchar("Cus_Code", { length: 25 }), // ผูกกับลูกค้า (Optional)
  Prod_Name1: text("Prod_Name1"), // ชื่อเดิมสินค้า
  Internal_Code2: varchar("Internal_Code2", { length: 20 }).notNull(), // รหัสใหม่
  Prod_Name2: text("Prod_Name2"), // ชื่อใหม่สินค้า
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

//--- กลุ่มตารางสำหรับเก็บ Log การนำเข้าและการส่งข้อมูลเข้า AS/400 ---dok
export const as400_logs = pgTable("as400_logs", {
  id: serial("id").primaryKey(),
  historyId: integer("history_id").references(() => TEDH.id, {
    onDelete: "cascade",
  }),
  status: text("status"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

//--- กลุ่มตารางสำหรับเก็บไฟล์ที่อัพโหลดและข้อมูลสาขา ---
export const rawFileArchives = pgTable("raw_file_archives", {
  id: serial("id").primaryKey().notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  storagePath: text("storage_path").notNull(),
  branchId: integer("branch_id"),
});

//--- กลุ่มตารางสำหรับจัดการข้อมูลสาขาและการตั้งค่าระบบ ---
export const branches = pgTable("branches", {
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

//--- กลุ่มตารางสำหรับเก็บการตั้งค่าระบบที่อาจมีการเปลี่ยนแปลงได้ ---
export const systemConfigs = pgTable("system_configs", {
 id: serial("id").primaryKey().notNull(),
  configKey: varchar("config_key", { length: 100 }).unique().notNull(),
  configValue: text("config_value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

//--- กลุ่มตารางสำหรับเก็บ Log การนำเข้าและการประมวลผลไฟล์ ---
export const importLogs = pgTable("import_logs", {
  id: serial("id").primaryKey().notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  fileName: varchar("file_name", { length: 255 }),
  status: varchar("status", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

//--- กลุ่มตารางสำหรับเก็บข้อมูลไฟล์ที่ถูกนำเข้าและยังไม่ได้ประมวลผล (Staging) ---
export const ediRawStaging = pgTable(
  "edi_raw_staging",
  {
    id: serial("id").primaryKey().notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    lineContent: text("line_content").notNull(),
    lineType: varchar("line_type", { length: 10 }).notNull(),
    lineNumber: integer("line_number").notNull(),
    vendorCode: varchar("vendor_code", { length: 50 }),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(),
    importDate: timestamp("import_date").defaultNow().notNull(),
  },
  (table) => {
    return {
      fileNameIdx: index("file_name_idx").on(table.fileName),
      vendorCodeIdx: index("vendor_code_idx").on(table.vendorCode),
    };
  },
);

//--- กลุ่มมตารางรายการที่นำเข้าแล้วสำหรับเผื่อไว้พิมพ์ซ้ำ----
export const TEDH_history = pgTable("EDH_record", {

  id: serial("id").primaryKey(),
  H_Type: varchar("H_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Line_Num: varchar("Line_Num", { length: 10 }),
  Item_Num: varchar("Item_Num", { length: 30 }),
  Item_Description: text("Item_Description"),
  Bar_Code_Item: varchar("Bar_Code_Item", { length: 20 }),
  Unit_Measure: varchar("Unit_Measure", { length: 10 }),
  Unit_Price: numeric("Unit_Price", { precision: 12, scale: 2 }),
  Order_Qty: numeric("Order_Qty", { precision: 12, scale: 2 }),
  Net_Amount: numeric("Net_Amount", { precision: 12, scale: 2 }),
  Order_Date: varchar("Order_Date", { length: 10 }),
  Request_Date: varchar("Request_Date", { length: 10 }),
  Deli_Time: varchar("Deli_Time", { length: 10 }),
  Discount_1: numeric("Discount_1", { precision: 12, scale: 2 }),
  Discount_2: numeric("Discount_2", { precision: 12, scale: 2 }),
  Discount_3: numeric("Discount_3", { precision: 12, scale: 2 }),
  Discount_Amount_Unit: numeric("Discount_Amount_Unit", {
    precision: 12,
    scale: 2,
  }),
  Buyer_Internal_Prod_code: varchar("Buyer_Internal_Prod_code", { length: 30 }),
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

export const TEDL_history = pgTable("EDL_record", {
  id: serial("id").primaryKey(),
  Header_Id: integer("Header_Id").references(() => TEDH_history.id, {
    onDelete: "cascade",
  }),
  D_Type: varchar("D_Type", { length: 1 }),
  Customer_PO: varchar("Customer_PO", { length: 25 }),
  Customer_Num: varchar("Customer_Num", { length: 20 }),
  Line_Num: varchar("Line_Num", { length: 10 }),
  Product_Name: text("Product_Name"),
  Pack_Size: varchar("Pack_Size", { length: 50 }),
  Bar_Code_Item: varchar("Bar_Code_Item", { length: 20 }),
  Buyer_Prod_Code: varchar("Buyer_Prod_Code", { length: 30 }),
  Vendor_Prod_Code: varchar("Vendor_Prod_Code", { length: 30 }),
  Qty_Order: numeric("Qty_Order", { precision: 12, scale: 2 }),
  Price_Unit: numeric("Price_Unit", { precision: 12, scale: 2 }),
  Free_Qty: numeric("Free_Qty", { precision: 12, scale: 2 }),
  Discount_1: numeric("Discount_1", { precision: 12, scale: 2 }),
  Discount_2: numeric("Discount_2", { precision: 12, scale: 2 }),
  Discount_3: numeric("Discount_3", { precision: 12, scale: 2 }),
  Net_Amount: numeric("Net_Amount", { precision: 12, scale: 2 }),
  Check_Bar_Int: varchar("Check_Bar_Int", { length: 30 }),
  File_Name: varchar("File_Name", { length: 255 }),
  Change_Item: varchar("Change_Item", { length: 30 }),
  Change_Prod_Name: text("Change_Prod_Name"),
  Check_Name_Old_Prod: text("Check_Name_Old_Prod"), // เก็บชื่อเก่าจากไฟล์ (Audit)
  Created_At: timestamp("Created_At").defaultNow(),
});

//ข้อมูลการเแปลี่ยนแปลงหน่วยสินค้า สำหรับ Makro
export const Edit_Unit_Makro = pgTable("Edit_Unit_Makro", {
  id: serial("id").primaryKey(),
  product_name: varchar("product_name", { length: 255 }).notNull(),//ชื่อสินค้า
  product_id: varchar("product_id", { length: 50 }),//รหัสสินค้าจาก prodcode
  unit_product: numeric("unit_product", { precision: 12 }).notNull(),//จำนวนต่อหน่วย
  unit_cn: varchar("unit_cn", { length: 10 }).notNull(),//หน่วยที่ต้องการเปลี่ยน
  //จำนวนส่วนลดปกติ
  discount_1: numeric("discount_1", { precision: 12, scale: 2 }),
  discount_2: numeric("discount_2", { precision: 12, scale: 2 }),
  discount_3: numeric("discount_3", { precision: 12, scale: 2 }),
  discount_amount: numeric("discount_amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 20 }).default("active"),//active, deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
