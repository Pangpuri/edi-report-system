"use client";

import { useState } from "react";
import { TabType, SlideBarTab, ViewMode } from "@/app/edi";
import { ThemeToggle } from "@/components/ThemeToggle";
import ExportData from "@/components/ExportData";
import { RefreshCcw, Loader2 } from "lucide-react";
import { importAllMasterData } from "@/app/actions/master/import-actions";
import { useToast } from "@/components/ToastProvider";

interface DashboardHeaderProps {
  activeTab: SlideBarTab;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMasterDataTab: boolean;
  userRole?: string;
  refresh?: () => void;
}

export function DashboardHeader({
  activeTab,
  viewMode,
  setViewMode,
  isMasterDataTab,
  userRole,
  refresh
}: DashboardHeaderProps) {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const isAdmin = userRole === "admin";

  const handleSyncMasterData = async () => {
    if (!confirm("คุณต้องการนำเข้าข้อมูล Master Data จากไฟล์ในเครื่องแม่ (data/*.tab) ใช่หรือไม่?\nข้อมูลที่มีอยู่จะถูกอัปเดตหรือเขียนทับ")) return;
    
    setIsSyncing(true);
    try {
      const res = await importAllMasterData();
      showToast(res.message, "success");
      if (refresh) refresh();
    } catch (error) {
      console.error("Sync Error:", error);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อระบบนำเข้า", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-ui-border pb-4 mb-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg md:text-xl font-black text-brand-primary tracking-tight uppercase">
          EDI SYSTEM
        </h1>
        <div className="h-6 w-px bg-ui-border hidden sm:block"></div>
        <p className="text-[10px] md:text-xs text-brand-secondary font-black uppercase tracking-[0.15em] bg-brand-secondary/10 px-3 py-1 rounded-full border border-brand-secondary/20">
          Module: {activeTab}
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <ThemeToggle />
        
        {isMasterDataTab && viewMode === "list" && (
          <>
            <ExportData activeTab={activeTab as TabType} />
          </>
        )}
        
        {isMasterDataTab && (
          <div className="flex gap-1 p-1 bg-ui-bg rounded-lg border border-ui-border ml-auto sm:ml-0">
            <button 
              onClick={() => setViewMode("list")} 
              className={`px-3 py-1.5 rounded-md text-[9px] font-black transition-all ${viewMode === "list" ? "bg-brand-primary text-white" : "text-ui-muted hover:text-ui-text"}`}
            >
              📋 LIST
            </button>
            <button 
              onClick={() => setViewMode("add")} 
              className={`px-3 py-1.5 rounded-md text-[9px] font-black transition-all ${viewMode === "add" ? "bg-brand-primary text-white" : "text-ui-muted hover:text-ui-text"}`}
            >
              ➕ ADD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
