// components/dashboard/import-data/types.ts

export interface StagingFile {
  name: string;
  size: number;
  mtime: Date;
}

export interface EDHData {
  id: number;
  hType: string | null;
  customerPo: string | null;
  customerNum: string | null;
  customerName: string | null;
  shortName: string | null;
  buyerName: string | null;
  datePo: string | null;
  dateShip: string | null;
  totalAmount: string | null;
  fileName: string | null;
  as400Status: boolean | null;
  as400ImportedAt: Date | null;
  isCustomerValid?: boolean;
  hasDetailError?: boolean;
  createdAt: Date | null;
  createdAtDisplay?: string | null;
}

export interface EDLData {
  id: number;
  dType: string | null;
  customerPo: string | null;
  customerNum: string | null;
  seqNum: string | null;
  Bar_Code_Item: string | null;
  productName: string | null;
  orderQty: string | number | null;
  unitPrice: string | number | null;
  fileName: string | null;
  unitMeasure: string | null;
  packSize: string | null;
  buyerProdCode: string | null;
  vendorProdCode: string | null;
  freeQty: string | number | null;
  discount1: string | number | null;
  discount2: string | number | null;
  discount3: string | number | null;
  netAmount: string | number | null;
  isProductValid?: boolean;
  checkBarInt: string | null;
  checkNameOldProd: string | null;
  changeItem: string | null;
  changeProdName: string | null;
}

export interface RawArchive {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number | null;
  storagePath: string;
  uploadedAt: Date | null;
  uploadedAtDisplay?: string | null;
}

export type TabType = "import" | "staging" | "data_view" | "archives";

export interface StagingDeleteTarget {
  type: "single" | "multiple";
  fileName?: string;
}
