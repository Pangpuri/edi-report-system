"use server";

import { db } from "@/db";
import { EDH_tmp, as400_logs, EDL_tmp, customer, EDH_history, EDL_history } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkSession } from "@/lib/auth-utils";

// Helper: Trim string values in an object to ensure clean data transfer
function trimFields<T extends object>(obj: T): T {
  const result = { ...obj } as any;
  for (const key in result) {
    if (typeof result[key] === "string") {
      result[key] = (result[key] as string).trim();
    }
  }
  return result;
}

/**
 * โอนข้อมูลเข้า AS/400 (Move Data Workflow)
 * 1. ดึงข้อมูลจาก tmp
 * 2. Trim ข้อมูลให้สะอาดครบถ้วน
 * 3. ย้ายเข้า history (ตารางถาวร)
 * 4. ลบออกจาก tmp
 */
export async function upsertToAS400(headerId: number) {
  try {
    await checkSession();

    // 1. ดึงข้อมูล Header จากตารางพัก
    const header = await db.query.EDH_tmp.findFirst({
      where: eq(EDH_tmp.id, headerId),
    });

    if (!header) {
      return { success: false, message: "ไม่พบข้อมูลใบสั่งซื้อในตารางพักข้อมูล" };
    }

    // 2. ดึงข้อมูล Detail จากตารางพัก
    const details = await db.query.EDL_tmp.findMany({
      where: and(
        eq(EDL_tmp.customerPo, header.customerPo ?? ""),
        eq(EDL_tmp.fileName, header.fileName ?? "")
      )
    });

    // 3. เตรียมข้อมูลสำหรับ History (เน้น Trim ทุกฟิลด์ตามคำแนะนำ)
    const trimmedHeader = trimFields({
      hType: header.hType,
      customerPo: header.customerPo,
      customerNum: header.customerNum,
      customerName: header.customerName,
      buyerName: header.buyerName,
      datePo: header.datePo,
      dateShip: header.dateShip,
      totalAmount: header.totalAmount,
      fileName: header.fileName,
      as400Status: true,
      as400ImportedAt: new Date(),
    });

    // 4. ดำเนินการย้ายข้อมูลแบบ Transaction
    const result = await db.transaction(async (tx) => {
      // 4.1 บันทึกลงตาราง Header History
      const [newHistory] = await tx.insert(EDH_history).values(trimmedHeader).returning({ id: EDH_history.id });
      
      // 4.2 บันทึกลงตาราง Detail History
      if (details.length > 0) {
        const historyDetails = details.map(d => trimFields({
          headerId: newHistory.id,
          dType: d.dType,
          customerPo: d.customerPo,
          customerNum: d.customerNum,
          seqNum: d.seqNum,
          productName: d.productName,
          packSize: d.packSize,
          eanNum: d.eanNum,
          buyerProdCode: d.buyerProdCode,
          vendorProdCode: d.vendorProdCode,
          qtyOrder: d.qtyOrder,
          priceUnit: d.priceUnit,
          freeQty: d.freeQty,
          discount1: d.discount1,
          discount2: d.discount2,
          discount3: d.discount3,
          totalAmount: d.totalAmount,
          fileName: d.fileName,
        }));
        await tx.insert(EDL_history).values(historyDetails);
      }

      // 4.3 ลบ Log เก่าที่อ้างอิงตารางพัก
      await tx.delete(as400_logs).where(eq(as400_logs.headerId, headerId));

      // 4.4 ลบข้อมูลออกจากตารางพักข้อมูล (EDL -> EDH)
      await tx.delete(EDL_tmp).where(and(
        eq(EDL_tmp.customerPo, header.customerPo ?? ""),
        eq(EDL_tmp.fileName, header.fileName ?? "")
      ));
      await tx.delete(EDH_tmp).where(eq(EDH_tmp.id, headerId));

      // 4.5 บันทึก Log ใหม่ที่อ้างอิง History ID
      await tx.insert(as400_logs).values({
        historyId: newHistory.id,
        status: "success",
        errorMessage: `โอนข้อมูล PO ${header.customerPo} เข้า AS/400 และจัดเก็บประวัติถาวรเรียบร้อยแล้ว`,
      });

      return newHistory;
    });

    revalidatePath("/");
    return { 
      success: true, 
      message: `โอนข้อมูลใบสั่งซื้อ ${header.customerPo} ไป AS/400 และล้างตารางพักข้อมูลสำเร็จ` 
    };

  } catch (error) {
    console.error("AS/400 Transfer Error:", error);
    return { 
      success: false, 
      message: `โอนไม่สำเร็จ: ${error instanceof Error ? error.message : "เกิดข้อผิดพลาด"}` 
    };
  }
}

/**
 * แก้ไขสถานะการนำเข้าในหน้าประวัติ (Toggle History Status)
 */
