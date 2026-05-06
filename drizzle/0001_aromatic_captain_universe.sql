CREATE TABLE "TEDH" (
	"id" serial PRIMARY KEY NOT NULL,
	"Supplie" varchar(1),
	"Customer_PO" varchar(25),
	"Customer_Num" varchar(25),
	"Order_Date" varchar(10),
	"Total_Amount" numeric(15, 2),
	"File_Order" varchar(255),
	"flag" varchar(20) DEFAULT 'pending',
	"as400_status" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "TEDL" (
	"id" serial PRIMARY KEY NOT NULL,
	"header_id" integer,
	"Customer_PO" varchar(25),
	"Line_Num" varchar(10),
	"Item_Num" varchar(30),
	"Item_Description" varchar(255),
	"Unit_Price" numeric(12, 2),
	"Order_Qty" numeric(12, 2),
	"Net_Amount" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "as400_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"history_id" integer,
	"status" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "EDH_temp" ADD COLUMN "File_Order" varchar(255);--> statement-breakpoint
ALTER TABLE "EDH_temp" ADD COLUMN "Order_Amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "EDH_temp" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "TEDL" ADD CONSTRAINT "TEDL_header_id_TEDH_id_fk" FOREIGN KEY ("header_id") REFERENCES "public"."TEDH"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "as400_logs" ADD CONSTRAINT "as400_logs_history_id_TEDH_id_fk" FOREIGN KEY ("history_id") REFERENCES "public"."TEDH"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "H_type";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Order_Date";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Request_Date";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Term_PAY";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Order_Qty";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Oder_Amount";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "S_Discount_Amount";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Tax_Amount";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Total_Amount";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Ship_To_Address";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Order_Note";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Generate_Date";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Process_Date";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "Deli_Time";--> statement-breakpoint
ALTER TABLE "EDH_temp" DROP COLUMN "file_name";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "D_type";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Line_Num";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Item_Description";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Bar_Code_Item";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Unit_Measure";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Unit_Price";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Order_Date";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Request_Date";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Discount_1";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Discount_2";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Discount_Unit";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Buyer_Prod_Code";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Customer_Num";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "Discount_3";--> statement-breakpoint
ALTER TABLE "EDL_temp" DROP COLUMN "file_name";