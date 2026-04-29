CREATE TABLE "EDH_tmp" (
	"id" serial PRIMARY KEY NOT NULL,
	"h_type" varchar(1),
	"customer_po" varchar(20),
	"customer_num" varchar(20),
	"date_po" varchar(8),
	"date_ship" varchar(8),
	"customer_name" varchar(100),
	"file_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "EDL_tmp" (
	"id" serial PRIMARY KEY NOT NULL,
	"d_type" varchar(1),
	"customer_po" varchar(20),
	"customer_num" varchar(20),
	"seq_num" varchar(5),
	"ean_num" varchar(20),
	"product_name" varchar(100),
	"location" varchar(20),
	"qty_order" numeric(10, 2),
	"price_unit" numeric(10, 2),
	"file_name" text,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"branch_code" varchar(20) NOT NULL,
	"ip_address" varchar(50),
	"source_path" text,
	"username" varchar(100),
	"password" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branches_branch_code_unique" UNIQUE("branch_code")
);
--> statement-breakpoint
CREATE TABLE "cust_address" (
	"id" text PRIMARY KEY NOT NULL,
	"ean_location_code" varchar(20),
	"company_name" varchar(100),
	"address1" text,
	"address2" text,
	"city" varchar(50),
	"zip_code" varchar(10),
	"telephone" varchar(50),
	"fax_no" varchar(50),
	"customer_no" varchar(50) NOT NULL,
	"ship_to_code" varchar(20),
	"usage_code" varchar(10),
	"product_table" varchar(50),
	"local_name" varchar(50),
	"branch_code" varchar(50),
	"tax_id" varchar(50),
	"branch_short_name" varchar(100),
	"signature" varchar(10),
	"doc_ref_pttrm" varchar(100),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"ean_location_code" varchar(20),
	"company_name" varchar(100),
	"customer_code" varchar(50) PRIMARY KEY NOT NULL,
	"short_name" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "import_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"file_name" text NOT NULL,
	"status" varchar(20),
	"message" text,
	"processed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prodcode" (
	"ean_product_code" varchar(20) PRIMARY KEY NOT NULL,
	"product_description" varchar(255),
	"internal_product_code" varchar(50)
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
CREATE TABLE "system_configs" (
	"config_key" varchar(50) PRIMARY KEY NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now()
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
	"password" text,
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;