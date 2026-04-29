"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createUserAction, updateUserAction } from "@/app/actions/user-actions";
import { useToast } from "@/components/ToastProvider";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  phone?: string;
  displayUsername?: string;
  password?: string;
  username?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  target: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({ isOpen, target, onClose, onSuccess }: EditUserModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: target?.name || "",
    email: target?.email || "",
    role: (target?.role as "admin" | "user") || "user",
    phone: target?.phone || target?.username || "",
    password: "" 
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = target 
        ? await updateUserAction(target.id, formData)
        : await createUserAction(formData);
      
      if (res.success) {
        // 🚀 Success: Close modal FIRST
        showToast(target ? "แก้ไขข้อมูลผู้ใช้สำเร็จ" : "เพิ่มผู้ใช้งานใหม่สำเร็จ", "success");
        onSuccess();
      } else {
        showToast(res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-ui-bg/80 backdrop-blur-md">
          <motion.form 
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="bg-ui-card border border-ui-border p-8 rounded-[3rem] max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-2xl font-black text-ui-text mb-6">
              {target ? "แก้ไขข้อมูลผู้ใช้" : "เพิ่มผู้ใช้งานใหม่"}
            </h3>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-2">
                <label className="text-[15px] font-black text-ui-muted uppercase tracking-widest">ชื่อ-นามสกุล</label>
                {target && <span className="text-[13px] text-brand-secondary font-bold">ข้อมูลเดิม: {target.name}</span>}
              </div>
              <input 
                required 
                maxLength={100}
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="ระบุชื่อ-นามสกุล"
                className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-sm font-bold focus:outline-none focus:border-brand-primary/50 transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-2">
                <label className="text-[15px] font-black text-ui-muted uppercase tracking-widest">อีเมล</label>
                {target && <span className="text-[13px] text-brand-secondary font-bold truncate max-w-[150px]">เดิม: {target.email}</span>}
              </div>
              <input 
                type="email" 
                required 
                maxLength={150}
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder="example@company.com"
                className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-sm font-bold focus:outline-none focus:border-brand-primary/50 transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-2">
                <label className="text-[15px] font-black text-ui-muted uppercase tracking-widest">เบอร์โทรศัพท์ (ใช้ Login)</label>
                {target && <span className="text-[13px] text-brand-secondary font-bold">เดิม: {target.phone || target.username || "-"}</span>}
              </div>
              <input 
                maxLength={20}
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, "")})} 
                placeholder="08XXXXXXXX"
                className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-sm font-bold focus:outline-none focus:border-brand-primary/50 transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-black text-brand-secondary uppercase tracking-widest ml-2">
                {target ? "เปลี่ยนรหัสผ่านใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)" : "กำหนดรหัสผ่าน (8 หลักขึ้นไป)"}
              </label>
              <input 
                type="password" 
                maxLength={50}
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="••••••••"
                className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-sm font-bold focus:outline-none focus:border-brand-primary/50 transition-all" 
              />
            </div>

            <div className="space-y-1.5 pb-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[15px] font-black text-ui-muted uppercase tracking-widest">สิทธิ์การใช้งาน</label>
                {target && <span className="text-[13px] text-brand-secondary font-bold uppercase">เดิม: {target.role}</span>}
              </div>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as "admin" | "user"})} className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-sm font-bold focus:outline-none transition-all">
                <option value="user">USER (อ่านได้อย่างเดียว)</option>
                <option value="admin">ADMIN (จัดการระบบได้)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-black uppercase text-ui-muted">ยกเลิก</button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-brand-primary/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
