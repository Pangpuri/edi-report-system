"use client";

import React from "react";

export function ManageDataManagement() {
  return (
    <div className="bg-ui-card p-10 rounded-xl border border-ui-border shadow-lg min-h-[600px] flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-6 text-4xl shadow-inner border border-brand-primary/20">
        🛠️
      </div>
      <h2 className="text-2xl font-black text-brand-primary uppercase tracking-tight mb-3">
        ระบบจัดการข้อมูล (Coming Soon)
      </h2>
      <p className="text-ui-muted max-w-md font-medium leading-relaxed">
        ส่วนนี้สำหรับจัดการข้อมูลเชิงลึกหรือการตั้งค่าระบบเพิ่มเติม ซึ่งกำลังอยู่ในขั้นตอนการพัฒนาเพื่อเพิ่มประสิทธิภาพในการจัดการฐานข้อมูล EDI ของคุณ
      </p>
    </div>
  );
}