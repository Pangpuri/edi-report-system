CREATE TABLE "as400_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"header_id" integer,
	"status" varchar(20),
	"error_message" text,
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
ALTER TABLE "account" DROP CONSTRAINT "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "ean_location_code" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "company_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "address1" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "address2" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "city" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "zip_code" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "customer_no" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "local_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "cust_address" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ALTER COLUMN "ean_location_code" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "customer" ALTER COLUMN "company_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "customer" ALTER COLUMN "short_name" SET DATA TYPE varchar(100);--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'prodcode'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "prodcode" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "prodcode" ALTER COLUMN "ean_product_code" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "prodcode" ALTER COLUMN "ean_product_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "as400_status" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "as400_imported_at" timestamp;--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "buyer_name" varchar(100);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "flag" varchar(10);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "cus_name_op" varchar(100);--> statement-breakpoint
ALTER TABLE "EDH_tmp" ADD COLUMN "cus_prod_change" varchar(100);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "pack_size" varchar(50);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "buyer_prod_code" varchar(50);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "vendor_prod_code" varchar(50);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "free_qty" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "discount1" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "discount2" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "discount3" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "total_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "check_bar_int" varchar(50);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "check_name_old_prod" varchar(100);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "change_item" varchar(50);--> statement-breakpoint
ALTER TABLE "EDL_tmp" ADD COLUMN "change_prod_name" varchar(100);--> statement-breakpoint
ALTER TABLE "prodcode" ADD COLUMN "id" varchar(50) PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "as400_logs" ADD CONSTRAINT "as400_logs_header_id_EDH_tmp_id_fk" FOREIGN KEY ("header_id") REFERENCES "public"."EDH_tmp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_file_archives" ADD CONSTRAINT "raw_file_archives_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prodcode" DROP COLUMN "internal_product_code";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "password";