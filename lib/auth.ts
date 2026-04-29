// 🛡️ ฉบับจัดการ Any และรองรับการเก็บเบอร์โทรจริง + เปิดโหมด Admin
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { nextCookies } from "better-auth/next-js";
import { username, admin } from "better-auth/plugins"; // 🚩 เพิ่ม admin plugin เข้ามา

/**
 * โครงสร้างข้อมูลบริบทของผู้ใช้ (User Context)
 */
interface AuthUserContext {
    email: string;
    username?: string;
    displayUsername?: string;
    phone?: string;
    [key: string]: unknown;
}

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: { ...schema },
    }),

    // ตั้งค่า Cookie ให้ทำงานบน HTTP ได้ (สำหรับระบบ LAN/Internal)
    advancedCookies: {
        sessionToken: {
            name: "better-auth.session-token",
            attributes: {
                sameSite: "lax",
                secure: false, // 👈 ปิดเพื่อให้ส่ง cookie ผ่าน http ได้
            }
        }
    },

    trustedOrigins: [
        "http://192.168.10.130:3000",
        "http://localhost:3000"
    ],

    user: {
    additionalFields: {
        displayUsername: { 
            type: "string", 
            required: false, 
            input: true,
            storageKey: "display_username" // 👈 ระบุให้ตรงกับชื่อคอลัมน์ในตาราง user
        },
        role: { 
            type: "string", 
            required: false, 
            input: false, // ป้องกันไม่ให้ User ทั่วไปเปลี่ยนสิทธิ์ตัวเองผ่าน Register
            storageKey: "role" 
        },
        phone: { 
            type: "string", 
            required: false, 
            input: true,
            storageKey: "phone" 
        }
    }
},

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },

    plugins: [
        username(), 
        nextCookies(),
        admin(), // 🚩 หัวใจสำคัญ: เปิดให้ Admin แก้ไขข้อมูล (รวมถึง Password) ของ User คนอื่นได้
    ],

    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    try {
                        const context = user as AuthUserContext;
                        const fallbackUsername = user.email.split('@')[0];
                        
                        const finalUsername = 
                            (typeof context.username === 'string' ? context.username : null) || 
                            (typeof context.displayUsername === 'string' ? context.displayUsername : null) || 
                            fallbackUsername;

                        // ถ้าไม่มีเบอร์ส่งมา ให้ใช้ username แทนไปก่อน
                        const finalPhone = typeof context.phone === 'string' ? context.phone : finalUsername;

                        return {
                            data: {
                                ...user,
                                role: "user", // ค่าเริ่มต้นเมื่อสมัครเอง
                                phone: finalPhone,
                                displayUsername: finalUsername,
                            },
                        };
                    } catch (error) {
                        console.error("❌ Auth Hook Error:", error);
                        return { data: user };
                    }
                }
            }
        }
    },
});