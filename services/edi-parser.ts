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

        let Order_Amount = "";
        for (let i = 98; i <= 110; i++) { Order_Amount += S[i - 1] || ""; if (i === 108) Order_Amount += "."; }

        await db.insert(EDH_temp).values({
          H_Type: "H",
          Customer_PO: Customer_PO.trim(), 
          Customer_Num: Customer_Num.trim(),
          Date_PO: Oder_Date.trim(),
          Date_Ship: Request_Date.trim(),
          Total_Amount: Order_Amount.trim() || "0.00",
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

        let Unit_Price = "";
        for (let i = 102; i <= 108; i++) { Unit_Price += S[i - 1] || ""; if (i === 106) Unit_Price += "."; }

        let Order_Qty = ""; 
        for (let i = 109; i <= 115; i++) { Order_Qty += S[i - 1] || ""; if (i === 73) Order_Qty += "."; } //73เท่านั้น

        let Free_Oty = "";
        for (let i = 116; i <= 122; i++) { Free_Oty += S[i - 1] || ""; if (i === 84) Free_Oty += "."; }//84เท่านั้น

        let Net_Amount = ""; 
        for (let i = 123; i <= 133; i++) { Net_Amount += S[i - 1] || ""; if (i === 131) Net_Amount += "."; }

        let Discount_1 = "";
        for (let i = 150; i <= 154; i++) { Discount_1 += S[i - 1] || ""; if (i === 152) Discount_1 += "."; }

        let Discount_2 = "";
        for (let i = 155; i <= 159; i++) { Discount_2 += S[i - 1] || ""; if (i === 157) Discount_2 += "."; }

        let Discount_3 = "";
        if (S.length >= 260) {
          for (let i = 256; i <= 260; i++) { Discount_3 += S[i - 1] || ""; if (i === 258) Discount_3 += "."; }
        }

        await db.insert(EDL_temp).values({
          Customer_PO: Customer_PO.trim(),
          Line_Num: Line_Num.trim(),
          Product_Name: Item_Description.trim(),
          Item_Num: Item_Num.trim(),
          EAN_Num: Bar_Code_Item.trim(),
          Price_Unit: Unit_Price.trim() || "0.00",
          Qty_Order: Order_Qty.trim() || "0",
          Free_Qty: Free_Oty.trim() || "0",
          Total_Amount: Net_Amount.trim() || "0.00",
          Discount_1: Discount_1.trim() || "0.00",
          Discount_2: Discount_2.trim() || "0.00",
          Discount_3: Discount_3.trim() || "0.00",
          File_Name: fileName,
        });
        detailCount++;
      }
    }

    revalidatePath("/");
    return { success: true, headerCount, detailCount };
  } catch (err) {
    console.error(err);
    return { success: false, error: String(err) };
  }
}