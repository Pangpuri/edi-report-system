CREATE TABLE "EDH_tmp" (
	"id" serial PRIMARY KEY NOT NULL,
	"H_Type" varchar(1),
	"Customer_PO" varchar(25),
	"Customer_Num" varchar(20),
	"Customer_Name" text,
	"Buyer_Name" text,
	"Date_PO" varchar(10),
	"Date_Ship" varchar(10),
	"Total_Amount" numeric(12, 2),
	"File_Name" varchar(255),
	"Created_At" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "EDL_tmp" (
	"id" serial PRIMARY KEY NOT NULL,
	"Customer_PO" varchar(25),
	"Line_Num" varchar(10),
	"Item_Num" varchar(30),
	"Product_Name" text,
	"EAN_Num" varchar(20),
	"Price_Unit" numeric(12, 2),
	"Qty_Order" numeric(12, 2),
	"Free_Qty" numeric(12, 2),
	"Total_Amount" numeric(12, 2),
	"Discount_1" numeric(12, 2),
	"Discount_2" numeric(12, 2),
	"Discount_3" numeric(12, 2),
	"File_Name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "EDH_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"H_Type" varchar(1),
	"Customer_PO" varchar(25),
	"Customer_Num" varchar(20),
	"Customer_Name" text,
	"Buyer_Name" text,
	"Date_PO" varchar(10),
	"Date_Ship" varchar(10),
	"Total_Amount" numeric(12, 2),
	"File_Name" varchar(255),
	"AS400_Status" boolean DEFAULT true,
	"AS400_Imported_At" timestamp DEFAULT now(),
	"Created_At" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "EDL_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"Header_Id" integer,
	"D_Type" varchar(1),
	"Customer_PO" varchar(25),
	"Customer_Num" varchar(20),
	"Line_Num" varchar(10),
	"Product_Name" text,
	"Pack_Size" varchar(50),
	"EAN_Num" varchar(20),
	"Buyer_Prod_Code" varchar(30),
	"Vendor_Prod_Code" varchar(30),
	"Qty_Order" numeric(12, 2),
	"Price_Unit" numeric(12, 2),
	"Free_Qty" numeric(12, 2),
	"Discount_1" numeric(12, 2),
	"Discount_2" numeric(12, 2),
	"Discount_3" numeric(12, 2),
	"Total_Amount" numeric(12, 2),
	"File_Name" varchar(255),
	"Check_Bar_In" text,
	"Check_Name_Old_Prod" text,
	"Change_Item" varchar(30),
	"Change_Prod_Name" text,
	"Created_At" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"branch_code" varchar(50) NOT NULL,
	"source_path" text,
	"ip_address" varchar(50),
	"username" varchar(100),
	"password" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branches_branch_code_unique" UNIQUE("branch_code")
);
--> statement-breakpoint
CREATE TABLE "edi_raw_staging" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"line_content" text NOT NULL,
	"line_type" varchar(10) NOT NULL,
	"line_number" integer NOT NULL,
	"vendor_code" varchar(50),
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"import_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"file_name" varchar(255),
	"status" varchar(50),
	"message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "raw_file_archives" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"file_size" integer,
	"uploaded_at" timestamp DEFAULT now(),
	"storage_path" text NOT NULL,
	"branch_id" integer
);
--> statement-breakpoint
CREATE TABLE "system_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_configs_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
ALTER TABLE "EDH_temp" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "EDL_temp" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "TEDH" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "TEDL" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "EDH_temp" CASCADE;--> statement-breakpoint
DROP TABLE "EDL_temp" CASCADE;--> statement-breakpoint
DROP TABLE "TEDH" CASCADE;--> statement-breakpoint
DROP TABLE "TEDL" CASCADE;--> statement-breakpoint
ALTER TABLE "as400_logs" DROP CONSTRAINT "as400_logs_history_id_TEDH_id_fk";
--> statement-breakpoint
ALTER TABLE "EDL_history" ADD CONSTRAINT "EDL_history_Header_Id_EDH_history_id_fk" FOREIGN KEY ("Header_Id") REFERENCES "public"."EDH_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_name_idx" ON "edi_raw_staging" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "vendor_code_idx" ON "edi_raw_staging" USING btree ("vendor_code");--> statement-breakpoint
ALTER TABLE "as400_logs" ADD CONSTRAINT "as400_logs_history_id_EDH_history_id_fk" FOREIGN KEY ("history_id") REFERENCES "public"."EDH_history"("id") ON DELETE cascade ON UPDATE no action;