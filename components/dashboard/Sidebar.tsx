"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Menu, X,
  Database, FileInput, Users, LayoutDashboard, 
  Settings, Box, MapPin, Users2, Layers,
  LogOut, ShieldCheck, FileText, AlertCircle,
  CheckCircle2, RefreshCw
} from "lucide-react";
import { DashboardTab } from "@/app/edi";

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  userRole: string;
  onSignOut: () => void;
}

/**
 * Sidebar Component: รองรับการพับเก็บ และ Mobile View
 * 🔥 ปรับปรุงสำหรับผู้สูงอายุ: ตัวหนังสือใหญ่ขึ้น, ชัดขึ้น
 */
export function Sidebar({ activeTab, setActiveTab, userRole, onSignOut }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved === "true";
    }
    return false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar_collapsed", String(newState));
  };

  const menuGroups = [
    {
      title: "ข้อมูลหลัก",
      items: [
        { id: "customer", label: "ข้อมูลลูกค้า", icon: Users2 },
        { id: "address", label: "ที่อยู่ลูกค้า", icon: MapPin },
        { id: "product", label: "ข้อมูลสินค้า", icon: Box },
      ]
    },
    {
      title: "จัดการ EDI",
      items: [
        { id: "import", label: "นำเข้า และ จัดการ EDI", icon: Layers },
        { id: "processed-data", label: "ประวัติการนำเข้า AS400", icon: CheckCircle2 },
      ]
    },
    {
      title: "รายงาน",
      items: [
        { id: "po-preprint", label: "พิมพ์ใบสั่งซื้อ (PO)", icon: FileText },
        { id: "abnormal-data", label: "ข้อมูลผิดปกติ", icon: AlertCircle },
        { id: "product-mapping", label: "จับคู่รหัสสินค้า", icon: RefreshCw },
      ]
    },
    ...(userRole === "admin" ? [{
      title: "ผู้ดูแลระบบ",
      items: [
        { id: "users", label: "จัดการผู้ใช้งาน", icon: ShieldCheck },
      ]
    }] : [])
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-ui-card border-r border-ui-border">
      {/* Header / Logo Area - ปรับขนาดใหญ่ขึ้น */}
      <div className={`p-5 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <h2 className="text-2xl font-bold text-brand-primary tracking-tighter whitespace-nowrap">
            EDI<span className="text-ui-text/50">SYS</span>
          </h2>
        )}
        <button 
          onClick={toggleCollapse}
          className="p-2 hover:bg-ui-bg rounded-lg text-ui-muted hover:text-brand-primary transition-all hidden md:block"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Profile Summary - ปรับขนาดใหญ่ขึ้น */}
      <div className={`px-4 mb-6 ${isCollapsed ? "text-center" : "px-5"}`}>
        <div className={`p-3 bg-ui-bg rounded-xl border border-ui-border flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary font-black text-sm">
            {userRole[0].toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold uppercase text-brand-primary">
                {userRole === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งานทั่วไป"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Menu Groups - ปรับระยะห่างและขนาดตัวหนังสือ */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            {!isCollapsed && (
              <p className="px-2 text-xs font-bold uppercase tracking-wider text-ui-muted/50">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as DashboardTab);
                    if (isMobileOpen) setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    activeTab === item.id 
                      ? "bg-brand-primary text-white shadow-md translate-x-0.5 border-l-4 border-yellow-500" 
                      : "text-ui-muted hover:bg-ui-bg hover:text-ui-text"
                  } ${isCollapsed ? "justify-center" : ""}`}
                >
                  <item.icon size={20} className={activeTab === item.id ? "text-yellow-400" : ""} />
                  {!isCollapsed && item.label && (
                    <span className="text-base font-semibold tracking-wide">{item.label}</span>
                  )}
                  
                  {isCollapsed && (
                    <div className="absolute left-14 px-3 py-1.5 bg-ui-text text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Area */}
      <div className="p-3 border-t border-ui-border mt-auto">
        <button
          onClick={onSignOut}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-status-error hover:bg-status-error/10 transition-all ${isCollapsed ? "justify-center" : ""}`}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-bold uppercase tracking-wide">ออกจากระบบ</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden fixed top-3 right-3 z-[100]">
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 bg-brand-primary text-white rounded-lg shadow-lg"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside 
        className={`hidden md:block sticky top-0 h-screen transition-all duration-300 z-[60] ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderSidebarContent()}
      </aside>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-ui-bg/60 backdrop-blur-sm z-[90] md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              className="fixed top-0 left-0 bottom-0 w-64 z-[100] md:hidden"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}