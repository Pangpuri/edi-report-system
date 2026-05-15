"use server";

import fs from "fs";
import path from "path";
import { db } from "@/db";
import { 
  EDH_temp, 
  EDL_temp, 
  branches, 
  systemConfigs, 
  importLogs, 
  rawFileArchives, 
  customer, 
  prodcode,
  TEDH,
  Edit_Detail
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, and, sql } from "drizzle-orm";
import { parseEDIFileDelphi } from "@/services/edi-parser";
import { Fragment } from "react/jsx-runtime";


// --- Interfaces ---
interface ImportResult {
  success: boolean;
  message?: string;
  headerCount?: number;
  detailCount?: number;
  filesProcessed?: number;
  errors?: string[];
  error?: string;
}

interface StagingConfig {
  path: string;
}

async function getStagingConfig(): Promise<StagingConfig> {
  const config = await db.query.systemConfigs.findFirst({
    where: eq(systemConfigs.configKey, "STAGING_PATH"),
  });

  return {
    path: config?.configValue || "C:\\EDI_Staging_Area"
  };
}

export interface EDLDetail {
  id: number;
  customerPo: string | null;
  customerNum: string | null;
  seqNum: string | null;
  Bar_Code_Item: string;
  productName: string;
  orderQty: string | number | null; // เผื่อไว้ก่อนเพราะ Database มักส่งมาเป็น string
  unitPrice: string | number | null;
  fileName: string | null;
  unitMeasure: string | null;
  packSize: string;
  buyerProdCode: string;
  vendorProdCode: string | null;
  freeQty: string | number | null;
  discount1: string | number | null;
  discount2: string | number | null;
  discount3: string | number | null;
  netAmount: string | number | null;
  isProductValid?: boolean;
  isAutoCorrected?: boolean;
  // เพิ่มฟิลด์สำหรับแสดงข้อมูลที่จะเปลี่ยน
  changeItem?: string | null;
  changeProdName?: string | null;
  checkBarInt?: string | null;
}

export async function uploadAS400FilesAction(formData: FormData): Promise<ImportResult> {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    const files = formData.getAll("files") as File[];

    if (!fs.existsSync(STAGING_PATH)) {
      fs.mkdirSync(STAGING_PATH, { recursive: true });
    }

    let count = 0;
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".txt")) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(STAGING_PATH, file.name);
      fs.writeFileSync(filePath, buffer);
      count++;
    }

    if (count === 0 && files.length > 0) {
      return { success: false, message: "ไม่มีไฟล์ .TXT ที่ถูกต้องสำหรับการอัปโหลด" };
    }

    return { success: true, message: `อัปโหลด ${count} ไฟล์เข้า Staging สำเร็จ` };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `อัปโหลดไม่สำเร็จ: ${err.message}` };
  }
}

export async function clearStagingAction(): Promise<ImportResult> {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    if (!fs.existsSync(STAGING_PATH)) return { success: true, message: "Staging ว่างอยู่แล้ว" };

    const files = fs.readdirSync(STAGING_PATH);
    for (const file of files) {
      const filePath = path.join(STAGING_PATH, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
    revalidatePath("/");
    return { success: true, message: "ล้างข้อมูล Staging สำเร็จ" };
  } catch (error: unknown) {
    return { success: false, message: "ไม่สามารถล้างข้อมูลได้" };
  }
}

export async function fetchBranchFilesAction(branchId: number): Promise<ImportResult> {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId)
    });

    if (!branch || !branch.sourcePath) {
      return { success: false, message: "ไม่พบข้อมูลสาขาหรือเส้นทางต้นทาง" };
    }

    if (!fs.existsSync(STAGING_PATH)) fs.mkdirSync(STAGING_PATH, { recursive: true });

    const sourcePath = branch.sourcePath;
    if (!fs.existsSync(sourcePath)) {
      return { success: false, message: `ไม่สามารถเข้าถึงเส้นทาง: ${sourcePath}` };
    }

    const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
    const targetFiles = entries.filter(e => 
      e.isFile() && e.name.toLowerCase().endsWith(".txt")
    );

    let fetchedCount = 0;
    for (const entry of targetFiles) {
      const fullSourcePath = path.join(sourcePath, entry.name);
      const destPath = path.join(STAGING_PATH, entry.name);
      try {
        fs.copyFileSync(fullSourcePath, destPath);
        fetchedCount++;
        await db.insert(importLogs).values({
          branchId: branch.id,
          fileName: entry.name,
          status: "fetched",
          message: "Fetched to staging area"
        });
      } catch (err) {
        console.error(`Error fetching ${entry.name}:`, err);
      }
    }

    return { success: true, message: `ดึงไฟล์จากสาขา ${branch.branchName} สำเร็จ ${fetchedCount} ไฟล์` };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `Fetch ผิดพลาด: ${err.message}` };
  }
}

