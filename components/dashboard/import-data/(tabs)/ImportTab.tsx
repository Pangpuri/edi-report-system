// components/dashboard/import-data/(tabs)/ImportTab.tsx
"use client";

import { motion } from "framer-motion";
import { FileInput } from "lucide-react";

interface ImportTabProps {
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportTab({ 
  isDragging, 
  setIsDragging, 
  handleDrop, 
  handleFileUpload 
}: ImportTabProps) {
  return (
    <motion.div 
      key="import" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="flex-1 flex flex-col"
    >
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex-1 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center relative overflow-hidden group ${
          isDragging ? "border-brand-primary bg-brand-primary/5" : "border-ui-border bg-ui-bg/30"
        }`}
      >
        <input 
          type="file" 
          multiple 
          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
          onChange={handleFileUpload} 
          accept=".txt,.TAB,.tab" 
        />
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${
          isDragging ? "bg-brand-primary text-white scale-110" : "bg-brand-primary/10 text-brand-primary"
        }`}>
          <FileInput size={24} />
        </div>
        <h3 className="text-lg font-black text-ui-text uppercase tracking-widest mb-1">ลากและวางไฟล์ที่ต้องการนำเข้า</h3>
        <p className="text-[14px] font-medium text-ui-muted uppercase tracking-widest">หรือ คลิกเพื่อเลือกไฟล์ (รองรับ: .TXT)</p>
      </div>
    </motion.div>
  );
}
