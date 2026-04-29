import { customer, custAddress, prodcode } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";
import iconv from "iconv-lite";

/* =========================
    🛡️ Strong Typing System
========================= */

export type DBCustomer = InferSelectModel<typeof customer>;
export type DBAddress = InferSelectModel<typeof custAddress>;
export type DBProduct = InferSelectModel<typeof prodcode>;

/**
 * 🛡️ รวมทุก Type ของข้อมูล Master Data
 */
export type AllDBModels = DBCustomer | DBAddress | DBProduct;

export interface EDIField<T> {
  // ใช้ keyof T เพื่อให้ key ต้องตรงกับ Property ใน Model เท่านั้น (หรือ key พิเศษที่เกิดจาก mapRow)
  key: keyof T | string;
  len: number;
  default?: string;
  required?: boolean;
}

export type MappedEDIRow = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

export interface EDIConfig<T> {
  fileName: string;
  header: string;
  fields: EDIField<T | MappedEDIRow>[]; // รองรับทั้ง field จาก DB และ field ที่เราคำนวณใหม่
  trailingPipe: boolean;
  mapRow?: (row: T) => MappedEDIRow;
}

/* =========================
    🏭 Business Logic Handlers
========================= */

/**
 * ฟังก์ชันจับคู่ชื่อ String กับ Drizzle Table Schema
 * ช่วยให้ API เรียกใช้ Table ได้ถูกต้องตาม Type เสมอ
 * 
 * @param tableName - ชื่อตารางที่ต้องการดึง Schema (customer, address, prodcode)
 * @returns {PgTable | null} Schema ของตารางบน Drizzle ORM
 */
export function getTableSchema(tableName: string) {
  if (tableName === "customer") return customer;
  if (tableName === "address") return custAddress;
  if (tableName === "prodcode") return prodcode;
  return null;
}

/* =========================
    🧠 Core Utilities
========================= */

/**
 * ล้างข้อความเพื่อไม่ให้ส่งผลกระทบต่อโครงสร้างไฟล์ EDI
 * 
 * @param input - ข้อความต้นฉบับ
 * @returns {string} ข้อความที่ถูกแปลง Pipe เป็น Space และลบอักขระควบคุม (ยกเว้น Tab) ออก
 */
function sanitize(input: string): string {
  return input
    .replace(/\|/g, " ") // เปลี่ยน Pipe เป็น Space เพื่อไม่ให้โครงสร้างไฟล์เบี้ยว
    // ลบอักขระควบคุม (0x00-0x1F) แต่ "ละเว้น" Tab (0x09) ไว้
    .replace(/[\u0000-\u0008\u000B-\u001F]/g, "");
  // ห้ามมี .trim() และ ห้ามเปลี่ยน \t เป็น space ตรงนี้เด็ดขาดเพราะมีผลต่อไฟล์ EDI
}

/**
 * คืนค่าความยาวไบต์ของ String ตามมาตรฐานการเข้ารหัส Windows-874 (ภาษาไทย)
 * 
 * @param str - ข้อความที่ต้องการเข้ารหัส
 * @returns {number} จำนวนไบต์ (Bytes length) ของข้อความ
 */
function getByteLength(str: string): number {
  return iconv.encode(str, "win874").length;
}

/**
 * ตัดความยาวสตริงโดยคำนวณจากจำนวนไบต์ ป้องกันการตัดผิดพลาดในภาษาไทย
 * 
 * @param str - ข้อความที่ต้องการตัดความยาว
 * @param maxBytes - จำนวนไบต์สูงสุดที่ยอมรับได้
 * @returns {string} สตริงที่ถูกตัดตามจำนวนไบต์ที่ระบุ
 */
function safeTruncate(str: string, maxBytes: number): string {
  let result = "";
  for (const char of str) {
    const next = result + char;
    if (getByteLength(next) > maxBytes) break;
    result = next;
  }
  return result;
}

/**
 * จัดรูปแบบและปรับความยาวข้อความให้คงที่เสมอสำหรับ EDI File
 * 
 * @param text - ข้อความต้นฉบับ
 * @param length - ความยาว (จำนวนตัวอักษร) ที่ต้องการ
 * @param defaultValue - ค่าเริ่มต้นในกรณีที่ text เป็น null หรือ undefined
 * @returns {string} ข้อความที่ผ่านการล้างข้อมูล ตัดทอน และถูกจัดพื้นที่ให้ได้ความยาวคงที่ตามที่กำหนด
 */
export function pad(text: unknown, length: number, defaultValue = ""): string {
  // 1. แปลงเป็น String และจัดการค่า null
  const value = text instanceof Date ? text.toISOString() : (text ?? defaultValue).toString();

  // 2. ลบ Space ซ้ายขวาที่เป็นส่วนเกินก่อนเสมอ (ยกเว้นกรณีมี Tab \t เพื่อรักษา Logic พิเศษ)
  const cleanedValue = value.includes("\t") ? value : value.trim();

  // 3. ทำการ Sanitize ล้างค่า Pipe หรืออักขระพิเศษ
  const sanitized = sanitize(cleanedValue);

  // 4. ตัดข้อความถ้าขนาดเกิน (เทียบเป็น win-874 byte) และเติม Space ว่างให้ครบจำนวน (padEnd)
  const truncated = safeTruncate(sanitized, length);

  return truncated.padEnd(length, " ");
}

