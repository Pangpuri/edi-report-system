"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, type, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const colors = {
    success: "bg-status-success shadow-status-success/20",
    error: "bg-status-error shadow-status-error/20",
    info: "bg-blue-500 shadow-blue-500/20",
  };

  const icons = {
    success: "✅",
    error: "⚠️",
    info: "ℹ️",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300]"
        >
          <div className={`${colors[type]} px-6 py-3 rounded-full text-white font-black text-sm shadow-2xl flex items-center gap-3 whitespace-nowrap border border-white/10 backdrop-blur-md`}>
            <span>{icons[type]}</span>
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
