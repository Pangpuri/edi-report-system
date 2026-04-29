"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SlideBarTab, TabType, MasterData, ViewMode } from "@/app/edi";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { ImportAS400 } from "@/components/dashboard/Import_H_D_data";
import { StagingArea } from "@/components/dashboard/StagingArea";
import { POPrePrint } from "@/components/dashboard/POPrePrint";
import { AbnormalData } from "@/components/dashboard/AbnormalData";
import { ProcessedData } from "@/components/dashboard/ProcessedData";
import { ProductMapping } from "@/components/dashboard/ProductMapping";
import { MasterDataTable } from "@/components/MasterDataTable";
import { AddCustomerForm } from "@/components/forms/AddCustomerForm";
import { AddAddressForm } from "@/components/forms/AddAddressForm";
import { AddProductForm } from "@/components/forms/AddProductForm";
import { useToast } from "@/components/ToastProvider";

interface DashboardMainContentProps {
  viewMode: ViewMode;
  activeTab: SlideBarTab;
  loading: boolean;
  error: boolean;
  refresh: () => void;
  filteredData: MasterData[];
  userRole: string;
  setDeleteTarget: (target: { id: string; type: TabType } | null) => void;
  setEditTarget: (item: MasterData | null) => void;
  setViewTarget: (item: MasterData | null) => void;
  currentPage: number;
  totalPages: number;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  setViewMode: (mode: ViewMode) => void;
}

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function DashboardMainContent({
  viewMode,
  activeTab,
  loading,
  error,
  refresh,
  filteredData,
  userRole,
  setDeleteTarget,
  setEditTarget,
  setViewTarget,
  currentPage,
  totalPages,
  goToNextPage,
  goToPreviousPage,
  setViewMode,
}: DashboardMainContentProps) {
  const { showToast } = useToast();

  return (
    <main className="relative min-h-[500px] pb-10 md:pb-20">
      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div 
            key={`${activeTab}-list-${currentPage}`}
            variants={tabVariants} initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* 🔄 ปรับปรุง: แสดง Loading ส่วนกลางเฉพาะตอนอยู่หน้า Master Data 
                เพราะหน้าอื่นๆ เช่น Import หรือ User Management มีสถานะ Loading ภายในตัวเองอยู่แล้ว
                เพื่อป้องกันหน้าเว็บค้างเมื่อเปลี่ยน Tab */}
            {loading && ["customer", "address", "product"].includes(activeTab) ? (
              <div className="text-center p-12 md:p-20 min-h-[400px] flex flex-col items-center justify-center bg-ui-card rounded-[2rem] md:rounded-[3rem] border border-ui-border shadow-xl">
                <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4 md:mb-6" />
                <p className="text-[10px] md:text-sm font-black tracking-[0.2em] md:tracking-[0.3em] animate-pulse uppercase text-brand-primary">Synchronizing...</p>
              </div>
            ) : error ? (
              <div className="p-10 bg-brand-primary/5 border-2 border-dashed border-brand-primary/20 rounded-[2rem] md:rounded-[3rem] text-brand-primary text-center min-h-[400px] flex flex-col items-center justify-center font-black">
                <span className="text-4xl md:text-5xl mb-4 md:mb-6">⚠️</span>
                <p className="text-lg md:text-xl uppercase tracking-widest mb-4">Error</p>
                <button onClick={() => refresh()} className="px-6 py-2.5 md:px-8 md:py-3 bg-brand-primary text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs shadow-lg hover:scale-105 active:scale-95 transition-all">TRY AGAIN</button>
              </div>
            ) : activeTab === "users" ? <UserManagement />
              : activeTab === "import" ? <ImportAS400 />
              : activeTab === "staging" ? <StagingArea />
              : activeTab === "po-preprint" ? <POPrePrint />
              : activeTab === "abnormal-data" ? <AbnormalData />
              : activeTab === "processed-data" ? <ProcessedData />
              : activeTab === "product-mapping" ? <ProductMapping />
              : (
              <div className="bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg min-h-[600px] flex flex-col relative overflow-hidden text-ui-text">
                <MasterDataTable 
                  data={filteredData} 
                  activeTab={activeTab as TabType} 
                  userRole={userRole} 
                  onDelete={(id) => setDeleteTarget({ id, type: activeTab as TabType })} 
                  onEdit={(item) => setEditTarget(item)}
                  onView={(item) => setViewTarget(item)} 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onNextPage={goToNextPage}
                  onPrevPage={goToPreviousPage}
                />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key={`${activeTab}-add`}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-5xl mx-auto bg-ui-card p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border border-ui-border shadow-2xl"
          >
            <div className="bg-ui-bg/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-ui-border shadow-inner mt-8">
              {activeTab === "customer" && <AddCustomerForm onSuccess={() => { refresh(); setViewMode("list"); showToast("เพิ่มข้อมูลลูกค้าสำเร็จ!", "success"); }} />}
              {activeTab === "address" && <AddAddressForm onSuccess={() => { refresh(); setViewMode("list"); showToast("เพิ่มที่อยู่สำเร็จ!", "success"); }} />}
              {activeTab === "product" && <AddProductForm onSuccess={() => { refresh(); setViewMode("list"); showToast("เพิ่มข้อมูลสินค้าสำเร็จ!", "success"); }} />}
            </div>

            <button onClick={() => setViewMode("list")} className="mt-8 md:mt-12 group flex items-center gap-3 text-ui-muted text-[10px] md:text-xs hover:text-brand-primary transition-all font-black uppercase tracking-widest">
              <span className="group-hover:-translate-x-2 transition-transform">←</span> Back to Overview
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}