/* =========================
    ⚙️ EDI Configurations
========================= */

/**
 * 🛡️ สร้าง Helper เพื่อบังคับ Type ให้เป๊ะโดยไม่ต้องพึ่ง any
 */
const createConfig = <T,>(config: EDIConfig<T>): EDIConfig<T> => config;

export const EDI_CONFIGS = {
  customer: createConfig<DBCustomer>({
    fileName: "CUST.TAB",
    header: "##1\r\n#EAN Location Code,0,13,0\r\n#Company Name,0,50,0\r\n#Customer Code,0,25,0\r\n#Short Name,0,10,0\r\n#\r\n",
    fields: [
      { key: "ean_location_code", len: 13 },
      { key: "company_name", len: 50 },
      { key: "customer_code", len: 25 },
      { key: "short_name", len: 10 },
    ],
    trailingPipe: false,
    mapRow: (row) => {
      let shortName = row.short_name || "";

      // 🚩 ดักจับ Trap: ถ้าเป็น WIN ให้ใส่ Tab ตามต้นฉบับเป๊ะๆ
      // หมายเหตุ: ต้องมั่นใจว่าในฟังก์ชัน sanitize ไม่ได้สั่งลบ \t ออกนะคะ
      if (shortName.trim() === "WIN") {
        shortName = "WIN \t"; // ตัวอักษร 3 + Space 1 + Tab 1 = 5 Byte (ที่เหลือฟังก์ชัน pad จะเติม Space ให้ครบ 10)
      }

      return { ...row, short_name: shortName };
    }
  }),

  address: createConfig<typeof custAddress.$inferSelect>({
    fileName: "Address.tab",
header: "##1\r\n#EAN Location code     13\r\n#Company Name          50\r\n#Address1              50\r\n#Address2              50\r\n#City(20)+Zipcode(5)   25\r\n#Telephone No.         16\r\n#Fax No.               13\r\n#Customer No.          10\r\n#Ship to Code          4 \r\n#Usage Code            1 \r\n#Product table         10\r\n#Local name            10\r\n#branch code           20\r\n#Tax ID                50\r\n#Branch short name     30\r\n#Signature             1 \r\n#DocRef PTTRM          20\r\n###\r\n",    fields: [
      { key: "ean_location_code", len: 13 },
      { key: "company_name", len: 50 },
      { key: "address1", len: 50 },
      { key: "address2", len: 50 },
      { key: "city_zip", len: 25 },
      { key: "telephone", len: 16 },
      { key: "fax_no", len: 13 },
      { key: "customer_no", len: 10 },
      { key: "ship_to_code", len: 4 },
      { key: "usage_code", len: 1, default: " " },
      { key: "product_table", len: 10 },
      { key: "local_name", len: 10 },
      { key: "branch_code", len: 20 },
      { key: "tax_id", len: 50 },
      { key: "branch_short_name", len: 30 },
      { key: "signature", len: 1, default: " " },
      { key: "doc_ref_pttrm", len: 20 },
    ],
    trailingPipe: true,
    mapRow: (row) => {
      // 1. ดึงค่าและจัดการช่องว่างให้เกลี้ยงก่อนปรุง
      const city = (row.city || "").trim();
      const zip = (row.zip_code || "").trim();
      
      // ใช้สูตรของปัง: รวมร่าง City(20) + Zip(5)
      const city_zip = city.padEnd(20, ' ').slice(0, 20) + 
                       zip.padEnd(5, ' ').slice(0, 5);

      let ean = (row.ean_location_code || "").trim();
      const rawCustNo = (row.customer_no || "").trim();
      
      let finalCustNo = rawCustNo;
      let branchCode = (row.branch_code || "").trim();
      let localName = (row.local_name || "").trim();

      // 2. Logic "เลขครบ" ของกัปตันปัง (รักษาไว้เป๊ะๆ)
      if (!ean && rawCustNo) {
        ean = /^\d+$/.test(rawCustNo) 
              ? rawCustNo.padStart(4, '0') 
              : rawCustNo;
      }

      const isSevenCase = branchCode === "SEVEN" || 
                          ["5", "6", "7"].includes(rawCustNo) || 
                          rawCustNo.startsWith("WM");

      if (isSevenCase) {
        if (!localName) localName = "SEVEN";
        finalCustNo = ""; 
        branchCode = "";
      }

      // 🚩 3. หัวใจของการลดขนาดไฟล์: ส่งกลับเฉพาะสิ่งที่ต้องใช้เขียนไฟล์
      return { 
        ean_location_code: ean,
        company_name: (row.company_name || "").trim(),
        address1: (row.address1 || "").trim(),
        address2: (row.address2 || "").trim(),
        city_zip: city_zip,
        telephone: (row.telephone || "").trim(),
        fax_no: (row.fax_no || "").trim(),
        customer_no: finalCustNo,
        ship_to_code: (row.ship_to_code || "").trim(),
        usage_code: (row.usage_code || "").trim(),
        product_table: (row.product_table || "").trim(),
        local_name: localName,
        branch_code: branchCode,
        tax_id: (row.tax_id || "").trim(),
        branch_short_name: (row.branch_short_name || "").trim(),
        signature: (row.signature || "").trim(),
        doc_ref_pttrm: (row.doc_ref_pttrm || "").trim()
      };
    }
}),

  prodcode: createConfig<DBProduct>({
    fileName: "prodcode.Tab",
    header: "##1\r\n#EAN Product Code,0,15,0\r\n#Product Description,0,35,0\r\n#Internal Product Code,0,25,0\r\n#\r\n",
    fields: [
      { key: "ean_product_code", len: 15 },
      { key: "product_description", len: 35 },
      { key: "product_code", len: 25 },
    ],
    trailingPipe: false,
  }),
} as const; // ใช้ as const เพื่อให้ TS รู้ว่า key มีแค่ customer, address, prodcode

