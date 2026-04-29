"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      let formatted = value;
      if (value.length > 3 && value.length <= 6) {
        formatted = `${value.slice(0, 3)} ${value.slice(3)}`;
      } else if (value.length > 6) {
        formatted = `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`;
      }
      setPhone(formatted);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanPhone = phone.replace(/\s/g, "");
    
    const { error: signUpError } = await authClient.signUp.email(
      {
        email: (email.trim() || `${cleanPhone}@edi-system.local`).toLowerCase(),
        password: password.trim(),
        name: name.trim(),
        username: cleanPhone,
        displayUsername: name.trim(),
        phone: cleanPhone,
        callbackURL: callbackUrl,
      } as Parameters<typeof authClient.signUp.email>[0] & {
        phone: string;
        displayUsername: string;
      }
    );

    if (signUpError) {
      setError(signUpError.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="bg-ui-card p-8 rounded-[2.5rem] border border-ui-border shadow-xl">
      {/* ✅ ปิด Auto-fill ทั้งฟอร์มเพื่อความปลอดภัยสูงสุด */}
      <form onSubmit={handleRegister} className="space-y-6" autoComplete="off">
        
        {/* 👤 ชื่อ-นามสกุล */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest ml-1">ชื่อ-นามสกุลพนักงาน</label>
          <input
            type="text"
            autoComplete="off" // ปิดการเดาชื่อ
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อ นามสกุล (ภาษาไทย)"
            className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            required
          />
        </div>

        {/* 📱 เบอร์โทรศัพท์ */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest ml-1">เบอร์มือถือ (ใช้สำหรับเข้าระบบ)</label>
          <input
            type="text"
            autoComplete="none" // ป้องกันการเอาเบอร์ที่เคยบันทึกไว้ใน Username มาหย่อนใส่
            value={phone}
            onChange={handlePhoneChange}
            placeholder="0XX XXX XXXX"
            className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-lg font-black tracking-widest focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            required
          />
        </div>

        {/* 📧 อีเมล (Optional) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest ml-1">อีเมลบริษัท (ถ้ามี)</label>
          <input
            type="email"
            autoComplete="email" // ช่องนี้ยอมให้ใช้ Auto-fill ของ Email ได้เพราะตรงความหมาย
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
          />
        </div>

        {/* 🔑 รหัสผ่าน (Pin 8 หลัก) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest ml-1">รหัสผ่าน 8 หลัก (ตัวเลขเท่านั้น)</label>
          <input
            type="password"
            autoComplete="new-password" // ✅ สำคัญมาก! บอก Browser ว่าเป็นรหัสผ่านใหม่ ไม่ต้องเอาของเก่ามาใส่
            maxLength={8}
            inputMode="numeric"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••••"
            className="w-full px-5 py-3 bg-ui-bg border border-ui-border rounded-xl text-xl font-black tracking-[0.4em] text-center focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            required
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-status-error/5 text-status-error text-[11px] font-bold p-3 rounded-lg text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading || password.length !== 8}
          className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-40 text-white rounded-xl font-black tracking-widest uppercase transition-all shadow-lg shadow-brand-primary/10"
        >
          {loading ? "กำลังดำเนินการ..." : "สร้างบัญชีใหม่"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-ui-border text-center">
        <p className="text-ui-muted text-[10px] font-bold uppercase tracking-widest">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="text-brand-primary hover:underline ml-1">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-ui-bg flex flex-col items-center justify-center p-4">
      <div className="fixed top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-brand-primary tracking-tight mb-2 uppercase">
            REGISTRATION <span className="text-ui-muted font-light">PORTAL</span>
          </h1>
          <p className="text-ui-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">
            สร้างบัญชีผู้ใช้งานระบบจัดการ EDI
          </p>
        </div>

        <Suspense fallback={<div className="bg-ui-card p-12 rounded-[2.5rem] border border-ui-border flex flex-col items-center"><div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" /></div>}>
          <RegisterForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
