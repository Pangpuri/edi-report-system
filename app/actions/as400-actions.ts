"use server";

import { db } from "@/db";
import { 
  EDH_temp, 
  EDL_temp, 
  TEDH, 
  TEDL, 
  as400_logs, 
  customer 
} from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkSession } from "@/lib/auth-utils";

function trimFields<T extends object>(obj: T): T {
  const result = { ...obj };
  
  const temp = result as Record<string, unknown>;
  for (const key in temp) {
    if (typeof temp[key] === "string") {
      temp[key] = (temp[key] as string).trim();
    }
  }

  return result;
}

export async function upsertToAS400(headerId: number) {
  try {
    await checkSession();

    const header = await db.query.EDH_temp.findFirst({
      where: eq(EDH_temp.id, headerId),
    });

    if (!header) {
      return { success: false, message: "ไม่พบข้อมูลใบสั่งซื้อในตารางพักข้อมูล" };
    }

    // แก้ไข: ค้นหา Detail โดยใช้ทั้ง Customer_PO และ File_Name เพื่อป้องกันข้อมูลซ้ำซ้อนจากหลายไฟล์
    const details = await db.query.EDL_temp.findMany({
      where: and(
        eq(EDL_temp.Customer_PO, header.Customer_PO ?? ""),
        eq(EDL_temp.File_Name, header.File_Name ?? "")
      ),
    });

    if (details.length === 0) {
      return { success: false, message: `ใบสั่งซื้อ ${header.Customer_PO} ไม่มีรายการสินค้า (Details) ไม่สามารถโอนได้` };
    }

    const trimmedHeader = trimFields({
      H_Type: header.H_Type || "H",
      Customer_PO: header.Customer_PO,
      Customer_Num: header.Customer_Num,
      Customer_Name: header.Customer_Name,
      Buyer_Name: header.Buyer_Name,
      Date_PO: header.Date_PO,
      Date_Ship: header.Date_Ship,
      Total_Amount: header.Total_Amount,
      File_Name: header.File_Name,
      AS400_Status: true,
      // ลบ Created_At ออกเพื่อให้ใช้ค่า defaultNow() จาก DB (เป็นเวลาที่นำเข้าจริง)
    });

    const result = await db.transaction(async (tx) => {
      // 1. บันทึกข้อมูล Header ลงใน History
      const [newHistory] = await tx.insert(TEDH).values(trimmedHeader).returning({ id: TEDH.id });
      
      if (!newHistory) throw new Error("ไม่สามารถสร้างข้อมูลประวัติส่วนหัวได้");

      // 2. บันทึกข้อมูล Detail ลงใน History พร้อมผูก Header_Id
      const historyDetails = details.map((d, index) => trimFields({
        Header_Id: newHistory.id,
        D_Type: "D",
        Customer_PO: d.Customer_PO,
        Customer_Num: header.Customer_Num,
        Line_Num: d.Line_Num || (index + 1).toString(), 
        Product_Name: d.Product_Name,
        Pack_Size: "CN", 
        Bar_Code_Item: d.Bar_Code_Item,
        Buyer_Prod_Code: header.Customer_Num, 
        Vendor_Prod_Code: d.Item_Num, 
        Qty_Order: d.Qty_Order,
        Price_Unit: d.Price_Unit,
        Free_Qty: d.Free_Qty,
        Discount_1: d.Discount_1,
        Discount_2: d.Discount_2,
        Discount_3: d.Discount_3,
        Net_Amount: d.Net_Amount,
        File_Name: d.File_Name || header.File_Name,
      }));
      
      await tx.insert(TEDL).values(historyDetails);

      // 3. ลบข้อมูลจากตารางพัก (Temp) เฉพาะของไฟล์และ PO นี้
      await tx.delete(EDL_temp).where(and(
        eq(EDL_temp.Customer_PO, header.Customer_PO ?? ""),
        eq(EDL_temp.File_Name, header.File_Name ?? "")
      ));
      await tx.delete(EDH_temp).where(eq(EDH_temp.id, headerId));

      // 4. บันทึก Log การทำงาน
      await tx.insert(as400_logs).values({
        historyId: newHistory.id,
        status: "success",
        errorMessage: `โอนข้อมูล PO ${header.Customer_PO} (${header.File_Name}) เข้า AS/400 สำเร็จ (จำนวน ${details.length} รายการ)`,
      });

      return newHistory;
    });

    revalidatePath("/");
    return { 
      success: true, 
      message: `โอนข้อมูลใบสั่งซื้อ ${header.Customer_PO} ไป AS/400 สำเร็จ` 
    };

  } catch (error) {
    console.error("AS/400 Transfer Error:", error);
    return { 
      success: false, 
      message: `โอนไม่สำเร็จ: ${error instanceof Error ? error.message : "เกิดข้อผิดพลาด"}` 
    };
  }
}

