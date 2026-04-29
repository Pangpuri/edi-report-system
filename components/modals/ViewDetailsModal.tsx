"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MasterData } from "@/app/edi";

interface ViewDetailsModalProps {
  target: MasterData | null;
  onClose: () => void;
}

export function ViewDetailsModal({ target, onClose }: ViewDetailsModalProps) {
  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[100] flex justify-center bg-ui-bg/95 backdrop-blur-xl overflow-y-auto p-4 items-start sm:items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 40 }} 
            className="w-full max-w-2xl my-auto"
          >
            <div className="bg-ui-card rounded-3xl border border-ui-border shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-ui-border bg-ui-bg/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">👁️</div>
                  <h2 className="text-xl font-black text-ui-text uppercase tracking-tight">รายละเอียดข้อมูล</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-ui-bg rounded-xl transition-all text-ui-muted">✕</button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {Object.entries(target).map(([key, value]) => (
                    <div key={key} className="space-y-1.5 border-b border-ui-border/50 pb-3">
                      <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                      <div className="text-sm font-bold text-ui-text break-words">
                        {value !== null && value !== undefined && value !== "" ? String(value) : <span className="text-ui-muted font-normal italic opacity-50">ไม่มีข้อมูล</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-ui-bg/50 border-t border-ui-border flex justify-end">
                <button 
                  onClick={onClose} 
                  className="px-8 py-2.5 bg-ui-card border border-ui-border text-ui-text rounded-xl font-black text-xs hover:border-brand-primary/50 hover:text-brand-primary transition-all shadow-sm active:scale-95"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
