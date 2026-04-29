// @/app/edi.ts
export type ViewMode = "list" | "add" | "grid";
export type TabType = "address" | "customer" | "product" | "users" | "import" | "staging" | "po-preprint" | "abnormal-data" | "processed-data" | "product-mapping";
export type SlideBarTab = TabType;
export type DashboardTab = TabType;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role?: "admin" | "staff" | "user";
  image?: string | null;
}

export interface Customer {
  customer_code: string;
  ean_location_code?: string | null;
  company_name?: string | null;
  short_name?: string | null;
}

export interface Product {
  ean_product_code: string; 
  internal_product_code?: string | null;
  product_description?: string | null;
}

export interface Address {
  customer_no: string;
  ean_location_code?: string | null;
  company_name?: string | null;
  local_name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;      
  zip_code?: string | null;  
  telephone?: string | null;
  fax_no?: string | null;
  branch_code?: string | null;
  branch_short_name?: string | null;
  tax_id?: string | null;
  ship_to_code?: string | null;
  usage_code?: string | null;
  product_table?: string | null;
  signature?: string | null;
  doc_ref_pttrm?: string | null;
}

export type MasterData = Customer | Product | Address;