export async function updateHistoryStatus(id: number, status: boolean) {
  try {
    await checkSession();
    await db.update(EDH_history)
      .set({ 
        as400Status: status,
        as400ImportedAt: status ? new Date() : null 
      })
      .where(eq(EDH_history.id, id));
    
    // บันทึก Log การเปลี่ยนสถานะ
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

/**
 * ดำเนินการนำเข้าข้อมูลซ้ำจากประวัติ (Re-Transfer History)
 */
export async function reTransferHistoryAction(historyId: number) {
  try {
    await checkSession();
    
    const header = await db.query.EDH_history.findFirst({
      where: eq(EDH_history.id, historyId)
    });

    if (!header) return { success: false, message: "ไม่พบข้อมูลประวัติ" };

    // อัปเดตเวลาที่นำเข้าล่าสุด และตั้งเป็นสำเร็จ
    await db.update(EDH_history)
      .set({ 
        as400Status: true,
        as400ImportedAt: new Date() 
      })
      .where(eq(EDH_history.id, historyId));

    // บันทึก Log การนำเข้าซ้ำ
    await db.insert(as400_logs).values({
      historyId: historyId,
      status: "success",
      errorMessage: `ดำเนินการนำเข้าข้อมูลซ้ำ (Re-Transfer) สำเร็จโดยผู้ใช้`,
    });

    revalidatePath("/");
    return { success: true, message: `นำเข้าข้อมูล PO ${header.customerPo} ซ้ำสำเร็จ` };
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาดในการนำเข้าซ้ำ" };
  }
}

/**
 * ลบข้อมูลประวัติ (ลบทั้ง Header, Details และ Logs ในตาราง History)
 */
export async function deleteImportedAction(headerIds: number[]) {
  try {
    await checkSession();
    if (headerIds.length === 0) return { success: false, message: "กรุณาเลือกรายการที่ต้องการลบ" };

    for (const id of headerIds) {
      // 1. หาข้อมูลจาก History
      const historyHeader = await db.query.EDH_history.findFirst({
        where: eq(EDH_history.id, id)
      });

      if (historyHeader) {
        // 2. ลบ Logs ที่อ้างอิง History ID นี้
        await db.delete(as400_logs).where(eq(as400_logs.historyId, id));
        
        // 3. ลบ Details จาก History
        await db.delete(EDL_history).where(eq(EDL_history.headerId, id));
        
        // 4. ลบ Header จาก History
        await db.delete(EDH_history).where(eq(EDH_history.id, id));
      }
    }

    revalidatePath("/");
    return { success: true, message: `ลบข้อมูลประวัติสำเร็จ ${headerIds.length} รายการ` };
  } catch (error: unknown) {
    console.error("Delete History Action Error:", error);
    const err = error as Error;
    return { success: false, message: `ลบไม่สำเร็จ: ${err.message}` };
  }
}

/**
 * ดึงข้อมูลที่โอนเข้า AS/400 เรียบร้อยแล้ว (อ่านจาก History ถาวร)
 */
export async function getImportedAS400Data() {
  try {
    const results = await db.select({
      id: EDH_history.id,
      hType: EDH_history.hType,
      customerPo: EDH_history.customerPo,
      customerNum: EDH_history.customerNum,
      customerName: customer.company_name, 
      shortName: customer.short_name,    
      buyerName: customer.customer_code,  
      datePo: EDH_history.datePo,
      dateShip: EDH_history.dateShip,
      totalAmount: EDH_history.totalAmount,
      fileName: EDH_history.fileName,
      as400Status: EDH_history.as400Status,
      as400ImportedAt: EDH_history.as400ImportedAt,
      createdAt: EDH_history.createdAt,
    })
    .from(EDH_history)
    .leftJoin(customer, eq(EDH_history.customerNum, customer.customer_code))
    .orderBy(desc(EDH_history.as400ImportedAt));

    return results;
  } catch (error) {
    console.error("Fetch History Data Error:", error);
    return [];
  }
}

/**
 * ดึงรายละเอียดสินค้าจาก History ตาม Header IDs
 */
export async function getEDLHistoryByHeadersAction(items: { customerPo: string; fileName: string }[]) {
  try {
    if (items.length === 0) return [];

    const results = await db.select()
      .from(EDL_history)
      .where(
        sql`(${EDL_history.customerPo}, ${EDL_history.fileName}) IN ${sql.raw(
          `(${items.map(i => `('${i.customerPo}', '${i.fileName}')`).join(',')})`
        )}`
      );

    return results;
  } catch (error) {
    console.error("Fetch EDL History Error:", error);
    return [];
  }
}

/**
 * 🔥 ดึง Logs ตาม History ID (รองรับหลาย ID)
 */
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

/**
 * 🔥 ดึง Logs ตาม History ID เดียว
 */
export async function getAS400LogsByHistoryId(historyId: number) {
  try {
    const logs = await db.select()
      .from(as400_logs)
      .where(eq(as400_logs.historyId, historyId))
      .orderBy(desc(as400_logs.createdAt));
    
    return logs;
  } catch (error) {
    console.error("Fetch AS400 Logs Error:", error);
    return [];
  }
}

/**
 * 🔥 ดึง Logs ล่าสุดทั้งหมด (สำหรับ Admin)
 */
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