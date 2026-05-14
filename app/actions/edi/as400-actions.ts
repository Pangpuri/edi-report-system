"use server";

import { db } from "@/db";
import { 
  EDH_temp, 
  EDL_temp, 
  TEDH, 
  TEDL, 
  as400_logs, 
  customer,
  prodcode,
  Edit_Detail,
  TEDH_history,
  TEDL_history
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

    // 🛠️ DATABASE INTEGRITY CHECK: ตรวจสอบและสร้างตาราง Record หากยังไม่มี
    await db.execute(sql`
      -- 1. สร้างตาราง EDH_record ถ้ายังไม่มี
      CREATE TABLE IF NOT EXISTS "EDH_record" (
        "id" serial PRIMARY KEY,
        "H_Type" varchar(1),
        "Customer_PO" varchar(25),
        "Customer_Num" varchar(20),
        "Customer_Name" text,
        "Buyer_Name" text,
        "Date_PO" varchar(10),
        "Date_Ship" varchar(10),
        "Total_Amount" numeric(12, 2),
        "File_Name" varchar(255),
        "AS400_Status" boolean DEFAULT true,
        "Flag" boolean DEFAULT false,
        "Cus_Name_OP" text,
        "Cus_Prod_Change" text,
        "AS400_Imported_At" timestamp DEFAULT now(),
        "Created_At" timestamp DEFAULT now()
      );

      -- 2. สร้างตาราง EDL_record ถ้ายังไม่มี
      CREATE TABLE IF NOT EXISTS "EDL_record" (
        "id" serial PRIMARY KEY,
        "Header_Id" integer,
        "D_Type" varchar(1),
        "Customer_PO" varchar(25),
        "Customer_Num" varchar(20),
        "Line_Num" varchar(10),
        "Product_Name" text,
        "Pack_Size" varchar(50),
        "Bar_Code_Item" varchar(20),
        "Buyer_Prod_Code" varchar(30),
        "Vendor_Prod_Code" varchar(30),
        "Qty_Order" numeric(12, 2),
        "Price_Unit" numeric(12, 2),
        "Free_Qty" numeric(12, 2),
        "Discount_1" numeric(12, 2),
        "Discount_2" numeric(12, 2),
        "Discount_3" numeric(12, 2),
        "Net_Amount" numeric(12, 2),
        "Check_Bar_Int" varchar(30),
        "File_Name" varchar(255),
        "Change_Item" varchar(30),
        "Change_Prod_Name" text,
        "Check_Name_Old_Prod" text,
        "Created_At" timestamp DEFAULT now()
      );

      -- 3. แก้ไข Constraint ให้ถูกต้อง
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EDL_record_Header_Id_EDH_history_id_fk') THEN
          ALTER TABLE "EDL_record" DROP CONSTRAINT "EDL_record_Header_Id_EDH_history_id_fk";
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EDL_record_Header_Id_EDH_record_id_fk') THEN
          ALTER TABLE "EDL_record" ADD CONSTRAINT "EDL_record_Header_Id_EDH_record_id_fk" 
          FOREIGN KEY ("Header_Id") REFERENCES "EDH_record"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    const header = await db.query.EDH_temp.findFirst({
      where: eq(EDH_temp.id, headerId),
    });

    if (!header) {
      return { success: false, message: "ไม่พบข้อมูลใบสั่งซื้อในตารางพักข้อมูล" };
    }

    // 2. ค้นหา Detail พร้อม Join กับตาราง Master Data และตารางปรับเปลี่ยน (Edit_Detail) โดยใช้ Barcode เป็นหลัก
    const detailsWithMaster = await db.select({
      id: EDL_temp.id,
      D_Type: EDL_temp.D_Type,
      Customer_PO: EDL_temp.Customer_PO,
      Customer_Num: EDL_temp.Customer_Num,
      Line_Num: EDL_temp.Line_Num,
      Item_Num: EDL_temp.Item_Num,
      Product_Name: EDL_temp.Product_Name,
      Item_Description: EDL_temp.Item_Description,
      Bar_Code_Item: EDL_temp.Bar_Code_Item,
      Unit_Measure: EDL_temp.Unit_Measure,
      Qty_Order: EDL_temp.Qty_Order,
      Price_Unit: EDL_temp.Price_Unit,
      Free_Qty: EDL_temp.Free_Qty,
      Discount_1: EDL_temp.Discount_1,
      Discount_2: EDL_temp.Discount_2,
      Discount_3: EDL_temp.Discount_3,
      Net_Amount: EDL_temp.Net_Amount,
      Order_Date: EDL_temp.Order_Date,
      Request_Date: EDL_temp.Request_Date,
      Discount_Amount_Unit: EDL_temp.Discount_Amount_Unit,
      Buyer_Internal_Prod_code: EDL_temp.Buyer_Internal_Prod_code,
      File_Name: EDL_temp.File_Name,
      // ข้อมูลจาก Master Data (prodcode)
      masterInternalCode: prodcode.id,
      masterEanCode: prodcode.ean_product_code,
      masterDescription: prodcode.product_description,
      // ข้อมูลจากการปรับเปลี่ยน (Edit_Detail) - Join ด้วยบาร์โค้ด
      editNewBarcode: Edit_Detail.BarCode,
      editNewInternalCode: Edit_Detail.Internal_Code2,
      editNewName: Edit_Detail.Prod_Name2,
      editOldName: Edit_Detail.Prod_Name1,
    })
    .from(EDL_temp)
    // Join Master Data ด้วย Barcode
    .leftJoin(prodcode, sql`TRIM(${EDL_temp.Bar_Code_Item}) = TRIM(${prodcode.ean_product_code})`)
    // Join ข้อมูลลูกค้า เพื่อเอาไว้เช็ค short_name ในตาราง Edit_Detail
    .leftJoin(customer, sql`TRIM(${EDL_temp.Customer_Num}) = TRIM(${customer.customer_code})`)
    // Join ตารางปรับเปลี่ยน (กรณีตัดแบ่งแพ็ก) ด้วย Barcode หรือ Internal_Code1 และเช็คลูกค้าให้กว้างขึ้น
    .leftJoin(Edit_Detail, and(
      sql`(TRIM(${EDL_temp.Bar_Code_Item}) = TRIM(${Edit_Detail.BarCode}) OR LTRIM(TRIM(${EDL_temp.Item_Num}), '0') = LTRIM(TRIM(${Edit_Detail.Internal_Code1}), '0'))`,
      sql`(${Edit_Detail.Cus_Code} IS NULL OR TRIM(${Edit_Detail.Cus_Code}) = TRIM(${EDL_temp.Customer_Num}) OR TRIM(${Edit_Detail.Cus_Code}) = TRIM(${customer.short_name}))`
    ))
    .where(and(
      eq(EDL_temp.Customer_PO, header.Customer_PO ?? ""),
      eq(EDL_temp.File_Name, header.File_Name ?? "")
    ));

    if (detailsWithMaster.length === 0) {
      return { success: false, message: `ใบสั่งซื้อ ${header.Customer_PO} ไม่มีรายการสินค้า (Details) ไม่สามารถโอนได้` };
    }

    // ดึงข้อมูลลูกค้าจาก Master
    const customerMaster = await db.query.customer.findFirst({
      where: eq(customer.customer_code, header.Customer_Num ?? ""),
    });

    const trimmedHeader = trimFields({
      H_Type: header.H_Type || "H",
      Customer_PO: header.Customer_PO,
      Customer_Num: header.Customer_Num,
      Customer_Name: customerMaster?.company_name || header.Customer_Name, // ใช้ชื่อจาก Master
      Buyer_Name: header.Buyer_Name,
      Date_PO: header.Date_PO,
      Date_Ship: header.Date_Ship,
      Total_Amount: header.Total_Amount,
      File_Name: header.File_Name,
      AS400_Status: true, // เปลี่ยนเป็น true ทันทีเพราะถือว่าผ่านการ Export Tab แล้ว
    });

    const result = await db.transaction(async (tx) => {
      // --- 1. บันทึกข้อมูลลงใน History (รายการข้อมูลก่อนพิมพ์) ---
      const [newHistory] = await tx.insert(TEDH).values(trimmedHeader).returning({ id: TEDH.id });
      if (!newHistory) throw new Error("ไม่สามารถสร้างข้อมูลประวัติส่วนหัวได้");

      const historyDetails = detailsWithMaster.map((d, index) => trimFields({
        Header_Id: newHistory.id,
        D_Type: "D",
        Customer_PO: d.Customer_PO,
        Customer_Num: header.Customer_Num,
        Line_Num: d.Line_Num || (index + 1).toString(), 
        Product_Name: d.masterDescription || d.Product_Name, 
        Pack_Size: "CN", 
        Bar_Code_Item: d.Bar_Code_Item || d.masterEanCode, // ยึดบาร์โค้ดที่ตัดมาได้จาก parser เป็นหลัก
        Buyer_Prod_Code: d.Customer_Num || "-", 
        Vendor_Prod_Code: d.Item_Num, 
        Qty_Order: d.Qty_Order,
        Price_Unit: d.Price_Unit,
        Free_Qty: d.Free_Qty,
        Discount_1: d.Discount_1,
        Discount_2: d.Discount_2,
        Discount_3: d.Discount_3,
        Net_Amount: d.Net_Amount,
        File_Name: d.File_Name || header.File_Name,
        Check_Bar_Int: d.editNewBarcode || "",       
        Change_Item: d.editNewInternalCode || "",    // รหัสใหม่ที่ได้จากการคีย์บันทึก
        Change_Prod_Name: d.editNewName || "",       // ชื่อใหม่ของสินค้า
        Check_Name_Old_Prod: d.Product_Name || "",   // ชื่อเดิมสินค้าจากไฟล์ที่ import
      }));
      await tx.insert(TEDL).values(historyDetails);

      // --- 2. บันทึกข้อมูลลงใน Record (ข้อมูลที่นำเข้าระบบแล้ว) ---
      const [newRecord] = await tx.insert(TEDH_history).values({
        ...trimmedHeader,
        AS400_Status: true,
      }).returning({ id: TEDH_history.id });

      const recordDetails = detailsWithMaster.map((d, index) => trimFields({
        Header_Id: newRecord.id, // ต้องใช้ ID จาก TEDH_history เท่านั้น
        D_Type: "D",
        Customer_PO: d.Customer_PO,
        Customer_Num: header.Customer_Num,
        Line_Num: d.Line_Num || (index + 1).toString(), 
        Product_Name: d.masterDescription || d.Product_Name, 
        Pack_Size: "CN", 
        Bar_Code_Item: d.Bar_Code_Item || d.masterEanCode,
        Buyer_Prod_Code: d.Customer_Num || "-", 
        Vendor_Prod_Code: d.Item_Num, 
        Qty_Order: d.Qty_Order,
        Price_Unit: d.Price_Unit,
        Free_Qty: d.Free_Qty,
        Discount_1: d.Discount_1,
        Discount_2: d.Discount_2,
        Discount_3: d.Discount_3,
        Net_Amount: d.Net_Amount,
        File_Name: d.File_Name || header.File_Name,
        Check_Bar_Int: d.editNewBarcode || "",       
        Change_Item: d.editNewInternalCode || "",    // รหัสใหม่
        Change_Prod_Name: d.editNewName || "",       // ชื่อใหม่
        Check_Name_Old_Prod: d.Product_Name || "",   // ชื่อเดิม
      }));
      await tx.insert(TEDL_history).values(recordDetails); // หมายเหตุ: แม้ชื่อตัวแปรจะเป็น TEDL_history แต่ใน schema.ts มันชี้ไปที่ EDL_record ครับ

      // --- 3. สร้างฟอร์แมทสำหรับ AS/400 (.tab) ---
      let tab = "";
      const hLine = [
        "H",
        header.Customer_PO || "",
        header.Customer_Num || "",
        header.Oder_Date || "",
        header.Request_Date || "",
        header.Term_Pay || "",
        header.Oder_Qty || "0",
        header.Order_Amount || "0.00",
        header.Discount_Amount || "0.00",
        header.S_Discount_Amount || "0.00",
        header.Tax_Amount || "0.00",
        header.Total_Amount || "0.00",
        header.Ship_To_Address || "",
        header.Order_Note || "",
        header.Generate_Date || "",
        header.Process_Date || "",
        header.Deli_Time || ""
      ].join("|");
      tab += hLine + "\n";

      detailsWithMaster.forEach(d => {
        const dLine = [
          "D",
          d.Customer_PO || "",
          d.Line_Num || "",
          d.Item_Num || "",
          d.Item_Description || "",
          d.Bar_Code_Item || "",
          d.Unit_Measure || "",
          d.Price_Unit || "0.00",
          d.Qty_Order || "0.00",
          d.Free_Qty || "0.00",
          d.Net_Amount || "0.00",
          d.Order_Date || "",
          d.Request_Date || "",
          d.Discount_1 || "0.00",
          d.Discount_2 || "0.00",
          d.Discount_Amount_Unit || "0.00",
          d.Buyer_Internal_Prod_code || "",
          d.Customer_Num || "",
          d.Discount_3 || "0.00"
        ].join("|");
        tab += dLine + "\n";
      });

      // 4. ลบข้อมูลจากตารางพัก (Temp)
      await tx.delete(EDL_temp).where(and(
        eq(EDL_temp.Customer_PO, header.Customer_PO ?? ""),
        eq(EDL_temp.File_Name, header.File_Name ?? "")
      ));
      await tx.delete(EDH_temp).where(eq(EDH_temp.id, headerId));

      // 5. บันทึก Log การทำงาน
      await tx.insert(as400_logs).values({
        historyId: newHistory.id,
        status: "success",
        errorMessage: `โอนข้อมูล PO ${header.Customer_PO} สำเร็จ`,
      });

      return { tabContent: tab };
    });

    revalidatePath("/");
    return { 
      success: true, 
      message: `โอนข้อมูลใบสั่งซื้อ ${header.Customer_PO} สำเร็จ`,
      tabContent: result.tabContent,
      fileName: `${header.Customer_PO}_${new Date().getTime()}.tab`
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
      const headers = await tx.select({
        customerPo: EDH_temp.Customer_PO,
        fileName: EDH_temp.File_Name,
      })
      .from(EDH_temp)
      .where(inArray(EDH_temp.id, headerIds));

      for (const header of headers) {
        await tx.delete(EDL_temp).where(and(
          eq(EDL_temp.Customer_PO, header.customerPo ?? ""),
          eq(EDL_temp.File_Name, header.fileName ?? "")
        ));
      }

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
      importedAtDisplay: sql<string>`TO_CHAR(${TEDH.AS400_Imported_At}, 'DD/MM/YYYY HH24:MI:SS')`,
      createdAt: TEDH.Created_At,
      flag: TEDH.Flag,
      cusNameOp: TEDH.Cus_Name_OP,
      cusProdChange: TEDH.Cus_Prod_Change,
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
      checkBarInt: TEDL.Check_Bar_Int,
      checkNameOldProd: TEDL.Check_Name_Old_Prod,
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
      createdAtDisplay: sql<string>`TO_CHAR(${as400_logs.createdAt}, 'DD/MM/YYYY HH24:MI:SS')`,
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
