// services/parsers/base-parser.ts

export interface RawH {
  customerPo: string;
  orderDate: string;
  requestDate: string;
  vendorCode: string;
  rawTotalAmount: string;
}

export interface RawD {
  seqNum: string;        // 🌸 ลำดับ
  barcode: string;
  unitPrice: string;
  orderQty: string;
  buyerProdCode: string;
  rawProductName: string;
  rawNetAmount: string;
  packSize?: string;
  freeQty?: string;      // 🌸 แถม
  discountPct?: string;  // 🌸 ส่วนลด %
  discountAmt?: string;  // 🌸 ส่วนลด (บาท)
}

export interface RawL {
  seqNum: string;
  qty: string;
  barcode?: string;
}

export interface EDIParserModule {
  extractH(line: string, vendorCode: string): RawH;
  extractD(line: string, vendorCode: string): RawD | null;
  extractL?(line: string, vendorCode: string): RawL | null;
}
