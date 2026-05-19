import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ 1. เปิดทางให้ Turbopack
  turbopack: {},

  // ✅ 2. ตั้งค่าความปลอดภัยสำหรับ IP
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.10.141:3000", "192.168.10.130:3000", "localhost:3000"],
      bodySizeLimit: "10mb",
    },
  },

  // ✅ 3. ปรับแต่ง Webpack - นำส่วนที่ทำให้เกิด Path เพี้ยนออกเพื่อให้รองรับ Nested Routes ได้ถูกต้อง
  webpack: (config, { dev, isServer }) => {
    return config;
  },

  // ✅ 4. นำ assetPrefix ออกเพื่อให้ Next.js จัดการ Path ตามมาตรฐาน (แก้ปัญหา 404 บน Nested Routes)
  assetPrefix: undefined,
};

export default nextConfig;