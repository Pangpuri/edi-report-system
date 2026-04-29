"use client";

import { AlertCircle } from "lucide-react";

export function AbnormalData() {
  return (
    <div className="bg-ui-card p-20 rounded-[2.5rem] border border-ui-border text-center">
      <div className="w-20 h-20 bg-status-error/10 rounded-3xl flex items-center justify-center text-status-error mx-auto mb-6">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-2xl font-black text-ui-text mb-2 uppercase tracking-tighter">ข้อมูลที่ผิดปกติ</h2>
      <p className="text-ui-muted text-sm max-w-md mx-auto italic">
        ตรวจสอบรายการที่พบความผิดปกติในกระบวนการ EDI
        <br />(อยู่ระหว่างการพัฒนาระบบเทียบลอจิก)
      </p>
    </div>
  );
}