export async function clearTempTablesAction() {
  try {
    await db.delete(EDH_temp);
    await db.delete(EDL_temp);
    revalidatePath("/");
    return { success: true, message: "ล้างตารางชั่วคราวสำเร็จ" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

export async function processImportAS400(fileName: string, branchId?: number, shouldClear: boolean = true): Promise<ImportResult> {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    const filePath = path.join(STAGING_PATH, fileName);
    

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `ไม่พบไฟล์: ${fileName}` };
    }

    const fileBuffer = fs.readFileSync(filePath);
    const result: ImportResult = await parseEDIFileDelphi(fileBuffer, fileName, shouldClear);

    if (!result.success) {
  return { success: false, message: `ประมวลผลไม่สำเร็จ: ${result.error || ""}` };
}

const hCount = result.headerCount ?? 0;
const dCount = result.detailCount ?? 0;
    if (branchId) {
      await db.insert(importLogs).values({
        branchId: branchId,
        fileName: fileName,
        status: "imported",
        message: `นำเข้าสำเร็จ H=${hCount} D=${dCount}`,
      });
    }

    try {
      const archiveDir = path.join(STAGING_PATH, "Archive");
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      const archivePath = path.join(archiveDir, fileName);
      if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
      fs.renameSync(filePath, archivePath);

      // เก็บประวัติไฟล์ดิบลงฐานข้อมูล
      const stats = fs.statSync(archivePath);
      await db.insert(rawFileArchives).values({
        fileName: fileName,
        originalName: fileName,
        fileSize: stats.size,
        storagePath: archivePath,
        branchId: branchId || null,
        uploadedAt: new Date(),
      });
    } catch (err) { 
      console.error("[Move/Archive Error]", err); 
    }

    revalidatePath("/");
    return { success: true, message: `ไฟล์ ${fileName} นำเข้าสำเร็จ! (H:${hCount}, D:${dCount})` };

  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

export async function getEDLByHeadersAction(items: { customerPo: string; fileName: string }[]): Promise<EDLDetail[]> {
  if (items.length === 0) return [];

  const results: EDLDetail[] = [];
  const processedIds = new Set<number>();

  try {
    for (const item of items) {
      const details = await db.select({
        id: EDL_temp.id,
        customerPo: EDL_temp.Customer_PO,
        customerNum: EDL_temp.Customer_Num,
        seqNum: EDL_temp.Line_Num,
        // ยึดบาร์โค้ดจากไฟล์เป็นหลัก (ตามที่คุณแจ้ง)
        Bar_Code_Item: sql<string>`COALESCE(NULLIF(TRIM(${EDL_temp.Bar_Code_Item}), ''), NULLIF(TRIM(${prodcode.ean_product_code}), ''), '-')`,
        productName: sql<string>`COALESCE(NULLIF(TRIM(${prodcode.product_description}), ''), NULLIF(TRIM(${EDL_temp.Product_Name}), ''), 'ไม่พบชื่อสินค้า')`,
        orderQty: EDL_temp.Qty_Order,
        unitPrice: EDL_temp.Price_Unit,
        fileName: EDL_temp.File_Name,
        unitMeasure: EDL_temp.Unit_Measure, 
        packSize: sql<string>`'CN'`,    
        buyerProdCode: sql<string>`COALESCE(NULLIF(TRIM(${customer.customer_code}), ''), '-')`,
        vendorProdCode: EDL_temp.Item_Num,
        freeQty: EDL_temp.Free_Qty,
        discount1: EDL_temp.Discount_1,
        discount2: EDL_temp.Discount_2,
        discount3: EDL_temp.Discount_3,
        netAmount: EDL_temp.Net_Amount,
        // สินค้าถูกต้องถ้าเจอบาร์โค้ดใน Master Data หรือในตารางสินค้าเปลี่ยนรหัส
        isProductValid: sql<boolean>`(${prodcode.id} IS NOT NULL OR ${Edit_Detail.id} IS NOT NULL)`,
        isAutoCorrected: sql<boolean>`false`,
        // ข้อมูลการเปลี่ยนรหัส (Mapping จาก Edit_Detail โดยใช้บาร์โค้ดเป็นตัวเชื่อม)
        changeItem: Edit_Detail.Internal_Code2,
        changeProdName: Edit_Detail.Prod_Name2,
        checkBarInt: Edit_Detail.BarCode,
        checkNameOldProd: EDL_temp.Product_Name,
      })
      .from(EDL_temp)
      // เปลี่ยนมา Join ด้วย Barcode ตามเงื่อนไข
      .leftJoin(prodcode, sql`TRIM(${EDL_temp.Bar_Code_Item}) = TRIM(${prodcode.ean_product_code})`)
      .leftJoin(customer, sql`TRIM(${EDL_temp.Customer_Num}) = TRIM(${customer.customer_code})`)
      // Join กับตารางสินค้าที่ต้องเปลี่ยนรหัส (Edit_Detail) 
      // เพิ่มความยืดหยุ่น: Match ด้วย Barcode หรือ Internal_Code1 และเช็คลูกค้าให้กว้างขึ้น
      .leftJoin(Edit_Detail, and(
        sql`(TRIM(${EDL_temp.Bar_Code_Item}) = TRIM(${Edit_Detail.BarCode}) OR LTRIM(TRIM(${EDL_temp.Item_Num}), '0') = LTRIM(TRIM(${Edit_Detail.Internal_Code1}), '0'))`,
        sql`(${Edit_Detail.Cus_Code} IS NULL OR TRIM(${Edit_Detail.Cus_Code}) = TRIM(${EDL_temp.Customer_Num}) OR TRIM(${Edit_Detail.Cus_Code}) = TRIM(${customer.short_name}))`
      ))
      .where(and(
        eq(EDL_temp.Customer_PO, item.customerPo),
        eq(EDL_temp.File_Name, item.fileName)
      ));

      for (const d of details) {
        if (!processedIds.has(d.id)) {
          results.push(d as unknown as EDLDetail); 
          processedIds.add(d.id);
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error in getEDLByHeadersAction:", error);
    throw new Error("ไม่สามารถดึงข้อมูลรายละเอียดสินค้าได้");
  }
}

export async function getEDHData() {
  try {
    const results = await db.select({
      id: EDH_temp.id,
      hType: EDH_temp.H_Type,
      customerPo: EDH_temp.Customer_PO,
      customerNum: EDH_temp.Customer_Num, 

      shortName: sql<string>`COALESCE(NULLIF(TRIM(${customer.short_name}), ''), TRIM(${EDH_temp.Customer_Num}))`,    
      buyerName: sql<string>`COALESCE(NULLIF(TRIM(${customer.customer_code}), ''), TRIM(${EDH_temp.Customer_Num}))`, 
      customerName: sql<string>`COALESCE(NULLIF(TRIM(${customer.company_name}), ''), 'ไม่พบชื่อบริษัทในฐานข้อมูล')`, 
      
      datePo: EDH_temp.Date_PO,
      dateShip: EDH_temp.Date_Ship,
      totalAmount: EDH_temp.Total_Amount,
      fileName: EDH_temp.File_Name,
      as400Status: sql<boolean>`EXISTS (
        SELECT 1 FROM "EDH_record" h 
        WHERE TRIM(h."Customer_PO") = TRIM(${EDH_temp.Customer_PO})
      )`,
      isCustomerValid: sql<boolean>`${customer.customer_code} IS NOT NULL`,
      isAutoCorrected: sql<boolean>`false`,
      // ปรับปรุง logic: ต้องมีรายละเอียด (Details) และรายละเอียดทุกรายการต้องมีข้อมูลบาร์โค้ดใน prodcode หรือ Edit_Detail
      hasDetailError: sql<boolean>`NOT EXISTS (
        SELECT 1 FROM "EDL_tmp" edl
        WHERE edl."Customer_PO" = ${EDH_temp.Customer_PO} 
        AND edl."File_Name" = ${EDH_temp.File_Name}
      ) OR EXISTS (
        SELECT 1 FROM "EDL_tmp" edl
        LEFT JOIN "prodcode" p ON TRIM(edl."Bar_Code_Item") = TRIM(p."ean_product_code")
        LEFT JOIN "Edit_Detail" e ON TRIM(edl."Bar_Code_Item") = TRIM(e."Bar_code")
        WHERE edl."Customer_PO" = ${EDH_temp.Customer_PO} 
        AND edl."File_Name" = ${EDH_temp.File_Name}
        AND p."id" IS NULL AND e."id" IS NULL
      )`,
      createdAt: EDH_temp.Created_At,
      createdAtDisplay: sql<string>`TO_CHAR(${EDH_temp.Created_At}, 'DD/MM/YYYY HH24:MI:SS')`,
    })
    .from(EDH_temp)
    .leftJoin(customer, sql`TRIM(${EDH_temp.Customer_Num}) = TRIM(${customer.customer_code})`)
    .orderBy(desc(EDH_temp.id));

    return results;
  } catch (error) {
    console.error("Error in getEDHData:", error);
    return [];
  }
}

export async function getStagingFilesAction() {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    if (!fs.existsSync(STAGING_PATH)) return [];
    const entries = fs.readdirSync(STAGING_PATH, { withFileTypes: true });
    return entries
      .filter(entry => {
        const isFile = entry.isFile();
        const name = entry.name.toLowerCase();
        return isFile && name.endsWith(".txt");
      })
      .map(entry => {
        const stats = fs.statSync(path.join(STAGING_PATH, entry.name));
        return { name: entry.name, size: stats.size, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch (error) {
    return [];
  }
}

export async function deleteAS400FileAction(fileName: string, branchId?: number) {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    const stagingPath = path.join(STAGING_PATH, fileName);
    if (fs.existsSync(stagingPath)) fs.unlinkSync(stagingPath);
    revalidatePath("/");
    return { success: true, message: "ลบไฟล์สำเร็จ" };
  } catch (error: unknown) {
    return { success: false, message: "เกิดข้อผิดพลาดในการลบไฟล์" };
  }
}

export async function getRawFileArchivesAction() {
  return await db.select({
    id: rawFileArchives.id,
    fileName: rawFileArchives.fileName,
    originalName: rawFileArchives.originalName,
    fileSize: rawFileArchives.fileSize,
    storagePath: rawFileArchives.storagePath,
    branchId: rawFileArchives.branchId,
    uploadedAt: rawFileArchives.uploadedAt,
    //อันนี้ต้อง + 7 ชั่วโมง เพื่อให้เวลาตรง
    uploadedAtDisplay: sql<string>`TO_CHAR(${rawFileArchives.uploadedAt} + interval '7 hours', 'DD/MM/YYYY HH24:MI:SS')`, 
  })
  .from(rawFileArchives)
  .orderBy(desc(rawFileArchives.uploadedAt));
}

export async function deleteRawArchiveAction(id: number) {
  try {
    const archive = await db.query.rawFileArchives.findFirst({
      where: eq(rawFileArchives.id, id)
    });
    if (archive) {
      if (fs.existsSync(archive.storagePath)) fs.unlinkSync(archive.storagePath);
      await db.delete(rawFileArchives).where(eq(rawFileArchives.id, id));
    }
    revalidatePath("/");
    return { success: true, message: "ลบประวัติไฟล์ถาวรสำเร็จ" };
  } catch (error: unknown) {
    return { success: false, message: "ลบไม่สำเร็จ" };
  }
}
