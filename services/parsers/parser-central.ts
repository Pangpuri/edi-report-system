// services/parsers/parser-central.ts
import { EDIParserModule, RawH, RawD, RawL } from "./base-parser";

export const CentralParser: EDIParserModule = {
  extractH(line: string, vendorCode: string): RawH {
    const rawAmt = line.substring(97, 110).trim();
    return {
      customerPo: line.substring(1, 16).trim(),
      orderDate: line.substring(22, 30).trim(),
      requestDate: line.substring(30, 38).trim(),
      vendorCode: vendorCode,
      rawTotalAmount: rawAmt === "000000000000" ? "0" : rawAmt
    };
  },

  extractD(line: string, vendorCode: string): RawD | null {
    return {
      seqNum: line.substring(22, 25).trim(),
      barcode: line.substring(85, 98).trim(),
      unitPrice: line.substring(101, 108).trim(),
      orderQty: line.substring(108, 115).trim(),
      buyerProdCode: line.substring(25, 40).trim(),
      rawProductName: line.substring(40, 85).trim(),
      rawNetAmount: line.substring(122, 133).trim(),
      freeQty: "0",
      discountPct: "0",
      discountAmt: "0",
      packSize: "CN"
    };
  },

  extractL(line: string): RawL | null {
    return {
      seqNum: line.substring(18, 21).trim(),
      qty: line.substring(43, 58).trim()
    };
  }
};
