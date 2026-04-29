import { pgTable, serial, varchar, text, timestamp, integer, boolean, numeric ,decimal, index } from "drizzle-orm/pg-core";


/**
 * ==========================================
 * 📦 MASTER DATA TABLES (EDI Domain)
 * ==========================================
 */

/**
 * ข้อมูลลูกค้าหลัก (Customer Master)
 * เก็บข้อมูลรหัสและชื่อลูกค้าสำหรับใช้างอิงในระบบ
 */
export const customer = pgTable("customer", {
  ean_location_code: varchar("ean_location_code", { length: 100 }), 
  company_name: varchar("company_name", { length: 255 }), 
  customer_code: varchar("customer_code", { length: 50 }).notNull().primaryKey(), 
  short_name: varchar("short_name", { length: 100 }),
});

/**
 * ข้อมูลที่อยู่และสาขาของลูกค้า (Customer Address & Branches)
 */
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

// ตารางสำหรับเก็บข้อมูลสินค้า
export const prodcode = pgTable("prodcode", {
  ean_product_code: varchar("ean_product_code", { length: 50 }),
  product_description: varchar("product_description", { length: 255 }),
  product_code: varchar("id", { length: 50 }).notNull().primaryKey(),
});

/**
 * ==========================================
 * 🛡️ AUTHENTICATION TABLES (Better Auth)
 * ==========================================
 */

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
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
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

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// 1. ตาราง Header (EDH_tmp) - ตารางพักข้อมูล
export const EDH_tmp = pgTable("EDH_tmp", {
  id: serial("id").primaryKey(),
  hType: varchar("h_type", { length: 1 }),
  customerPo: varchar("customer_po", { length: 25 }),
  customerNum: varchar("customer_num", { length: 20 }),
  customerName: text("customer_name"),
  buyerName: text("buyer_name"),
  datePo: varchar("date_po", { length: 10 }),
  dateShip: varchar("date_ship", { length: 10 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  fileName: varchar("file_name", { length: 255 }),
  as400Status: boolean("as400_status").default(false),
  as400ImportedAt: timestamp("as400_imported_at"),
  createdAt: timestamp("created_at").defaultNow(),
  rawLineId: integer("raw_line_id"), 
});

// 1.2 ตาราง Header History (EDH_history) - ตารางเก็บประวัติถาวร
export const EDH_history = pgTable("EDH_history", {
  id: serial("id").primaryKey(),
  hType: varchar("h_type", { length: 1 }),
  customerPo: varchar("customer_po", { length: 25 }),
  customerNum: varchar("customer_num", { length: 20 }),
  customerName: text("customer_name"),
  buyerName: text("buyer_name"),
  datePo: varchar("date_po", { length: 10 }),
  dateShip: varchar("date_ship", { length: 10 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  fileName: varchar("file_name", { length: 255 }),
  as400Status: boolean("as400_status").default(true),
  as400ImportedAt: timestamp("as400_imported_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. ตาราง Detail (EDL_tmp) - ตารางพักข้อมูล
export const EDL_tmp = pgTable("EDL_tmp", {
  id: serial("id").primaryKey(),
  dType: varchar("d_type", { length: 1 }),
  customerPo: varchar("customer_po", { length: 25 }),
  customerNum: varchar("customer_num", { length: 20 }),
  seqNum: varchar("seq_num", { length: 5 }),
  productName: text("product_name"),
  packSize: varchar("pack_size", { length: 50 }),
  eanNum: varchar("ean_num", { length: 20 }),
  buyerProdCode: varchar("buyer_prod_code", { length: 30 }),
  vendorProdCode: varchar("vendor_prod_code", { length: 30 }),
  qtyOrder: decimal("qty_order", { precision: 12, scale: 2 }),
  priceUnit: decimal("price_unit", { precision: 12, scale: 2 }),
  freeQty: decimal("free_qty", { precision: 12, scale: 2 }),
  discount1: decimal("discount_1", { precision: 12, scale: 2 }),
  discount2: decimal("discount_2", { precision: 12, scale: 2 }),
  discount3: decimal("discount_3", { precision: 12, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  fileName: varchar("file_name", { length: 255 }),
  checkBarInt: varchar("check_bar_int", { length: 50 }),      
  checkNameOldProd: text("check_name_old_prod"),             
  changeItem: varchar("change_item", { length: 30 }), 
  changeProdName: text("change_prod_name"),
  rawLineId: integer("raw_line_id"), 
});

// 2.2 ตาราง Detail History (EDL_history) - ตารางเก็บประวัติถาวร
export const EDL_history = pgTable("EDL_history", {
  id: serial("id").primaryKey(),
  headerId: integer("header_id").references(() => EDH_history.id, { onDelete: "cascade" }),
  dType: varchar("d_type", { length: 1 }),
  customerPo: varchar("customer_po", { length: 25 }),
  customerNum: varchar("customer_num", { length: 20 }),
  seqNum: varchar("seq_num", { length: 5 }),
  productName: text("product_name"),
  packSize: varchar("pack_size", { length: 50 }),
  eanNum: varchar("ean_num", { length: 20 }),
  buyerProdCode: varchar("buyer_prod_code", { length: 30 }),
  vendorProdCode: varchar("vendor_prod_code", { length: 30 }),
  qtyOrder: decimal("qty_order", { precision: 12, scale: 2 }),
  priceUnit: decimal("price_unit", { precision: 12, scale: 2 }),
  freeQty: decimal("free_qty", { precision: 12, scale: 2 }),
  discount1: decimal("discount_1", { precision: 12, scale: 2 }),
  discount2: decimal("discount_2", { precision: 12, scale: 2 }),
  discount3: decimal("discount_3", { precision: 12, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  fileName: varchar("file_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. ตาราง Log สำหรับ AS400
export const as400_logs = pgTable("as400_logs", {
  id: serial("id").primaryKey(),
  headerId: integer("header_id"), 
  historyId: integer("history_id").references(() => EDH_history.id, { onDelete: "cascade" }), 
  status: text("status"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * ==========================================
 * 🌐 MULTI-BRANCH & CONFIGURATION TABLES
 * ==========================================
 */

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  branchName: varchar("branch_name", { length: 100 }).notNull(),
  branchCode: varchar("branch_code", { length: 20 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 50 }),
  sourcePath: text("source_path"), 
  username: varchar("username", { length: 100 }),
  password: text("password"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemConfigs = pgTable("system_configs", {
  configKey: varchar("config_key", { length: 50 }).primaryKey(),
  configValue: text("config_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const importLogs = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  fileName: text("file_name").notNull(),
  status: varchar("status", { length: 20 }), 
  message: text("message"),
  processedAt: timestamp("processed_at").defaultNow(),
});

export const rawFileArchives = pgTable("raw_file_archives", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),       
  originalName: text("original_name").notNull(), 
  fileSize: integer("file_size"),              
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  storagePath: text("storage_path").notNull(), 
  branchId: integer("branch_id").references(() => branches.id),
});

// 4. ตารางสำหรับเก็บข้อมูลดิบเพื่อการตรวจสอบ Index (Raw Staging)
export const ediRawStaging = pgTable("edi_raw_staging", {
  id: serial("id").primaryKey(), 
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