import { pgTable, unique, text, boolean, timestamp, varchar, foreignKey, serial, integer, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	username: text(),
	displayUsername: text("display_username"),
	phone: text(),
	role: text().default('user').notNull(),
	banned: boolean().default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { mode: 'string' }),
}, (table) => [
	unique("user_email_unique").on(table.email),
	unique("user_username_unique").on(table.username),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const systemConfigs = pgTable("system_configs", {
	configKey: varchar("config_key", { length: 50 }).primaryKey().notNull(),
	configValue: text("config_value").notNull(),
	description: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const branches = pgTable("branches", {
	id: serial().primaryKey().notNull(),
	branchName: varchar("branch_name", { length: 100 }).notNull(),
	branchCode: varchar("branch_code", { length: 20 }).notNull(),
	ipAddress: varchar("ip_address", { length: 50 }),
	sourcePath: text("source_path"),
	username: varchar({ length: 100 }),
	password: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("branches_branch_code_unique").on(table.branchCode),
]);

export const importLogs = pgTable("import_logs", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id"),
	fileName: text("file_name").notNull(),
	status: varchar({ length: 20 }),
	message: text(),
	processedAt: timestamp("processed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "import_logs_branch_id_branches_id_fk"
		}),
]);

export const custAddress = pgTable("cust_address", {
	id: serial().primaryKey().notNull(),
	eanLocationCode: varchar("ean_location_code", { length: 50 }),
	customerNo: varchar("customer_no", { length: 50 }),
	companyName: varchar("company_name", { length: 255 }),
	address1: varchar({ length: 255 }),
	address2: varchar({ length: 255 }),
	city: varchar({ length: 100 }),
	zipCode: varchar("zip_code", { length: 20 }),
	telephone: varchar({ length: 50 }),
	faxNo: varchar("fax_no", { length: 50 }),
	shipToCode: varchar("ship_to_code", { length: 20 }),
	usageCode: varchar("usage_code", { length: 10 }),
	productTable: varchar("product_table", { length: 50 }),
	localName: varchar("local_name", { length: 100 }),
	branchCode: varchar("branch_code", { length: 50 }),
	taxId: varchar("tax_id", { length: 50 }),
	branchShortName: varchar("branch_short_name", { length: 100 }),
	signature: varchar({ length: 10 }),
	docRefPttrm: varchar("doc_ref_pttrm", { length: 100 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const rawFileArchives = pgTable("raw_file_archives", {
	id: serial().primaryKey().notNull(),
	fileName: text("file_name").notNull(),
	originalName: text("original_name").notNull(),
	fileSize: integer("file_size"),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	storagePath: text("storage_path").notNull(),
	branchId: integer("branch_id"),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "raw_file_archives_branch_id_branches_id_fk"
		}),
]);

export const edlHistory = pgTable("EDL_history", {
	id: serial().primaryKey().notNull(),
	headerId: integer("header_id"),
	dType: varchar("d_type", { length: 1 }),
	customerPo: varchar("customer_po", { length: 25 }),
	customerNum: varchar("customer_num", { length: 20 }),
	seqNum: varchar("seq_num", { length: 5 }),
	productName: text("product_name"),
	packSize: varchar("pack_size", { length: 50 }),
	eanNum: varchar("ean_num", { length: 20 }),
	buyerProdCode: varchar("buyer_prod_code", { length: 30 }),
	vendorProdCode: varchar("vendor_prod_code", { length: 30 }),
	qtyOrder: numeric("qty_order", { precision: 12, scale:  2 }),
	priceUnit: numeric("price_unit", { precision: 12, scale:  2 }),
	freeQty: numeric("free_qty", { precision: 12, scale:  2 }),
	discount1: numeric("discount_1", { precision: 12, scale:  2 }),
	discount2: numeric("discount_2", { precision: 12, scale:  2 }),
	discount3: numeric("discount_3", { precision: 12, scale:  2 }),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }),
	fileName: varchar("file_name", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const prodcode = pgTable("prodcode", {
	eanProductCode: varchar("ean_product_code", { length: 50 }),
	productDescription: varchar("product_description", { length: 255 }),
	id: varchar({ length: 50 }).primaryKey().notNull(),
});

export const edhHistory = pgTable("EDH_history", {
	id: serial().primaryKey().notNull(),
	hType: varchar("h_type", { length: 1 }),
	customerPo: varchar("customer_po", { length: 25 }),
	customerNum: varchar("customer_num", { length: 20 }),
	customerName: text("customer_name"),
	buyerName: text("buyer_name"),
	datePo: varchar("date_po", { length: 10 }),
	dateShip: varchar("date_ship", { length: 10 }),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }),
	fileName: varchar("file_name", { length: 255 }),
	as400Status: boolean("as400_status").default(true),
	as400ImportedAt: timestamp("as400_imported_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const customers = pgTable("customers", {
	id: serial().primaryKey().notNull(),
	customerCode: varchar("customer_code", { length: 20 }).notNull(),
	customerName: text("customer_name").notNull(),
	address: text(),
	contact: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const ediRawStaging = pgTable("edi_raw_staging", {
	id: serial().primaryKey().notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	lineContent: text("line_content").notNull(),
	lineType: varchar("line_type", { length: 10 }).notNull(),
	lineNumber: integer("line_number").notNull(),
	vendorCode: varchar("vendor_code", { length: 50 }),
	status: varchar({ length: 20 }).default('PENDING').notNull(),
	importDate: timestamp("import_date", { mode: 'string' }).defaultNow().notNull(),
});

export const edhTmp = pgTable("EDH_tmp", {
	id: serial().primaryKey().notNull(),
	hType: varchar("h_type", { length: 1 }),
	customerPo: varchar("customer_po", { length: 25 }),
	customerNum: varchar("customer_num", { length: 20 }),
	datePo: varchar("date_po", { length: 10 }),
	dateShip: varchar("date_ship", { length: 10 }),
	customerName: text("customer_name"),
	fileName: varchar("file_name", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	as400Status: boolean("as400_status").default(false),
	as400ImportedAt: timestamp("as400_imported_at", { mode: 'string' }),
	buyerName: text("buyer_name"),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }),
});

export const edlTmp = pgTable("EDL_tmp", {
	id: serial().primaryKey().notNull(),
	dType: varchar("d_type", { length: 1 }),
	customerPo: varchar("customer_po", { length: 25 }),
	seqNum: varchar("seq_num", { length: 5 }),
	eanNum: varchar("ean_num", { length: 20 }),
	productName: text("product_name"),
	qtyOrder: numeric("qty_order", { precision: 12, scale:  2 }),
	priceUnit: numeric("price_unit", { precision: 12, scale:  2 }),
	packSize: varchar("pack_size", { length: 50 }),
	buyerProdCode: varchar("buyer_prod_code", { length: 30 }),
	vendorProdCode: varchar("vendor_prod_code", { length: 30 }),
	freeQty: numeric("free_qty", { precision: 12, scale:  2 }),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }),
	changeItem: varchar("change_item", { length: 30 }),
	changeProdName: text("change_prod_name"),
	customerNum: varchar("customer_num", { length: 20 }),
	discount1: numeric("discount_1", { precision: 12, scale:  2 }),
	discount2: numeric("discount_2", { precision: 12, scale:  2 }),
	discount3: numeric("discount_3", { precision: 12, scale:  2 }),
	fileName: varchar("file_name", { length: 255 }),
	checkBarInt: varchar("check_bar_int", { length: 50 }),
	checkNameOldProd: text("check_name_old_prod"),
});

export const as400Logs = pgTable("as400_logs", {
	id: serial().primaryKey().notNull(),
	headerId: integer("header_id"),
	status: text(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	historyId: integer("history_id"),
});