/* =========================
    🏭 Business Logic Handlers
========================= */

/**
 * ตรวจสอบความถูกต้องของข้อมูล Master Data (เช่น Field code ต้องไม่ว่าง)
 * 
 * @param rows - ชุดข้อมูลที่ต้องการตรวจสอบ
 * @param config - การตั้งค่าความยาวและโครงสร้างฟิลด์สำหรับ EDI แต่ละประเภท
 * @returns {string[]} อาร์เรย์ของข้อผิดพลาด (ถ้าพบ)
 */
export function validateMasterData<T>(rows: T[], config: EDIConfig<T>): string[] {
  const errors: string[] = [];
  rows.forEach((row, idx) => {
    const data = row as Record<string, unknown>;
    config.fields.forEach(field => {
      const fieldKey = field.key as string;
      const val = data[fieldKey];
      if ((fieldKey.includes('code') || fieldKey.includes('no')) && !val) {
        errors.push(`Row ${idx + 1}: Field '${fieldKey}' is missing.`);
      }
    });
  });
  return errors;
}

/**
 * สร้างเนื้อหาไฟล์ EDI ตามโครงสร้าง (Header + Body แบบมี Pipe คั่น)
 * 
 * @param config - โครงสร้าง Configuration สำหรับไฟล์แบบกดยืนยัน (Master Content)
 * @param rows - ชุดข้อมูลที่จะถูกแปลงเป็น Text EDI
 * @returns {string} เนื้อหาไฟล์ทั้งหมดเพื่อเตรียมใช้ Download
 */
export function generateEDIContent<T>(config: EDIConfig<T>, rows: T[]): string {
  const body = rows.map((row) => {
    const data = config.mapRow ? config.mapRow(row) : (row as unknown as MappedEDIRow);
    const dataTyped = data as Record<string, unknown>;

    let line = "|"; // เริ่มต้นแต่ละบรรทัดด้วย Pipe ในไฟล์ EDI

    config.fields.forEach((f, index) => {
      const val = dataTyped[f.key as string];
      line += pad(val, f.len, f.default); // เติมข้อมูลให้มีความยาวคงที่

      // เพิ่ม Pipe คั่นระหว่างฟิลด์ (ฟิลด์สุดท้ายไม่ต้องใส่ ถ้า trailingPipe = false)
      if (index < config.fields.length - 1) {
        line += "|";
      }
    });

    // ตรวจสอบกฎการมี Trailing Pipe ท้ายบรรทัดสำหรับบางไฟล์
    if (config.trailingPipe) {
      line += "|";
    }

    return `${line}\r\n`;
  }).join("");

  return config.header + body;
}

/**
 * สร้างเนื้อหาไฟล์ CSV แบบมาตรฐาน
 * 
 * @param config - โครงสร้าง Configuration ฟิลด์ที่จะใช้คั่น
 * @param rows - ชุดข้อมูล
 * @returns {string} รูปแบบไฟล์ CSV (คั่นด้วย Comma และล้อมข้อมูลด้วยเครื่องหมายคำพูด)
 */
export function generateCSVContent<T>(config: EDIConfig<T>, rows: T[]): string {
  return rows.map((row) => {
    const data = config.mapRow ? config.mapRow(row) : (row as unknown as MappedEDIRow);
    const dataTyped = data as Record<string, unknown>;

    return config.fields.map(f => {
      const rawVal = dataTyped[f.key as string];
      const val = rawVal instanceof Date ? rawVal.toISOString() : String(rawVal || f.default || "");
      // ซ้อนฟันหนูในข้อมูล (Double quote escape) ให้เป็น CSV-safe
      return `"${val.trim().replace(/"/g, '""')}"`;
    }).join(",");
  }).join("\r\n");
}