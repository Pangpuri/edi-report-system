import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ 1. เปิดทางให้ Turbopack (ใส่แค่นี้มันจะเงียบปากค่ะ)
  turbopack: {},

  // ✅ 2. ตั้งค่าความปลอดภัยสำหรับ IP
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.10.130:3000", "localhost:3000"],
    },
  },

  // ✅ 3. ปรับแต่ง Webpack (มากิใส่เงื่อนไขไว้ให้แล้ว จะได้ไม่ตีกับ Turbopack)
  // ส่วนนี้จะทำงานก็ต่อเมื่อปังรันด้วย --webpack เท่านั้นค่ะ
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer && config.output) {
      config.output.publicPath = 'http://192.168.10.130:3000/_next/';
    }
    return config;
  },

  // ✅ 4. เพิ่ม Asset Prefix เพื่อให้ Browser หาไฟล์เจอผ่าน IP
  assetPrefix: process.env.NODE_ENV === 'development' ? 'http://192.168.10.130:3000' : undefined,
};

export default nextConfig;