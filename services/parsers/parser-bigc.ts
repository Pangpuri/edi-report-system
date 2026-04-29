// services/parsers/parser-bigc.ts
import { EDIParserModule, RawH, RawD, RawL } from "./base-parser";

export const BigCParser: EDIParserModule = {
  extractH(line: string, vendorCode: string): RawH {
    // 🌟 ยอดเงินรวม: ล็อคพิกัด Index 100 ถึง 110 (1-based [100, 110] -> JS [99, 110])
    // แต่จากคำสั่งกัปตัน "Index 100 ถึง 110" เราจะใช้พิกัดนี้ตรงๆ
    const rawAmt = line.substring(99, 110).trim();

    return {
      customerPo: line.substring(1, 16).trim(),
      orderDate: line.substring(22, 30).trim(),
      requestDate: line.substring(30, 38).trim(),
      vendorCode: vendorCode,
      rawTotalAmount: rawAmt
    };
  },

  extractD(line: string, vendorCode: string): RawD | null {
    const cnIndex = line.lastIndexOf("CN");
    if (cnIndex === -1) return null;

    try {
      // 🌟 1. หาจุดยึด (Anchor) วันที่ 16 หลัก
      const dateMatch = line.match(/\d{16}/);
      if (!dateMatch || dateMatch.index === undefined) return null; 
      const anchor = dateMatch.index;

      // 🌟 2. หั่น Block ถอยหลังตามสูตรกัปตันปัง (Strict Rule)
      const rawNetAmount = line.substring(anchor - 9, anchor);     // 9 หลักหน้าวันที่
      const rawQty = line.substring(anchor - 16, anchor - 9);      // 7 หลักหน้ายอดรวม
      const rawPrice = line.substring(anchor - 23, anchor - 16);    // 7 หลักหน้าจำนวน

      // 🌟 3. แงะรหัสผู้ผลิต (หลัง CN จนถึงจุดเริ่มราคา)
      const buyerProdCodeRaw = line.substring(cnIndex + 2, anchor - 23).trim();

      // 🌟 4. แงะบาร์โค้ด (885 หน้าคำว่า CN)
      const beforeCN = line.substring(0, cnIndex);
      const barcodeMatch = beforeCN.match(/885\d{10}/);
      const barcode = barcodeMatch ? barcodeMatch[0] : "";

      // 🌟 5. แงะฟิลด์หลังวันที่ (Free Qty, Discounts)
      const dateEndIdx = anchor + 16;
      const freeQtyRaw = line.substring(dateEndIdx, dateEndIdx + 7).trim();
      const discPctRaw = line.substring(dateEndIdx + 7, dateEndIdx + 12).trim();
      const discAmtRaw = line.substring(dateEndIdx + 12, dateEndIdx + 23).trim();

      return {
        seqNum: line.substring(22, 25).trim(),
        barcode: barcode,
        unitPrice: rawPrice.trim(),
        orderQty: rawQty.trim(),
        buyerProdCode: buyerProdCodeRaw,
        rawProductName: line.substring(53, 90).trim(), // รายการจากไฟล์ [53, 90]
        rawNetAmount: rawNetAmount.trim(),
        freeQty: freeQtyRaw,
        discountPct: discPctRaw,
        discountAmt: discAmtRaw,
        packSize: "CN"
      };
    } catch (e) {
      return null;
    }
  },

  extractL(line: string): RawL | null {
    return {
      seqNum: line.substring(18, 21).trim(),
      qty: line.substring(43, 58).trim(),
      barcode: line.substring(21, 35).replace(/[^\d]/g, "").trim()
    };
  }
};
