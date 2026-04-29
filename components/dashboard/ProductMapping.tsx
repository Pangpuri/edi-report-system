"use client";

import { RefreshCw } from "lucide-react";

export function ProductMapping() {
  return (
    <div className="bg-ui-card p-20 rounded-[2.5rem] border border-ui-border text-center">
      <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary mx-auto mb-6">
        <RefreshCw size={40} />
      </div>
      <h2 className="text-2xl font-black text-ui-text mb-2 uppercase tracking-tighter">รายการสินค้าที่ต้องเปลี่ยนรหัส</h2>
      <p className="text-ui-muted text-sm max-w-md mx-auto italic">
        จัดการการจับคู่รหัสสินค้าระหว่างระบบภายนอกและรหัสสินค้าภายใน
        <br />(อยู่ระหว่างการพัฒนาระบบเทียบลอจิก)
      </p>
    </div>
  );
}