export async function updateHistoryStatus(id: number, status: boolean) {
  try {
    await checkSession();
    await db.update(TEDH)
      .set({ 
        AS400_Status: status,
      })
      .where(eq(TEDH.id, id));
    
    await db.insert(as400_logs).values({
      historyId: id,
      status: status ? "success" : "pending",
      errorMessage: `เปลี่ยนสถานะโดยผู้ใช้: เป็น ${status ? "สำเร็จ" : "รอนำเข้าอีกครั้ง"}`,
    });
    
    revalidatePath("/");
    return { success: true, message: "อัปเดตสถานะประวัติสำเร็จ" };
  } catch (error) {
    return { success: false, message: "ไม่สามารถอัปเดตสถานะได้" };
  }
}

export async function reTransferHistoryAction(historyId: number) {
  try {
    await checkSession();
    
    const header = await db.query.TEDH.findFirst({
      where: eq(TEDH.id, historyId)
    });

    if (!header) return { success: false, message: "ไม่พบข้อมูลประวัติ" };

    await db.update(TEDH)
      .set({ 
        AS400_Status: true,
      })
      .where(eq(TEDH.id, historyId));

    await db.insert(as400_logs).values({
      historyId: historyId,
      status: "success",
      errorMessage: `ดำเนินการนำเข้าข้อมูลซ้ำ (Re-Transfer) สำเร็จโดยผู้ใช้`,
    });

    revalidatePath("/");
    return { success: true, message: `นำเข้าข้อมูล PO ${header.Customer_PO} ซ้ำสำเร็จ` };
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาดในการนำเข้าซ้ำ" };
  }
}

export async function deleteImportedAction(headerIds: number[]) {
  try {
    await checkSession();
    if (headerIds.length === 0) return { success: false, message: "กรุณาเลือกรายการที่ต้องการลบ" };

    await db.delete(TEDH).where(inArray(TEDH.id, headerIds));

    revalidatePath("/");
    return { success: true, message: `ลบข้อมูลประวัติสำเร็จ ${headerIds.length} รายการ` };
  } catch (error: unknown) {
    console.error("Delete History Action Error:", error);
    const err = error as Error;
    return { success: false, message: `ลบไม่สำเร็จ: ${err.message}` };
  }
}

export async function deleteSelectedTempAction(headerIds: number[]) {
  try {
    await checkSession();
    if (headerIds.length === 0) return { success: false, message: "กรุณาเลือกรายการที่ต้องการลบ" };

    const result = await db.transaction(async (tx) => {
      // 1. ค้นหาข้อมูล Header เพื่อเอา Customer_PO และ File_Name มาลบ Detail
      const headers = await tx.select({
        customerPo: EDH_temp.Customer_PO,
        fileName: EDH_temp.File_Name,
      })
      .from(EDH_temp)
      .where(inArray(EDH_temp.id, headerIds));

      // 2. ลบข้อมูล Detail ที่เกี่ยวข้อง
      for (const header of headers) {
        await tx.delete(EDL_temp).where(and(
          eq(EDL_temp.Customer_PO, header.customerPo ?? ""),
          eq(EDL_temp.File_Name, header.fileName ?? "")
        ));
      }

      // 3. ลบข้อมูล Header
      await tx.delete(EDH_temp).where(inArray(EDH_temp.id, headerIds));

      return { success: true };
    });

    revalidatePath("/");
    return { success: true, message: `ลบข้อมูลชั่วคราวสำเร็จ ${headerIds.length} รายการ` };
  } catch (error: unknown) {
    console.error("Delete Temp Action Error:", error);
    const err = error as Error;
    return { success: false, message: `ลบไม่สำเร็จ: ${err.message}` };
  }
}

