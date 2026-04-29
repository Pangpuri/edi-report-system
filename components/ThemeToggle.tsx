"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, startTransition } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 🛡️ ปรับการแก้ Hydration Mismatch ให้ทันสมัยขึ้น
  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  // ระหว่างที่ยังไม่ Mount ให้คืนค่า Skeleton ที่มีขนาดเท่ากับปุ่มจริง
  if (!mounted) {
    return (
      <div className="p-2 rounded-xl bg-ui-card border border-ui-border w-9 h-9 opacity-50" />
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl bg-ui-card border border-ui-border text-ui-text hover:border-brand-primary/50 transition-all shadow-sm active:scale-95 group"
      aria-label="Toggle Theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ y: 10, opacity: 0, rotate: 45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -10, opacity: 0, rotate: -45 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon className="w-5 h-5 text-brand-secondary" />
          ) : (
            <Sun className="w-5 h-5 text-brand-primary" />
          )}
        </motion.div>
      </AnimatePresence>
      
      <span className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 px-2 py-1 bg-brand-primary text-white text-[10px] rounded pointer-events-none transition-all origin-top-right whitespace-nowrap z-50 font-bold">
        สลับเป็นโหมด{isDark ? "กลางวัน" : "กลางคืน"}
      </span>
    </button>
  );
}
