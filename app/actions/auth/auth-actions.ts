"use server";

import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sql, eq } from "drizzle-orm";

/**
 * Interface สำหรับข้อมูลที่รับมาจากแบบฟอร์มการลงทะเบียน
 */
interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  phone: string;
}

/**
 * ลงทะเบียนผู้ใช้ใหม่
 * หากเป็นคนแรกในระบบ จะได้สิทธิ์เป็น admin โดยอัตโนมัติ นอกนั้นจะได้สิทธิ์ user ปกติ
 * 
 * @param formData - ข้อมูลสำหรับใช้ลงทะเบียน
 * @returns {Promise<{success: boolean, role?: string, error?: string}>} สถานะและสิทธิ์ที่ได้รับ
 */
export async function registerUserAction(formData: RegisterFormData) {
  try {
    // 1. เช็คว่ามี User ในระบบหรือยัง (Type-safe SQL Result)
    const userCountResult = await db.execute<{ count: string }>(
      sql`SELECT count(*) as count FROM "user"`
    );
    const userCount = Number(userCountResult.rows[0]?.count ?? 0);

    // 2. กำหนด Role (คนแรกเป็น admin, ที่เหลือเป็น user)
    const role: "admin" | "user" = userCount === 0 ? "admin" : "user";

    // 3. ใช้ Better Auth ในการสร้าง User
    const result = await auth.api.signUpEmail({
      body: {
        email: formData.email,
        password: formData.password,
        name: formData.name,
      },
      headers: await headers()
    });

    if (result) {
      // 4. อัปเดต Role และ Phone หลังจากสมัครสำเร็จ
      // ใช้ eq ที่ import มาจาก drizzle-orm
      await db.update(user)
        .set({ 
          role: role,
          phone: formData.phone 
        })
        .where(eq(user.email, formData.email));
      
      return { success: true, role };
    }

    return { success: false, error: "เกิดข้อผิดพลาดในการลงทะเบียน" };
  } catch (error: unknown) {
    console.error("Registration Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "ลงทะเบียนไม่สำเร็จ" 
    };
  }
}