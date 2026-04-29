"use server";

import fs from "fs";
import path from "path";
import { db } from "@/db";
import { EDH_tmp, EDL_tmp, branches, systemConfigs, importLogs, rawFileArchives, customer } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, and, sql } from "drizzle-orm";
import { parseEDIFileDelphi } from "@/services/edi-parser"; // 🔥 ใช้ตัวใหม่ที่แยกลอจิกจาก Delphi
import { getAS400LogsByHistoryIds } from "./as400-actions";

// --- Permanent Archive Path ---
const PERMANENT_ARCHIVE_PATH = "C:\\EDI_Archive_Permanent";

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

/**
 * ดึงค่า Staging Path จาก Database หรือใช้ Default
 */
async function getStagingConfig(): Promise<StagingConfig> {
  const config = await db.query.systemConfigs.findFirst({
    where: eq(systemConfigs.configKey, "STAGING_PATH"),
  });
  
  return {
    path: config?.configValue || "C:\\EDI_Staging_Area"
  };
}

/**
 * อัปโหลดไฟล์จาก Client มายังเครื่อง Server (Staging Area)
 */
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

/**
 * ล้างไฟล์ทั้งหมดใน Staging Area
 */
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

/**
 * สแกนและดึงไฟล์จากสาขามาที่ Staging Area (Dynamic Branch)
 */
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
      e.isFile() && (e.name.toLowerCase().endsWith(".txt") || e.name.toLowerCase().endsWith(".tab"))
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

/**
 * ล้างข้อมูลในตารางชั่วคราว
 */
export async function clearTempTablesAction() {
  try {
    await db.delete(EDH_tmp);
    await db.delete(EDL_tmp);
    revalidatePath("/");
    return { success: true, message: "ล้างตารางชั่วคราวสำเร็จ" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

/**
 * 🔥 ประมวลผลไฟล์โดยใช้ Parser ที่แยกลอจิกจาก Delphi (แม่นยำ 100%)
 */
export async function processImportAS400(fileName: string, branchId?: number, shouldClear: boolean = true): Promise<ImportResult> {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    const filePath = path.join(STAGING_PATH, fileName);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `ไม่พบไฟล์: ${fileName}` };
    }

    const fileBuffer = fs.readFileSync(filePath);
    console.log(`[Import] File: ${fileName}, Size: ${fileBuffer.length} bytes`);
    
    // 🔥 ใช้ Parser ใหม่ที่แยกลอจิกจาก Delphi โดยตรง
    const result = await parseEDIFileDelphi(fileBuffer, fileName, shouldClear);
    
    if (!result.success) {
      return { success: false, message: `ประมวลผลไม่สำเร็จ: ${(result as any).error || ""}` };
    }

    // 🛡️ ดึงข้อมูลแบบปลอดภัยสำหรับ TypeScript
    const hCount = (result as any).headerCount ?? (result as any).count ?? 0;
    const dCount = (result as any).detailCount ?? 0;

    // --- บันทึก Log การ import สำเร็จ ---
    if (branchId) {
      await db.insert(importLogs).values({
        branchId: branchId,
        fileName: fileName,
        status: "imported",
        message: `นำเข้าสำเร็จ H=${hCount} D=${dCount}`,
      });
    }

    // --- จัดการ Archive ถาวร ---
    try {
      if (!fs.existsSync(PERMANENT_ARCHIVE_PATH)) {
        fs.mkdirSync(PERMANENT_ARCHIVE_PATH, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivedFileName = `${timestamp}_${fileName}`;
      const permanentPath = path.join(PERMANENT_ARCHIVE_PATH, archivedFileName);
      fs.copyFileSync(filePath, permanentPath);
      
      const stats = fs.statSync(filePath);
      await db.insert(rawFileArchives).values({
        fileName: archivedFileName,
        originalName: fileName,
        fileSize: stats.size,
        storagePath: permanentPath,
        branchId: branchId || null,
      });
    } catch (err) { 
      console.error("[Archive Error]", err); 
    }

    // --- ย้ายไฟล์ไปโฟลเดอร์ Archive ใน Staging ---
    try {
      const archiveDir = path.join(STAGING_PATH, "Archive");
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      const archivePath = path.join(archiveDir, fileName);
      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
      }
      fs.renameSync(filePath, archivePath);
    } catch (err) { 
      console.error("[Move Error]", err); 
    }

    revalidatePath("/");
    return { success: true, message: `ไฟล์ ${fileName} นำเข้าสำเร็จ! (H:${hCount}, D:${dCount})` };

  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Import] Global Error:", err.message);
    return { success: false, message: `ผิดพลาด: ${err.message}` };
  }
}

/**
 * รวมขั้นตอน: ดึงไฟล์จากทุกสาขาและประมวลผล (Global Sync)
 */
