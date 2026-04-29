"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🛡️ Senior Logic: Format phone number as typing (081 234 5678)
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanPhone = phone.replace(/\s/g, "");
    
    // 🚀 ส่งไปที่ Better Auth
    const { error: loginError } = await authClient.signIn.username({
      username: cleanPhone,
      password: password.trim(), // 🛡️ Trim leading/trailing spaces for reliability
      callbackURL: callbackUrl,
    });

    if (loginError) {
      setError(loginError.message || "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="bg-ui-card p-8 rounded-[3rem] border border-ui-border shadow-2xl relative overflow-hidden group">
      {/* Decorative Gradient */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-50" />
      
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-ui-muted uppercase tracking-[0.2em] ml-2">เบอร์โทรศัพท์</label>
          <div className="relative">
            <input
              type="text"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="08X XXX XXXX"
              className="w-full px-6 py-4 bg-ui-bg border border-ui-border rounded-2xl text-lg font-black tracking-widest focus:outline-none focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/5 transition-all placeholder:text-ui-muted/30"
              required
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl opacity-30">📱</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-ui-muted uppercase tracking-[0.2em] ml-2">รหัสผ่าน 8 หลัก</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              maxLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-ui-bg border border-ui-border rounded-2xl text-2xl font-black tracking-[0.5em] text-center focus:outline-none focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/5 transition-all placeholder:tracking-normal placeholder:text-ui-muted/30"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-ui-muted hover:text-brand-primary transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-status-error/10 border border-status-error/20 p-4 rounded-xl text-status-error text-xs font-bold text-center"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading || password.length !== 8}
          className="w-full py-5 bg-brand-primary hover:brightness-110 disabled:opacity-50 disabled:grayscale active:scale-[0.98] text-white rounded-2xl font-black tracking-widest uppercase shadow-xl shadow-brand-primary/20 transition-all flex items-center justify-center gap-3 overflow-hidden group relative"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>เข้าสู่ระบบ</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-ui-border text-center">
        <p className="text-ui-muted text-xs font-bold uppercase tracking-tighter">
          ยังไม่มีบัญชี?{" "}
          <Link 
            href={`/register${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} 
            className="text-brand-primary hover:underline ml-1"
          >
            ลงทะเบียนที่นี่
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ui-bg flex flex-col items-center justify-center p-4 selection:bg-brand-primary/30">
      <div className="fixed top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="inline-block p-4 bg-brand-primary/10 rounded-[2rem] mb-6"
          >
            <span className="text-4xl">🔐</span>
          </motion.div>
          <h1 className="text-4xl font-black text-brand-primary tracking-tighter mb-2 uppercase">
            EDI SYSTEM <span className="text-ui-muted font-light">AUTH</span>
          </h1>
          <p className="text-ui-muted text-sm font-bold tracking-widest uppercase opacity-50">
            ระบบจัดการข้อมูลความปลอดภัย
          </p>
        </div>

        <Suspense fallback={<div className="bg-ui-card p-12 rounded-[3rem] border border-ui-border flex flex-col items-center"><div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center mt-8 text-ui-muted text-[10px] font-bold uppercase tracking-widest opacity-30">
          Senior Professional Authentication System © 2024
        </p>
      </motion.div>
    </div>
  );
}
