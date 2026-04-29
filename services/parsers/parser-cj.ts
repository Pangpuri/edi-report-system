// services/parsers/parser-cj.ts
import { EDIParserModule, RawH, RawD, RawL } from "./base-parser";

/**
 * 🧡 CJ Parser (Legacy Interface)
 * พิกัดตามบรีฟใหม่ (0-based)
 */
export const CJParser: EDIParserModule = {
  extractH(line: string, vendorCode: string): RawH {
    return {
      customerPo: line.substring(2, 16).trim(),
      orderDate: line.substring(22, 30).trim(),
      requestDate: line.substring(30, 38).trim(),
      vendorCode: vendorCode,
      rawTotalAmount: line.substring(97, 110).trim()
    };
  },

  extractD(line: string, vendorCode: string): RawD | null {
    // พิกัดตามบรีฟ CJ (231086)
    return {
      seqNum: line.substring(22, 25).trim(),
      barcode: line.substring(80, 93).trim(),
      unitPrice: line.substring(102, 109).trim(),
      orderQty: line.substring(116, 123).trim(),
      buyerProdCode: line.substring(93, 102).trim(), // CNxxxxxxx
      rawProductName: line.substring(35, 80).trim(),
      rawNetAmount: line.substring(123, 133).trim(),
      freeQty: line.substring(109, 116).trim(),
      discountPct: line.substring(149, 154).trim(),
      discountAmt: line.substring(159, 174).trim(),
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
