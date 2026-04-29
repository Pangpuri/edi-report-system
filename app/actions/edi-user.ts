"use server";

import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkSession } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

/**
 * 🛡️ Helper: Ensure the current user is an admin
 */
async function ensureAdmin() {
  const session = await checkSession();
  const sessionUser = session.user as (typeof session.user & { role?: string });
  if (sessionUser.role !== "admin") {
    throw new Error("Unauthorized: เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการผู้ใช้ได้");
  }
  return session;
}

/**
 * 👥 ดึงรายชื่อผู้ใช้ทั้งหมด (สำหรับ Admin)
 */
export async function getAllUsersAction() {
  try {
    await ensureAdmin();
    const users = await db.select().from(user).orderBy(user.createdAt);
    return { success: true, data: users };
  } catch (error) {
    console.error("❌ Get Users Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลผู้ใช้ได้" };
  }
}

/**
 * 🎖️ เปลี่ยนสิทธิ์ผู้ใช้ (Promote/Demote)
 */
export async function updateUserRoleAction(userId: string, newRole: "admin" | "user" | "staff") {
  try {
    await ensureAdmin();
    await db.update(user).set({ role: newRole }).where(eq(user.id, userId));
    revalidatePath("/admin/users"); // เผื่อทำหน้าจัดการ user ในอนาคต
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนสิทธิ์ได้" };
  }
}

/**
 * 📝 แก้ไขข้อมูลส่วนตัวผู้ใช้ (โดย Admin)
 */
export async function updateUserDetailsAction(userId: string, data: { name?: string; email?: string; phone?: string }) {
  try {
    await ensureAdmin();
    await db.update(user).set(data).where(eq(user.id, userId));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้" };
  }
}

/**
 * 🚫 แบน/ปิดกั้นผู้ใช้ (ตัวอย่างการทำ Ban โดยการเปลี่ยน Role หรือเพิ่ม Field)
 * ในที่นี้สมมติว่าถ้า Role เป็น 'banned' จะเข้าใช้งานไม่ได้
 */
export async function banUserAction(userId: string) {
  try {
    await ensureAdmin();
    await db.update(user).set({ role: "banned" }).where(eq(user.id, userId));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถแบนผู้ใช้ได้" };
  }
}