export async function getImportedAS400Data() {
  try {
    const results = await db.select({
      id: TEDH.id,
      hType: TEDH.H_Type,
      customerPo: TEDH.Customer_PO,
      customerNum: TEDH.Customer_Num,
      customerName: customer.company_name, 
      shortName: customer.short_name,    
      buyerName: customer.customer_code,  
      datePo: TEDH.Date_PO,
      dateShip: TEDH.Date_Ship,
      totalAmount: TEDH.Total_Amount,
      fileName: TEDH.File_Name,
      as400Status: TEDH.AS400_Status,
      as400ImportedAt: TEDH.AS400_Imported_At,
      // เพิ่มฟิลด์แสดงผลวันที่แบบจัดรูปแบบแล้วจาก DB โดยตรง
      importedAtDisplay: sql<string>`TO_CHAR(${TEDH.AS400_Imported_At} + interval '7 hours', 'DD/MM/YYYY HH24:MI:SS')`,
      createdAt: TEDH.Created_At,
    })
    .from(TEDH)
    .leftJoin(customer, eq(TEDH.Customer_Num, customer.customer_code))
    .orderBy(desc(TEDH.Created_At));

    return results;
  } catch (error) {
    console.error("Fetch History Data Error:", error);
    return [];
  }
}

export async function getEDLHistoryByHeadersAction(headerIds: number[]) {
  try {
    if (headerIds.length === 0) return [];

    const results = await db.select({
      id: TEDL.id,
      headerId: TEDL.Header_Id,
      customerPo: TEDL.Customer_PO,
      customerNum: TEDL.Customer_Num,
      seqNum: TEDL.Line_Num,
      productName: TEDL.Product_Name,
      packSize: TEDL.Pack_Size,
      Bar_Code_Item: TEDL.Bar_Code_Item,
      buyerProdCode: TEDL.Buyer_Prod_Code,
      vendorProdCode: TEDL.Vendor_Prod_Code,
      orderQty: TEDL.Qty_Order,
      unitPrice: TEDL.Price_Unit,
      freeQty: TEDL.Free_Qty,
      discount1: TEDL.Discount_1,
      discount2: TEDL.Discount_2,
      discount3: TEDL.Discount_3,
      netAmount: TEDL.Net_Amount,
      fileName: TEDL.File_Name,
      checkBarInt: TEDL.Bar_Code_Item,
      changeItem: TEDL.Change_Item,
      changeProdName: TEDL.Change_Prod_Name,
    })
    .from(TEDL)
    .where(inArray(TEDL.Header_Id, headerIds))
    .orderBy(sql`CAST(${TEDL.Line_Num} AS INTEGER)`);

    return results;
  } catch (error) {
    console.error("Fetch EDL History Error:", error);
    return [];
  }
}

export async function getAS400LogsByHistoryIds(historyIds: number[]) {
  try {
    if (!historyIds.length) return [];
    
    const logs = await db.select({
      id: as400_logs.id,
      historyId: as400_logs.historyId,
      status: as400_logs.status,
      errorMessage: as400_logs.errorMessage,
      createdAt: as400_logs.createdAt,
      createdAtDisplay: sql<string>`TO_CHAR(${as400_logs.createdAt} + interval '7 hours', 'DD/MM/YYYY HH24:MI:SS')`,
    })
      .from(as400_logs)
      .where(inArray(as400_logs.historyId, historyIds))
      .orderBy(desc(as400_logs.createdAt));
    
    return logs;
  } catch (error) {
    console.error("Fetch AS400 Logs Error:", error);
    return [];
  }
}

export async function getAllAS400Logs(limit: number = 100) {
  try {
    const logs = await db.select()
      .from(as400_logs)
      .orderBy(desc(as400_logs.createdAt))
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error("Fetch All AS400 Logs Error:", error);
    return [];
  }
}