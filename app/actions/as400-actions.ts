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
  const result = { ...obj } as any;
  for (const key in result) {
    if (typeof result[key] === "string") {
      result[key] = (result[key] as string).trim();
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

    const details = await db.query.EDL_temp.findMany({
      where: eq(EDL_temp.Customer_PO, header.Customer_PO ?? ""),
    });

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
    });

    const result = await db.transaction(async (tx) => {
      const [newHistory] = await tx.insert(TEDH).values(trimmedHeader).returning({ id: TEDH.id });
      
      if (details.length > 0) {
        const historyDetails = details.map((d, index) => trimFields({
          Header_Id: newHistory.id,
          D_Type: "D",
          Customer_PO: d.Customer_PO,
          Customer_Num: header.Customer_Num, // รหัสผู้ซื้อมาจาก Header ตามบรีฟ
          Line_Num: d.Line_Num || (index + 1).toString(), 
          Product_Name: d.Product_Name,
          Pack_Size: "CN", 
          Bar_Code_Item: d.Bar_Code_Item,
          Buyer_Prod_Code: header.Customer_Num, 
          Vendor_Prod_Code: d.Item_Num, // รหัสผู้ผลิต รับมาจาก Item_Num
          Qty_Order: d.Qty_Order,
          Price_Unit: d.Price_Unit,
          Free_Qty: d.Free_Qty,
          Discount_1: d.Discount_1,
          Discount_2: d.Discount_2,
          Discount_3: d.Discount_3,
          Total_Amount: d.Total_Amount,
          File_Name: d.File_Name || header.File_Name,
        }));
        await tx.insert(TEDL).values(historyDetails);
      }

      await tx.delete(EDL_temp).where(eq(EDL_temp.Customer_PO, header.Customer_PO ?? ""));
      await tx.delete(EDH_temp).where(eq(EDH_temp.id, headerId));

      await tx.insert(as400_logs).values({
        historyId: newHistory.id,
        status: "success",
        errorMessage: `โอนข้อมูล PO ${header.Customer_PO} เข้า AS/400 และจัดเก็บประวัติเรียบร้อยแล้ว`,
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

export async function getEDLHistoryByHeadersAction(items: { customerPo: string; fileName: string }[]) {
  try {
    if (items.length === 0) return [];

    const results = await db.select({
      id: TEDL.id,
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
      totalAmount: TEDL.Total_Amount,
      fileName: TEDL.File_Name,
    })
      .from(TEDL)
      .where(
        inArray(TEDL.Customer_PO, items.map(i => i.customerPo))
      )
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
    
    const logs = await db.select()
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