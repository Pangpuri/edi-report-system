CREATE TABLE "EDH_temp" (
	"id" serial PRIMARY KEY NOT NULL,
	"H_type" varchar(1),
	"Customer_PO" varchar(25),
	"Order_Date" varchar(10),
	"Request_Date" varchar(10),
	"Term_PAY" varchar(10),
	"Order_Qty" numeric(12, 2),
	"Oder_Amount" numeric(15, 2),
	"S_Discount_Amount" numeric(20, 2),
	"Tax_Amount" numeric(20, 2),
	"Total_Amount" numeric(20, 2),
	"Ship_To_Address" varchar(255),
	"Order_Note" text,
	"Generate_Date" timestamp DEFAULT now(),
	"Process_Date" timestamp DEFAULT now(),
	"Customer_Num" varchar(25),
	"Deli_Time" varchar(20),
	"file_name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "EDL_temp" (
	"id" serial PRIMARY KEY NOT NULL,
	"D_type" varchar(1),
	"Customer_PO" varchar(25),
	"Line_Num" varchar(10),
	"Item_Num" varchar(30),
	"Item_Description" varchar(255),
	"Bar_Code_Item" varchar(30),
	"Unit_Measure" varchar(20),
	"Unit_Price" numeric(12, 2),
	"Order_Qty" numeric(12, 2),
	"Net_Amount" numeric(15, 2),
	"Order_Date" varchar(10),
	"Request_Date" varchar(10),
	"Discount_1" numeric(20, 2),
	"Discount_2" numeric(20, 2),
	"Discount_Unit" varchar(20),
	"Buyer_Prod_Code" varchar(30),
	"Customer_Num" varchar(25),
	"Discount_3" numeric(20, 2),
	"file_name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cust_address" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_no" varchar(50),
	"company_name" varchar(255),
	"address1" varchar(255),
	"address2" varchar(255),
	"city" varchar(100),
	"zip_code" varchar(20),
	"telephone" varchar(50),
	"fax_no" varchar(50),
	"ean_location_code" varchar(50),
	"ship_to_code" varchar(20),
	"usage_code" varchar(10),
	"product_table" varchar(50),
	"local_name" varchar(100),
	"branch_code" varchar(50),
	"tax_id" varchar(50),
	"branch_short_name" varchar(100),
	"signature" varchar(10),
	"doc_ref_pttrm" varchar(100),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"ean_location_code" varchar(100),
	"company_name" varchar(255),
	"customer_code" varchar(50) PRIMARY KEY NOT NULL,
	"short_name" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "prodcode" (
	"ean_product_code" varchar(50),
	"product_description" varchar(255),
	"id" varchar(50) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"phone" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;