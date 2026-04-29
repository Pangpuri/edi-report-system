CREATE TABLE "EDH_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"h_type" varchar(1),
	"customer_po" varchar(25),
	"customer_num" varchar(20),
	"customer_name" text,
	"buyer_name" text,
	"date_po" varchar(10),
	"date_ship" varchar(10),
	"total_amount" numeric(12, 2),
	"file_name" varchar(255),
	"as400_status" boolean DEFAULT true,
	"as400_imported_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "EDL_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"header_id" integer,
	"d_type" varchar(1),
	"customer_po" varchar(25),
	"customer_num" varchar(20),
	"seq_num" varchar(5),
	"product_name" text,
	"pack_size" varchar(50),
	"ean_num" varchar(20),
	"buyer_prod_code" varchar(30),
	"vendor_prod_code" varchar(30),
	"qty_order" numeric(12, 2),
	"price_unit" numeric(12, 2),
	"free_qty" numeric(12, 2),
	"discount_1" numeric(12, 2),
	"discount_2" numeric(12, 2),
	"discount_3" numeric(12, 2),
	"total_amount" numeric(12, 2),
	"file_name" varchar(255),
	"created_at" timestamp DEFAULT now()
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
ALTER TABLE "as400_logs" DROP CONSTRAINT "as400_logs_header_id_EDH_tmp_id_fk";
--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "customer_po" SET DATA TYPE varchar(25);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "date_po" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "date_ship" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "customer_name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "file_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ALTER COLUMN "buyer_name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "customer_po" SET DATA TYPE varchar(25);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "product_name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "qty_order" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "price_unit" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "file_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "buyer_prod_code" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "vendor_prod_code" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "free_qty" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "check_name_old_prod" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "change_item" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ALTER COLUMN "change_prod_name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "as400_logs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "total_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "raw_line_id" integer;--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "discount_1" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "discount_2" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "discount_3" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "raw_line_id" integer;--> statement-breakpoint
ALTER TABLE "as400_logs" ADD COLUMN "history_id" integer;--> statement-breakpoint
ALTER TABLE "EDL_history" ADD CONSTRAINT "EDL_history_header_id_EDH_history_id_fk" FOREIGN KEY ("header_id") REFERENCES "public"."EDH_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_name_idx" ON "edi_raw_staging" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "vendor_code_idx" ON "edi_raw_staging" USING btree ("vendor_code");--> statement-breakpoint
ALTER TABLE "as400_logs" ADD CONSTRAINT "as400_logs_history_id_EDH_history_id_fk" FOREIGN KEY ("history_id") REFERENCES "public"."EDH_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EDH_tmp" DROP COLUMN "flag";--> statement-breakpoint
ALTER TABLE "EDH_tmp" DROP COLUMN "cus_name_op";--> statement-breakpoint
ALTER TABLE "EDH_tmp" DROP COLUMN "cus_prod_change";--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "discount1";--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "discount2";--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "discount3";--> statement-breakpoint
ALTER TABLE "EDL_tmp" DROP COLUMN "created_at";