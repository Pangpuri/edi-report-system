"use client";

import { useState } from "react";
import { FileDown, ChevronDown, FileText, Table as TableIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TabType } from "@/app/edi";

interface ExportDataProps {
  activeTab: TabType;
}

/**
 * Component ปุ่มโหลดไฟล์แบบ Dropdown สำหรับ Export ข้อมูล
 * รองรับการโหลดทั้งแบบ .TAB (EDI win-874) และ .CSV (Excel utf-8)
 * 
 * @param props - Properties ที่รับเข้ามา (ในที่นี้คือ activeTab สี่ถูกเลือกในปัจจุบัน)
 */
export default function ExportData({ activeTab }: ExportDataProps) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * ฟังก์ชันสำหรับจัดการการ Export ข้อมูลตาม Format ที่เลือก
   */
  const handleExport = (format: "tab" | "csv") => {
    const tableName = activeTab === "product" ? "prodcode" : activeTab;
    window.location.href = `/api/export?table=${tableName}&format=${format}`;
    setIsOpen(false);
  };

  return (
    // 🛡️ เพิ่ม z-[50] ตรงจุดนี้เพื่อให้ปุ่มและ Dropdown มีสิทธิ์เหนือ Layer อื่นในหน้า Dashboard
    <div className="relative inline-block text-left z-[50]">
      {/* ปุ่มหลักสำหรับเปิด Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 group"
      >
        <FileDown className="w-5 h-5 group-hover:animate-bounce" />
        <span className="text-sm">Export Data ({activeTab})</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu พร้อม Animate */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 🛡️ Backdrop: ใช้ z-[90] และ fixed เพื่อคลุมทั้งจอและดัก Event คลิก */}
            <div 
              className="fixed inset-0 z-[110] bg-transparent" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              // 🛡️ แก้ไขจุดตาย: ต้องใช้ z-[100] (มีก้ามปู) และปรับพื้นหลังให้ทึบขึ้นเล็กน้อยเพื่อสู้กับแสง Backdrop
              className="absolute right-0 mt-3 w-64 bg-ui-card border border-ui-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[120] overflow-hidden backdrop-blur-2xl"
>
              <div className="p-2 space-y-1">
                {/* ตัวเลือก .TAB */}
                <button
                  onClick={() => handleExport("tab")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ui-text hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl transition-all group"
                >
                  <div className="p-2 bg-ui-bg rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <FileText className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold">📤 Export as .TAB</span>
                    <span className="text-[10px] text-ui-muted uppercase tracking-wider font-semibold">EDI Format (WIN874)</span>
                  </div>
                </button>

                {/* ตัวเลือก .CSV */}
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ui-text hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl transition-all group"
                >
                  <div className="p-2 bg-ui-bg rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <TableIcon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold">📊 Export as .CSV</span>
                    <span className="text-[10px] text-ui-muted uppercase tracking-wider font-semibold">Excel Format (UTF-8)</span>
                  </div>
                </button>
              </div>

              <div className="bg-ui-bg/50 p-2 border-t border-ui-border">
                <p className="text-[10px] text-center text-ui-muted font-medium italic">
                  * Exporting <span className="text-emerald-500 font-bold">{activeTab}</span>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
