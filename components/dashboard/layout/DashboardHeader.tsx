"use client";

import { TabType, SlideBarTab, ViewMode } from "@/app/edi";
import { ThemeToggle } from "@/components/ThemeToggle";
import ExportData from "@/components/ExportData";
import { useToast } from "@/components/ToastProvider"; // Keeping this in case you add other notifications later

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
  // Logic for Sync Master removed to prevent accidental usage by users

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
              className={`px-3 py-1.5 rounded-md text-[14px] font-black transition-all ${viewMode === "list" ? "bg-brand-primary text-white" : "text-ui-muted hover:text-ui-text"}`}
            >
              📋 LIST
            </button>
            <button 
              onClick={() => setViewMode("add")} 
              className={`px-3 py-1.5 rounded-md text-[14px] font-black transition-all ${viewMode === "add" ? "bg-brand-primary text-white" : "text-ui-muted hover:text-ui-text"}`}
            >
              ➕ ADD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
