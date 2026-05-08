// components/dashboard/import-data/(tabs)/StagingTab.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileText, Trash2 } from "lucide-react";
import { StagingFile, StagingDeleteTarget } from "../types";

interface StagingTabProps {
  stagingFiles: StagingFile[];
  selectedStaging: string[];
  toggleSelectStaging: (fileName: string) => void;
  toggleSelectAllStaging: () => void;
  setStagingDeleteTarget: (target: StagingDeleteTarget | null) => void;
  handleProcessSelected: () => void;
  isAdmin: boolean;
}

export function StagingTab({
  stagingFiles,
  selectedStaging,
  toggleSelectStaging,
  toggleSelectAllStaging,
  setStagingDeleteTarget,
  handleProcessSelected,
  isAdmin
}: StagingTabProps) {
  return (
    <motion.div 
      key="staging" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="flex-1 flex flex-col"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSelectAllStaging}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              selectedStaging.length === stagingFiles.length && stagingFiles.length > 0 
                ? "bg-brand-primary border-brand-primary text-white" 
                : "border-ui-border bg-ui-bg"
            }`}
          >
            {selectedStaging.length === stagingFiles.length && stagingFiles.length > 0 && <CheckCircle2 size={14} />}
          </button>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary">เลือกทั้งหมด</h3>
            <p className="text-[8px] font-bold text-ui-muted uppercase">{selectedStaging.length} Selected</p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedStaging.length > 0 && isAdmin && (
            <button 
              onClick={() => setStagingDeleteTarget({ type: "multiple" })}
              className="px-3 py-1.5 bg-status-error/10 text-status-error border border-status-error/20 rounded-lg text-[12px] font-black uppercase tracking-widest hover:bg-status-error hover:text-white transition-all"
            >
              ลบไฟล์ที่เลือก
            </button>
          )}
          <button 
            onClick={handleProcessSelected} 
            disabled={selectedStaging.length === 0}
            className={`px-4 py-1.5 rounded-lg text-[14px] font-black uppercase tracking-widest shadow-md transition-all ${
              selectedStaging.length > 0 
                ? "bg-brand-primary text-white hover:scale-105" 
                : "bg-ui-border text-ui-muted cursor-not-allowed"
            }`}
          >
            ประมวลผลไฟล์
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {stagingFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full border border-ui-border rounded-xl bg-ui-bg/30 opacity-50">
            <p className="text-[10px] font-black uppercase tracking-widest">No files found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stagingFiles.map(file => {
              const isSelected = selectedStaging.includes(file.name);
              return (
                <div 
                  key={file.name} 
                  onClick={() => toggleSelectStaging(file.name)}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-all cursor-pointer ${
                    isSelected ? "bg-brand-primary/5 border-brand-primary" : "bg-ui-card border-ui-border hover:border-brand-primary/30"
                  }`}
                >
                  <div className={`p-2 rounded-md ${isSelected ? "bg-brand-primary text-white" : "bg-brand-primary/5 text-brand-primary"}`}>
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p className="text-[10px] text-ui-muted uppercase">{(file.size/1024).toFixed(1)} KB</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStagingDeleteTarget({ type: "single", fileName: file.name });
                      }}
                      className="p-2 text-ui-muted hover:text-status-error hover:bg-status-error/10 rounded-xl transition-all"
                      title="ลบไฟล์นี้"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected 
                      ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20" 
                      : "border-ui-border bg-ui-bg group-hover:border-brand-primary/50"
                  }`}>
                    {isSelected && <CheckCircle2 size={18} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
