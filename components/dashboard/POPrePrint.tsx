"use client";

import { FileText } from "lucide-react";

export function POPrePrint() {
  return (
    <div className="bg-ui-card p-20 rounded-[2.5rem] border border-ui-border text-center">
      <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary mx-auto mb-6">
        <FileText size={40} />
      </div>
      <h2 className="text-2xl font-black text-ui-text mb-2 uppercase tracking-tighter">ข้อมูลก่อนพิมพ์ (PO/Detail)</h2>
      <p className="text-ui-muted text-sm max-w-md mx-auto italic">
        ส่วนแสดงข้อมูลใบสั่งซื้อก่อนทำการพิมพ์ออกมาเป็นเอกสาร
        <br />(อยู่ระหว่างการพัฒนาระบบเทียบลอจิก)
      </p>
    </div>
  );
}
