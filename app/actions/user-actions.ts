"use server";

import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { user, account } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";

// 🛡️ Schema
const userSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().trim().email().toLowerCase().max(50),
  phone: z.string().trim().min(9).max(13).optional().nullable(),
  role: z.enum(["admin", "user"]),
  password: z.string().trim().min(8).max(50).optional().nullable(),
});

// 🔹 Types
type UserInput = z.infer<typeof userSchema>;
type PartialUserInput = Partial<UserInput>;

// createUser
export async function createUserAction(data: UserInput) {
  try {
    const validated = userSchema.parse(data);
    const cleanPhone = validated.phone?.replace(/\s/g, "") || "";

    const createResult = await auth.api.signUpEmail({
      body: {
        email: validated.email,
        password: validated.password || "12345678",
        name: validated.name,
        username: cleanPhone || validated.email.split("@")[0],
      },
      headers: new Headers(),
    });

    if (!createResult?.user) {
      throw new Error("Registration failed at Auth level");
    }

    await db
      .update(user)
      .set({
        role: validated.role,
        phone: cleanPhone,
        displayUsername: validated.name,
        emailVerified: true,
      })
      .where(eq(user.id, createResult.user.id));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Create User Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ไม่สามารถเพิ่มผู้ใช้ได้",
    };
  }
}


 // Update User
 
export async function updateUserAction(
  userId: string,
  data: PartialUserInput
) {
  try {
    const validated = userSchema.partial().parse(data);
    const { phone, password, email, name, role } = validated;

    // 🔐 1. Update Password
    if (password && password.trim() !== "") {
      try {
        console.log("🔑 Hashing password for:", userId);

        const hashedPassword = await hashPassword(password);

        const result = await db
          .update(account)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(account.userId, userId));

        console.log("✅ Rows affected:", result.rowCount);
      } catch (error) {
        console.error("❌ Password Update Failed:", error);
        throw new Error(
          error instanceof Error ? error.message : "Password update failed"
        );
      }
    }

    //  2. Update User Data
    await db.transaction(async (tx) => {
      const uData: Partial<typeof user.$inferInsert> = {};

      if (name) uData.name = name;
      if (role) uData.role = role;

      if (phone) {
        const clean = phone.replace(/\s/g, "");
        uData.phone = clean;
        uData.username = clean;
      }

      if (email) uData.email = email;

      if (Object.keys(uData).length > 0) {
        await tx.update(user).set(uData).where(eq(user.id, userId));
      }

      // sync email → account
      if (email) {
        await tx
          .update(account)
          .set({ accountId: email })
          .where(
            and(eq(account.userId, userId), eq(account.providerId, "email"))
          );
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Update User Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดต",
    };
  }
}

//getUsers
export async function getUsersAction() {
  try {
    const data = await db.select().from(user).orderBy(user.createdAt);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "ดึงข้อมูลล้มเหลว" };
  }
}

//deleteUser
export async function deleteUserAction(userId: string) {
  try {
    await db.delete(user).where(eq(user.id, userId));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete User Error:", error);
    return { success: false, error: "ลบผู้ใช้ล้มเหลว" };
  }
}