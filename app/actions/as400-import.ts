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
  prodcode 
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, and, sql } from "drizzle-orm";
import { parseEDIFileDelphi } from "@/services/edi-parser";


// --- Interfaces ---
interface ImportResult {
  success: boolean;
  message: string;
  filesProcessed?: number;
  errors?: string[];
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

export async function uploadAS400FilesAction(formData: FormData): Promise<ImportResult> {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    const files = formData.getAll("files") as File[];

    if (!fs.existsSync(STAGING_PATH)) {
      fs.mkdirSync(STAGING_PATH, { recursive: true });
    }

    let count = 0;
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(STAGING_PATH, file.name);
      fs.writeFileSync(filePath, buffer);
      count++;
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
      e.isFile() && (e.name.toLowerCase().endsWith(".txt") || e.name.toLowerCase().endsWith(".tab") )
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
    const result = await parseEDIFileDelphi(fileBuffer, fileName, shouldClear);

    if (!result.success) {
      return { success: false, message: `ประมวลผลไม่สำเร็จ: ${(result as any).error || ""}` };
    }

    const hCount = (result as any).headerCount ?? 0;
    const dCount = (result as any).detailCount ?? 0;

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
    } catch (err) { 
      console.error("[Move Error]", err); 
    }

    revalidatePath("/");
    return { success: true, message: `ไฟล์ ${fileName} นำเข้าสำเร็จ! (H:${hCount}, D:${dCount})` };

  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

export async function getEDLByHeadersAction(items: { customerPo: string; fileName: string }[]) {
  if (items.length === 0) return [];

  const results: any[] = [];
  // ใช้ Set เพื่อจำกัด ID ที่ดึงมาแล้ว ป้องกันอาการ "เบิ้ล" ในหน้า UI
  const processedIds = new Set<number>();

  try {
    for (const item of items) {
      const details = await db.select({
        id: EDL_temp.id,
        customerPo: EDL_temp.Customer_PO,
        customerNum: EDH_temp.Customer_Num,
        seqNum: EDL_temp.Line_Num,
        eanNum: sql<string>`COALESCE(${prodcode.ean_product_code}, ${EDL_temp.Bar_Code_Item})`,
        productName: sql<string>`COALESCE(${prodcode.product_description}, ${EDL_temp.Product_Name})`,
        orderQty: EDL_temp.Qty_Order,
        unitPrice: EDL_temp.Price_Unit,
        fileName: EDL_temp.File_Name,
        unitMeasure: sql<string>`'CN'`, 
        packSize: sql<string>`'CN'`,    
        buyerProdCode: customer.customer_code,
        vendorProdCode: EDL_temp.Item_Num,
        freeQty: EDL_temp.Free_Qty,
        discount1: EDL_temp.Discount_1,
        discount2: EDL_temp.Discount_2,
        discount3: EDL_temp.Discount_3,
        totalAmount: EDL_temp.Total_Amount,
      })
      .from(EDL_temp)
      .innerJoin(EDH_temp, and(
        eq(EDL_temp.Customer_PO, EDH_temp.Customer_PO),
        eq(EDL_temp.File_Name, EDH_temp.File_Name)
      ))
      .leftJoin(customer, sql`TRIM(${EDH_temp.Customer_Num}) = TRIM(${customer.customer_code})`)
      .leftJoin(prodcode, sql`TRIM(${EDL_temp.Bar_Code_Item}) = TRIM(${prodcode.ean_product_code})`)
      .where(and(
        eq(EDL_temp.Customer_PO, item.customerPo),
        eq(EDL_temp.File_Name, item.fileName)
      ));

      for (const d of details) {
        if (!processedIds.has(d.id)) {
          results.push(d);
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

      shortName: sql<string>`COALESCE(${customer.short_name}, ${EDH_temp.Customer_Num})`,    
      buyerName: sql<string>`COALESCE(${customer.customer_code}, ${EDH_temp.Customer_Num})`, 
      customerName: sql<string>`COALESCE(${customer.company_name}, 'ไม่พบข้อมูลใน Master')`, 
      
      datePo: EDH_temp.Date_PO,
      dateShip: EDH_temp.Date_Ship,
      totalAmount: EDH_temp.Total_Amount,
      fileName: EDH_temp.File_Name,
      as400Status: sql<boolean>`false`,
      createdAt: EDH_temp.Created_At,
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
        return isFile && (name.endsWith(".txt") || name.endsWith(".tab"));
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
  return await db.query.rawFileArchives.findMany({
    orderBy: (rf, { desc }) => [desc(rf.uploadedAt)]
  });
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