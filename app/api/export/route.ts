import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import iconv from "iconv-lite";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { 
  EDI_CONFIGS, 
  generateEDIContent, 
  generateCSVContent, 
  getTableSchema, 
  validateMasterData,
  EDIConfig, // เพิ่ม Import Type มาใช้
} from "@/lib/edi-utils";

/**
 * API สำหรับส่งออกข้อมูล (Export Data) ให้อยู่ในรูปแบบ EDI (Tab/Pipe) หรือ CSV
 * 
 * @param request - NextRequest object ที่มี query parameters
 * @returns {Promise<NextResponse>} ไฟล์สำหรับดาวน์โหลด หรือ HTTP JSON กรณีพบข้อผิดพลาด
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // ตรวจสอบสิทธิ์การเข้าถึงข้อมูล
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("table") || "";
  const format = searchParams.get("format") || "tab";

  type EDICategory = keyof typeof EDI_CONFIGS;
  
  /**
   * ตรวจสอบว่าชื่อตารางที่ร้องขอมานั้นอยู่ในรายการที่อนุญาตหรือไม่
   */
  const isValidTable = (name: string): name is EDICategory => {
    return name in EDI_CONFIGS;
  };

  if (!isValidTable(tableName)) {
    return NextResponse.json({ error: `Invalid table: ${tableName}` }, { status: 400 });
  }

  // ใช้รูปแบบ Unknown เพื่อลดการพึ่งพา Any Type
  const config = EDI_CONFIGS[tableName] as EDIConfig<unknown>;
  const table = getTableSchema(tableName);

  if (!table) {
    return NextResponse.json({ error: `Schema not found: ${tableName}` }, { status: 400 });
  }

  try {
    const rows = await db.select().from(table);

    // ตรวจสอบข้อมูลก่อนส่งออก (Validation Phase)
    const validationErrors = validateMasterData(rows as unknown[], config);
    if (validationErrors.length > 0) {
      console.warn(`[EXPORT-WARNING] ${tableName}: Found ${validationErrors.length} issues.`);
    }

    // --- โหมดการส่งออกแบบ EDI (Pipe delimiter) ---
    if (format === "tab") {
      const finalContent = generateEDIContent(config, rows as unknown[]);
      // เข้ารหัสตัวอักษรเป็นรูปแบบ Windows-874 เพื่อให้แสดงภาษาไทยบน Legacy Systems ได้ถูกต้อง
      const buffer = iconv.encode(finalContent, "win874");

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${config.fileName}"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    // --- โหมดการส่งออกแบบ CSV (Default Fallback) ---
    const csvContent = generateCSVContent(config, rows as unknown[]);
    const bom = Buffer.from("\uFEFF", "utf-8"); // ใส่ UTF-8 BOM ให้ Excel เปิดได้ไม่เพี้ยน
    const contentBuffer = Buffer.from(csvContent, "utf-8");
    const finalBuffer = Buffer.concat([bom, contentBuffer]);

    return new NextResponse(new Uint8Array(finalBuffer), {
      headers: { 
        "Content-Type": "text/csv; charset=utf-8", 
        "Content-Disposition": `attachment; filename="${tableName}_export.csv"`,
      }
    });

  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json(
      { error: "Export Failed", message: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
}