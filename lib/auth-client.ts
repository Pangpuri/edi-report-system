"use client";

import { createAuthClient } from "better-auth/react";
// 🚩 เพิ่ม adminClient เข้ามาเป็นเพื่อนกับ usernameClient ค่ะ
import { usernameClient, adminClient } from "better-auth/client/plugins"; 

/**
 * 💡 ทริคจากมากิ (V2): จัดการเรื่อง URL ให้สมบูรณ์
 */
const getBaseURL = () => {
    if (typeof window !== "undefined") {
        return window.location.origin; 
    }
    // สำหรับฝั่ง Server (ถ้ามีเรียกใช้) ให้ดึงจาก env ที่เราแก้เป็น IP แล้ว
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

const baseURL = getBaseURL();
console.log("🛠️ Auth Client BaseURL (Active):", baseURL);

export const authClient = createAuthClient({
    baseURL: baseURL,
    
    user: {
        additionalFields: {
            role: { type: "string" },
            phone: { type: "string" },
            username: { type: "string" },
            displayUsername: { type: "string" },
        }
    },
    
    // ✅ จุดสำคัญที่สุด: ต้องมีทั้งคู่ถึงจะคุยกับ Admin API รู้เรื่องค่ะ
    plugins: [
        adminClient(),    // 🚩 ตัวนี้จะทำให้หน้าบ้านส่งสิทธิ์ Admin ไปหา Server ได้
        usernameClient(), 
    ],
});

// ✅ Export สำหรับนำไปใช้งาน
export const { signIn, signUp, signOut, useSession, admin } = authClient; 
// 💡 มากิเพิ่ม 'admin' ออกมาให้ด้วย เผื่อกัปตันอยากใช้เช็คสิทธิ์หน้าบ้านค่ะ