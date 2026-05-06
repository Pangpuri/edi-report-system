import iconv from "iconv-lite";
import { db } from "@/db";
import { EDH_temp, EDL_temp } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function parseEDIFileDelphi(
  buffer: Buffer,
  fileName: string,
  shouldClear: boolean = true,
) {
  try {
    // 1. Decode ด้วย cp874 ตามต้นฉบับ
    const text = iconv.decode(buffer, "cp874");
    const lines = text.split(/\r?\n/);

    if (shouldClear) {
      await db.delete(EDH_temp);
      await db.delete(EDL_temp);
    }

    let headerCount = 0;
    let detailCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      const S = line;

      if (S[0] === "H") {
      
        let Customer_PO = "";
        for (let i = 2; i <= 16; i++) { Customer_PO += S[i - 1] || ""; }

        let Customer_Num = "";
        for (let i = 17; i <= 22; i++) { Customer_Num += S[i - 1] || ""; }
        
        
        if (S.length >= 241) {
          let SBuff_New = "";
          for (let i = 227; i <= 241; i++) { SBuff_New += S[i - 1] || ""; }
          Customer_Num = SBuff_New;
        }

        let Oder_Date = "";
        for (let i = 23; i <= 30; i++) { Oder_Date += S[i - 1] || ""; }

        let Request_Date = "";
        for (let i = 31; i <= 38; i++) { Request_Date += S[i - 1] || ""; }

        let Term_Pay = "";
        for (let i = 39; i <= 41; i++) { Term_Pay += S[i - 1] || ""; }

        let Oder_Qty = "";
        for (let i = 45; i <= 51; i++) { Oder_Qty += S[i - 1] || ""; }

        let Order_Amount = "";
        for (let i = 52; i <= 64; i++) { Order_Amount += S[i - 1] || ""; if (i === 62) Order_Amount += "."; }

        let Discount_Amount = "";
        for (let i = 65; i <= 75; i++) { Discount_Amount += S[i - 1] || ""; if (i === 73) Discount_Amount += "."; }

        let S_Discount_Amount = "";
        for (let i = 76; i <= 86; i++) { S_Discount_Amount += S[i - 1] || ""; if (i === 84) S_Discount_Amount += "."; }

        let Tax_Amount = "";
        for (let i = 87; i <= 97; i++) { Tax_Amount += S[i - 1] || ""; if (i === 95) Tax_Amount += "."; }

        let Total_Amount = "";
        for (let i = 98; i <= 110; i++) { Total_Amount += S[i - 1] || ""; if (i === 108) Total_Amount += "."; }

        let Ship_To_Address = "";
        for (let i = 111; i <= 160; i++) { Ship_To_Address += S[i - 1] || ""; }

        let Order_Note = "";
        for (let i = 161; i <= 210; i++) { Order_Note += S[i - 1] || ""; }

        let Generate_Date = "";
        for (let i = 211; i <= 218; i++) { Generate_Date += S[i - 1] || ""; }

        let Process_Date = "";
        for (let i = 219; i <= 226; i++) { Process_Date += S[i - 1] || ""; }

        let Deli_Time = "";
        if (S.length >= 337) {
          let SBuff_Deli = "";
          for (let i = 334; i <= 337; i++) { SBuff_Deli += S[i - 1] || ""; }
          Deli_Time = SBuff_Deli;
        }

        await db.insert(EDH_temp).values({
  H_Type: "H",
  Customer_PO: Customer_PO.trim(), 
  Customer_Num: Customer_Num.trim(),
  Oder_Date: Oder_Date.trim(),    
  Request_Date: Request_Date.trim(),
  Term_Pay: Term_Pay.trim(),
  Oder_Qty: Oder_Qty.trim() || "0",
  Order_Amount: Order_Amount.trim() || "0.00",
  Discount_Amount: Discount_Amount.trim() || "0.00",
  Tax_Amount: Tax_Amount.trim() || "0.00",
  Total_Amount: Total_Amount.trim() || "0.00",
  Generate_Date: Generate_Date.trim(),
  Process_Date: Process_Date.trim(),
  Ship_To_Address: Ship_To_Address.trim(),
  Order_Note: Order_Note.trim(),
  Deli_Time: Deli_Time.trim(),
  File_Name: fileName,
});
        headerCount++;

      } else if (S[0] === "D") {

        let Customer_PO = "";
        for (let i = 2; i <= 16; i++) { Customer_PO += S[i - 1] || ""; }

        let Line_Num = "";
        for (let i = 23; i <= 25; i++) { Line_Num += S[i - 1] || ""; }

        let Item_Num = "";
        for (let i = 26; i <= 40; i++) { Item_Num += S[i - 1] || ""; }

        let Item_Description = "";
        for (let i = 41; i <= 85; i++) { Item_Description += S[i - 1] || ""; }

        let Bar_Code_Item = "";
        for (let i = 86; i <= 99; i++) { Bar_Code_Item += S[i - 1] || ""; }

        let Unit_Measure = "";
        for (let i = 100; i <= 101; i++) { Unit_Measure += S[i - 1] || ""; }

        let Unit_Price = "";
        for (let i = 102; i <= 108; i++) { Unit_Price += S[i - 1] || ""; if (i === 106) Unit_Price += "."; }

        let Order_Qty = "";
        for (let i = 109; i <= 115; i++) { Order_Qty += S[i - 1] || ""; if (i === 73) Order_Qty += "."; } 

        let Free_Oty = "";
        for (let i = 116; i <= 122; i++) { Free_Oty += S[i - 1] || ""; if (i === 84) Free_Oty += "."; } 

        let Net_Amount = "";
        for (let i = 123; i <= 133; i++) { Net_Amount += S[i - 1] || ""; if (i === 131) Net_Amount += "."; }

        let Order_Date = "";
        for (let i = 134; i <= 141; i++) { Order_Date += S[i - 1] || ""; }

        let Request_Date = "";
        for (let i = 142; i <= 149; i++) { Request_Date += S[i - 1] || ""; }

        let Discount_1 = "";
        for (let i = 150; i <= 154; i++) { Discount_1 += S[i - 1] || ""; if (i === 152) Discount_1 += "."; }

        let Discount_2 = "";
        for (let i = 155; i <= 159; i++) { Discount_2 += S[i - 1] || ""; if (i === 157) Discount_2 += "."; }

        let Discount_Amount_Unit = "";
        for (let i = 160; i <= 174; i++) { Discount_Amount_Unit += S[i - 1] || ""; if (i === 172) Discount_Amount_Unit += "."; }

        let Buyer_Internal_Prod_code = "";
        for (let i = 175; i <= 188; i++) { Buyer_Internal_Prod_code += S[i - 1] || ""; }

        let Customer_Num = "";
        for (let i = 189; i <= 203; i++) { Customer_Num += S[i - 1] || ""; }

        let Discount_3 = "";
        if (S.length >= 260) {
          for (let i = 256; i <= 260; i++) { Discount_3 += S[i - 1] || ""; if (i === 258) Discount_3 += "."; }
        }

await db.insert(EDL_temp).values({
  D_Type: "D",
  Customer_PO: Customer_PO.trim(),
  Line_Num: Line_Num.trim(),
  Item_Num: Item_Num.trim(),
  Item_Description: Item_Description.trim(),
  Bar_Code_Item: Bar_Code_Item.trim(),
  Unit_Measure: Unit_Measure.trim(),
  Unit_Price: Unit_Price.trim() || "0.00",
  Order_Qty: Order_Qty.trim() || "0",
  Net_Amount: Net_Amount.trim() || "0.00",
  Order_Date: Order_Date.trim(),
  Request_Date: Request_Date.trim(),
  Discount_1: Discount_1.trim() || "0.00",
  Discount_2: Discount_2.trim() || "0.00",
  Discount_Amount_Unit: Discount_Amount_Unit.trim() || "0.00",
  Buyer_Internal_Prod_code: Buyer_Internal_Prod_code.trim(),
  Customer_Num: Customer_Num.trim(),
  Discount_3: Discount_3.trim() || "0.00",
  File_Name : fileName,
});        detailCount++;
      }
    }

    revalidatePath("/");
    return { success: true, headerCount, detailCount };
  } catch (err) {
    console.error(err);
    return { success: false, error: String(err) };
  }
}