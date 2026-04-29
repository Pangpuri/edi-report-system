"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({ isOpen, isPending, onClose, onConfirm }: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ui-bg/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }} 
            className="bg-ui-card border border-ui-border p-8 rounded-[2.5rem] max-w-md w-full shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
          >
            <div className="p-4 bg-status-error/10 w-fit rounded-2xl mb-6">
              <span className="text-3xl text-status-error">⚠️</span>
            </div>
            <h3 className="text-2xl font-black text-ui-text mb-2">ยืนยันการลบข้อมูล?</h3>
            <p className="text-ui-muted text-sm mb-8 leading-relaxed font-medium">
              การกระทำนี้จะลบข้อมูลออกจากฐานข้อมูลและไม่สามารถกู้คืนถาวร โปรดตรวจสอบความถูกต้องก่อนกดยืนยัน
            </p>
            <div className="flex gap-4">
              <button 
                onClick={onClose} 
                disabled={isPending} 
                className="flex-1 py-3 text-sm font-bold text-ui-muted hover:text-ui-text transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button 
                onClick={onConfirm} 
                disabled={isPending} 
                className="flex-[2] bg-status-error hover:brightness-110 active:scale-95 px-6 py-3 rounded-2xl text-sm font-black text-white transition-all shadow-xl shadow-status-error/20 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "กำลังดำเนินการ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
