// components/dashboard/import-data/(shared)/LoadingOverlay.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 z-50 bg-ui-card/80 backdrop-blur-sm flex flex-col items-center justify-center"
        >
          <Loader2 size={32} className="animate-spin text-brand-primary mb-2" />
          <h3 className="text-brand-primary font-black text-xs uppercase tracking-widest">
            {message || "Processing..."}
          </h3>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
