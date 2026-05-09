"use client";

import { ReactNode, useState, useEffect, memo, startTransition } from "react";
import { Sidebar } from "@/components/dashboard/layout/Sidebar";
import { DashboardModals } from "@/components/dashboard/DashboardModals";
//  Import ทุกอย่างจาก edi.ts ที่เดียวจบ
import { TabType, SlideBarTab, SessionUser, MasterData } from "@/app/edi";

interface SlideBarLayoutProps {
  children: ReactNode;
  activeTab: SlideBarTab;
  setActiveTab: (tab: SlideBarTab) => void;
  user: SessionUser | undefined;
  onSignOut: () => void;
  viewTarget: MasterData | null; 
  setViewTarget: (v: MasterData | null) => void;
  editTarget: MasterData | null;
  setEditTarget: (v: MasterData | null) => void;
  deleteTarget: { id: string; type: TabType } | null;
  setDeleteTarget: (v: { id: string; type: TabType } | null) => void;
  isPending: boolean;
  handleDelete: (callback: () => void) => void;
  refresh: () => void;
}

// 🛡️ Memoize Sidebar เพื่อป้องกันการกระพริบเมื่อ Parent Re-render (เช่น ตอนพิมพ์ค้นหา)
const MemoizedSidebar = memo(Sidebar);

export function SlidebarLayout({
  children,
  activeTab,
  setActiveTab,
  user,
  onSignOut,
  viewTarget,
  setViewTarget,
  editTarget,
  setEditTarget,
  deleteTarget,
  setDeleteTarget,
  isPending,
  handleDelete,
  refresh,
}: SlideBarLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const userRole = user?.role || "user";

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-ui-bg text-ui-text transition-colors duration-300 overflow-hidden">
      {/* 🚀 SIDEBAR */}
      <div className={!mounted ? "invisible" : "visible"} style={{ display: 'contents' }}>
        <MemoizedSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          onSignOut={onSignOut}
        />
      </div>

      {/* 📊 MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 space-y-4">
          <main className="flex-1">
            {children}
          </main>

          <DashboardModals
            viewTarget={viewTarget} setViewTarget={setViewTarget}
            editTarget={editTarget} setEditTarget={setEditTarget}
            deleteTarget={deleteTarget} setDeleteTarget={setDeleteTarget}
            activeTab={activeTab}
            isPending={isPending}
            onDelete={() => handleDelete(refresh)}
            refresh={refresh}
          />
        </div>
      </div>
    </div>
  );
}
