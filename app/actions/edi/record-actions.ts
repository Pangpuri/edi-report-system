"use server";

import { db } from "@/db";
import { 
  TEDH_history, 
  TEDL_history,
  customer,
  custAddress
} from "@/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkSession } from "@/lib/auth-utils";

/**
 * ดึงข้อมูล Header จากตาราง EDH_record
 */
export async function getEDHRecordData() {
  try {
    const results = await db.select({
      id: TEDH_history.id,
      hType: TEDH_history.H_Type,
      customerPo: TEDH_history.Customer_PO,
      customerNum: TEDH_history.Customer_Num,
      customerName: customer.company_name, 
      shortName: customer.short_name,    
      buyerName: TEDH_history.Buyer_Name,  
      datePo: TEDH_history.Date_PO,
      dateShip: TEDH_history.Date_Ship,
      totalAmount: TEDH_history.Total_Amount,
      fileName: TEDH_history.File_Name,
      createdAt: TEDH_history.Created_At,
      importedAtDisplay: sql<string>`TO_CHAR(${TEDH_history.AS400_Imported_At}, 'DD/MM/YYYY HH24:MI:SS')`,
    })
    .from(TEDH_history)
    .leftJoin(customer, eq(TEDH_history.Customer_Num, customer.customer_code))
    .orderBy(desc(TEDH_history.Created_At));

    return results;
  } catch (error) {
    console.error("Fetch EDH Record Error:", error);
    return [];
  }
}

/**
 * ดึงข้อมูล Detail จากตาราง EDL_record โดยอ้างอิงจาก Header IDs
 */
export async function getEDLRecordByHeadersAction(headerIds: number[]) {
  try {
    if (headerIds.length === 0) return [];

    const results = await db.select({
      id: TEDL_history.id,
      headerId: TEDL_history.Header_Id,
      customerPo: TEDL_history.Customer_PO,
      customerNum: TEDL_history.Customer_Num,
      seqNum: TEDL_history.Line_Num,
      productName: TEDL_history.Product_Name,
      packSize: TEDL_history.Pack_Size,
      Bar_Code_Item: TEDL_history.Bar_Code_Item,
      buyerProdCode: TEDL_history.Buyer_Prod_Code,
      vendorProdCode: TEDL_history.Vendor_Prod_Code,
      orderQty: TEDL_history.Qty_Order,
      unitPrice: TEDL_history.Price_Unit,
      freeQty: TEDL_history.Free_Qty,
      discount1: TEDL_history.Discount_1,
      discount2: TEDL_history.Discount_2,
      discount3: TEDL_history.Discount_3,
      netAmount: TEDL_history.Net_Amount,
      fileName: TEDL_history.File_Name,
      checkBarInt: TEDL_history.Check_Bar_Int,
      changeItem: TEDL_history.Change_Item,
      changeProdName: TEDL_history.Change_Prod_Name,
    })
    .from(TEDL_history)
    .where(inArray(TEDL_history.Header_Id, headerIds))
    .orderBy(sql`CAST(${TEDL_history.Line_Num} AS INTEGER)`);

    return results;
  } catch (error) {
    console.error("Fetch EDL Record Error:", error);
    return [];
  }
}

/**
 * ลบข้อมูลออกจากตาราง Record
 */
export async function deleteRecordAction(headerIds: number[]) {
  try {
    await checkSession();
    if (headerIds.length === 0) return { success: false, message: "กรุณาเลือกรายการที่ต้องการลบ" };

    await db.delete(TEDH_history).where(inArray(TEDH_history.id, headerIds));

    revalidatePath("/");
    return { success: true, message: `ลบข้อมูลสำเร็จ ${headerIds.length} รายการ` };
  } catch (error: unknown) {
    console.error("Delete Record Action Error:", error);
    const err = error as Error;
    return { success: false, message: `ลบไม่สำเร็จ: ${err.message}` };
  }
}
