CREATE TABLE "Edit_Detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"Bar_code" varchar(25) NOT NULL,
	"Internal_Code1" varchar(20) NOT NULL,
	"Cus_Code" varchar(25),
	"Prod_Name1" text,
	"Internal_Code2" varchar(20) NOT NULL,
	"Prod_Name2" text,
	"last_used" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "Edit_Unit_Makro" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_id" varchar(50),
	"unit_product" numeric(12) NOT NULL,
	"unit_cn" varchar(10) NOT NULL,
	"discount_1" numeric(12, 2),
	"discount_2" numeric(12, 2),
	"discount_3" numeric(12, 2),
	"discount_amount" numeric(12, 2),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "EDH_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"H_Type" varchar(1),
	"Customer_PO" varchar(25),
	"Line_Num" varchar(10),
	"Item_Num" varchar(30),
	"Item_Description" text,
	"Bar_Code_Item" varchar(20),
	"Unit_Measure" varchar(10),
	"Unit_Price" numeric(12, 2),
	"Order_Qty" numeric(12, 2),
	"Net_Amount" numeric(12, 2),
	"Order_Date" varchar(10),
	"Request_Date" varchar(10),
	"Discount_1" numeric(12, 2),
	"Discount_2" numeric(12, 2),
	"Discount_3" numeric(12, 2),
	"Discount_Amount_Unit" numeric(12, 2),
	"Buyer_Internal_Prod_code" varchar(30),
	"Customer_Num" varchar(20),
	"Customer_Name" text,
	"Buyer_Name" text,
	"Date_PO" varchar(10),
	"Date_Ship" varchar(10),
	"Total_Amount" numeric(12, 2),
	"File_Name" varchar(255),
	"AS400_Status" boolean DEFAULT true,
	"Flag" boolean DEFAULT false,
	"Cus_Name_OP" text,
	"Cus_Prod_Change" text,
	"AS400_Imported_At" timestamp DEFAULT now(),
	"Created_At" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "EDL_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"Header_Id" integer,
	"D_Type" varchar(1),
	"Customer_PO" varchar(25),
	"Customer_Num" varchar(20),
	"Line_Num" varchar(10),
	"Product_Name" text,
	"Pack_Size" varchar(50),
	"Bar_Code_Item" varchar(20),
	"Buyer_Prod_Code" varchar(30),
	"Vendor_Prod_Code" varchar(30),
	"Qty_Order" numeric(12, 2),
	"Price_Unit" numeric(12, 2),
	"Free_Qty" numeric(12, 2),
	"Discount_1" numeric(12, 2),
	"Discount_2" numeric(12, 2),
	"Discount_3" numeric(12, 2),
	"Net_Amount" numeric(12, 2),
	"Check_Bar_Int" varchar(30),
	"File_Name" varchar(255),
	"Change_Item" varchar(30),
	"Change_Prod_Name" text,
	"Check_Name_Old_Prod" text,
	"Created_At" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_data_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"barcode" varchar(100),
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Oder_Qty" SET DATA TYPE varchar(25);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Order_Amount" SET DATA TYPE varchar(25);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Discount_Amount" SET DATA TYPE varchar(25);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Tax_Amount" SET DATA TYPE varchar(25);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Date_PO" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Date_Ship" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Total_Amount" SET DATA TYPE numeric(30, 2);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Generate_Date" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "Process_Date" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "Order_Qty" SET DATA TYPE varchar(25);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "ean_location_code" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "ship_to_code" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "usage_code" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "local_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "signature" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "S_Discount_Amount" varchar(25);--> statement-breakpoint
ALTER TABLE "EDL_history" ADD COLUMN "Check_Bar_Int" varchar(30);--> statement-breakpoint
ALTER TABLE "EDL_history" ADD COLUMN "Check_Name_Old_Prod" text;--> statement-breakpoint
ALTER TABLE "cust_address" ADD COLUMN "barcode" varchar(100);--> statement-breakpoint
ALTER TABLE "EDL_record" ADD CONSTRAINT "EDL_record_Header_Id_EDH_record_id_fk" FOREIGN KEY ("Header_Id") REFERENCES "public"."EDH_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "Net_Amount_Str";