export async function syncAllBranchesAction(): Promise<ImportResult> {
  const allActiveBranches = await db.query.branches.findMany({
    where: eq(branches.isActive, true)
  });

  let totalFiles = 0;
  const errors: string[] = [];

  const { path: STAGING_PATH } = await getStagingConfig();

  for (const branch of allActiveBranches) {
    try {
      const fetchResult = await fetchBranchFilesAction(branch.id);
      if (fetchResult.success) {
        const files = fs.readdirSync(STAGING_PATH).filter(f => 
          f.toLowerCase().endsWith(".txt") || f.toLowerCase().endsWith(".tab")
        );
        for (const file of files) {
          await processImportAS400(file, branch.id);
          totalFiles++;
        }
      } else {
        errors.push(`${branch.branchName}: ${fetchResult.message}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      errors.push(`${branch.branchName}: ${error.message}`);
    }
  }

  return {
    success: errors.length < allActiveBranches.length,
    message: `ประมวลผลเสร็จสิ้น ${totalFiles} ไฟล์`,
    errors: errors.length > 0 ? errors : undefined
  };
}

export async function getBranchesAction() {
  return await db.query.branches.findMany({
    orderBy: (b, { asc }) => [asc(b.branchName)]
  });
}

export async function getEDLByHeaderAction(customerPo: string, fileName: string) {
  return await db.query.EDL_tmp.findMany({
    where: (edl, { eq, and }) => and(
      eq(edl.customerPo, customerPo),
      eq(edl.fileName, fileName)
    ),
    orderBy: (edl, { asc }) => [asc(edl.seqNum)]
  });
}

export async function getEDLByHeadersAction(items: { customerPo: string; fileName: string }[]) {
  if (items.length === 0) return [];
  
  const results = [];
  for (const item of items) {
    const details = await db.query.EDL_tmp.findMany({
      where: (edl, { eq, and }) => and(
        eq(edl.customerPo, item.customerPo),
        eq(edl.fileName, item.fileName)
      ),
      orderBy: (edl, { asc }) => [asc(edl.seqNum)]
    });
    results.push(...details);
  }
  return results;
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
        return {
          name: entry.name,
          size: stats.size,
          mtime: stats.mtime,
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch (error) {
    console.error("[Import] GetStagingFiles Error:", error);
    return [];
  }
}

export async function deleteAS400FileAction(fileName: string, branchId?: number) {
  try {
    const { path: STAGING_PATH } = await getStagingConfig();
    const stagingPath = path.join(STAGING_PATH, fileName);
    
    if (fs.existsSync(stagingPath) && fs.lstatSync(stagingPath).isFile()) {
      fs.unlinkSync(stagingPath);
    }

    if (branchId) {
      const branch = await db.query.branches.findFirst({ where: eq(branches.id, branchId) });
      if (branch?.sourcePath) {
        const sourceFilePath = path.join(branch.sourcePath, fileName);
        if (fs.existsSync(sourceFilePath) && fs.lstatSync(sourceFilePath).isFile()) {
          fs.unlinkSync(sourceFilePath);
        }
      }
    }
    revalidatePath("/");
    return { success: true, message: "ลบไฟล์สำเร็จ" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `เกิดข้อผิดพลาดในการลบไฟล์: ${err.message}` };
  }
}

export async function getEDHData() {
  try {
    const results = await db.select({
      id: EDH_tmp.id,
      hType: EDH_tmp.hType,
      customerPo: EDH_tmp.customerPo,
      customerNum: EDH_tmp.customerNum, 
      shortName: sql<string>`COALESCE(${customer.short_name}, ${EDH_tmp.customerNum}, 'รหัสลูกค้า: ' || ${EDH_tmp.customerNum})`,    
      buyerName: EDH_tmp.buyerName, 
      customerName: sql<string>`COALESCE(${customer.company_name}, ${EDH_tmp.customerName}, 'ไม่พบข้อมูลใน Master')`, 
      datePo: EDH_tmp.datePo,
      dateShip: EDH_tmp.dateShip,
      totalAmount: EDH_tmp.totalAmount,
      fileName: EDH_tmp.fileName,
      as400Status: EDH_tmp.as400Status,
      as400ImportedAt: EDH_tmp.as400ImportedAt,
      createdAt: EDH_tmp.createdAt,
    })
    .from(EDH_tmp)
    // ใช้ TRIM เพื่อให้การ Join แม่นยำขึ้น ป้องกันปัญหาช่องว่างเกิน
    .leftJoin(customer, sql`TRIM(${EDH_tmp.customerNum}) = TRIM(${customer.customer_code})`)
    .orderBy(desc(EDH_tmp.id));

    return results;
  } catch (error) {
    console.error("Error in getEDHData:", error);
    // กรณีพังจริงๆ ให้ดึงดิบๆ จากตารางหลักเลย
    return await db.select().from(EDH_tmp).orderBy(desc(EDH_tmp.id));
  }
}

export async function getEDLData() {
  return await db.query.EDL_tmp.findMany({
    orderBy: (edl, { desc }) => [desc(edl.id)]
  });
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
      if (fs.existsSync(archive.storagePath)) {
        fs.unlinkSync(archive.storagePath);
      }
      await db.delete(rawFileArchives).where(eq(rawFileArchives.id, id));
    }

    revalidatePath("/");
    return { success: true, message: "ลบประวัติไฟล์ถาวรสำเร็จ" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `ลบไม่สำเร็จ: ${err.message}` };
  }
}

export async function getAS400LogsByHeaderIdAction(headerIds: number[]) {
  "use server";
  return await getAS400LogsByHistoryIds(headerIds);
}
