"use server";

import { db } from "@/db";
import { Edit_Detail } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { checkSession } from "@/lib/auth-utils";

export async function getEditDetailsAction() {
  try {
    await checkSession();
    const results = await db.query.Edit_Detail.findMany({
      orderBy: [desc(Edit_Detail.createdAt)]
    });
    return results;
  } catch (error) {
    console.error("Error fetching Edit_Detail:", error);
    return [];
  }
}

export async function saveEditDetailAction(data: {
  id?: number;
  BarCode: string;
  Internal_Code1: string;
  Cus_Code?: string | null;
  Prod_Name1?: string | null;
  Internal_Code2: string;
  Prod_Name2?: string | null;
}) {
  try {
    await checkSession();
    
    const values = {
      BarCode: data.BarCode,
      Internal_Code1: data.Internal_Code1,
      Cus_Code: data.Cus_Code,
      Prod_Name1: data.Prod_Name1,
      Internal_Code2: data.Internal_Code2,
      Prod_Name2: data.Prod_Name2,
      lastUsed: new Date()
    };

    if (data.id) {
      await db.update(Edit_Detail).set(values).where(eq(Edit_Detail.id, data.id));
    } else {
      await db.insert(Edit_Detail).values(values);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error saving Edit_Detail:", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteEditDetailAction(id: number) {
  try {
    await checkSession();
    await db.delete(Edit_Detail).where(eq(Edit_Detail.id, id));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Edit_Detail:", error);
    return { success: false, error: String(error) };
  }
}