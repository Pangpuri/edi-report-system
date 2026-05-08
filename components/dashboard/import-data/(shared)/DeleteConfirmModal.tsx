// components/dashboard/import-data/(shared)/DeleteConfirmModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DeleteConfirmModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export function DeleteConfirmModal({ 
  isVisible, 
  onCancel, 
  onConfirm,
  title = "Confirm Delete?",
  message = "This action cannot be undone."
}: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ui-bg/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="bg-ui-card border border-ui-border p-6 rounded-xl max-w-sm w-full shadow-2xl"
          >
            <h3 className="text-sm font-black text-ui-text mb-2 uppercase tracking-widest">{title}</h3>
            <p className="text-ui-muted text-[10px] mb-6 uppercase">{message}</p>
            <div className="flex gap-2">
              <button 
                onClick={onCancel} 
                className="flex-1 py-2 text-[10px] font-black uppercase text-ui-muted hover:bg-ui-bg rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm} 
                className="flex-1 bg-status-error px-4 py-2 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
