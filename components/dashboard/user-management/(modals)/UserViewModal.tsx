"use client";

import { motion, AnimatePresence } from "framer-motion";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  phone?: string | null;
  username?: string | null;
  password?: string | null;
}

interface UserViewModalProps {
  target: User | null;
  onClose: () => void;
}

export function UserViewModal({ target, onClose }: UserViewModalProps) {
  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-ui-bg/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-ui-card border border-ui-border p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl"
          >
            <div className="text-center mb-8">
               <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">👤</div>
               <h3 className="text-2xl font-black text-ui-text tracking-tight">{target.name || "N/A"}</h3>
               <p className="text-xs font-black text-brand-primary uppercase tracking-widest">{target.role}</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-ui-bg/50 rounded-2xl border border-ui-border/50">
                <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest block mb-1">Email Address</label>
                <p className="text-sm font-bold text-ui-text">{target.email}</p>
              </div>
              <div className="p-4 bg-ui-bg/50 rounded-2xl border border-ui-border/50">
                <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest block mb-1">Phone / Username</label>
                <p className="text-sm font-bold text-ui-text">{target.phone || target.username || "ไม่ได้ระบุ"}</p>
              </div>
              <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest block mb-1">Current Password</label>
                <p className="text-sm font-mono font-bold text-ui-text">{target.password || "******** (Hashed)"}</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-4 bg-ui-text text-ui-bg rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
