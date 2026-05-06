ALTER TABLE "EDH_tmp" ADD COLUMN "Oder_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Request_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Term_Pay" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Oder_Qty" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Order_Amount" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Discount_Amount" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Tax_Amount" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Ship_To_Address" text;--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Order_Note" text;--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Generate_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Process_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "Deli_Time" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "D_Type" varchar(1);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Customer_Num" varchar(20);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Item_Description" text;--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Bar_Code_Item" varchar(20);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Unit_Measure" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Unit_Price" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Order_Qty" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Net_Amount" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Order_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Request_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Discount_Amount_Unit" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "Buyer_Internal_Prod_code" varchar(30);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Line_Num" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Item_Num" varchar(30);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Item_Description" text;--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Bar_Code_Item" varchar(20);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Unit_Measure" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Unit_Price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Order_Qty" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Net_Amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Order_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Request_Date" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Discount_1" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Discount_2" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Discount_3" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Discount_Amount_Unit" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Buyer_Internal_Prod_code" varchar(30);--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Flag" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Cus_Name_OP" text;--> statement-breakpoint
ALTER TABLE "EDH_history" ADD COLUMN "Cus_Prod_Change" text;--> statement-breakpoint
ALTER TABLE "EDL_history" ADD COLUMN "Bar_Code_Item" varchar(20);--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "EAN_Num";--> statement-breakpoint
ALTER TABLE "EDL_history" DROP COLUMN "EAN_Num";--> statement-breakpoint
ALTER TABLE "EDL_history" DROP COLUMN "Check_Bar_In";--> statement-breakpoint
ALTER TABLE "EDL_history" DROP COLUMN "Check_Name_Old_Prod";