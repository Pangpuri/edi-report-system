import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SlideBarTab, TabType, MasterData, ViewMode, Product } from "@/app/edi";
import { UserManagement } from "@/components/dashboard/user-management/UserManagement_Main";
import { ImportAS400 } from "@/components/dashboard/import-data/Import_data_main";
import { AS400History } from "@/components/dashboard/history-data/AS400_History_Main";
import { DataRecord } from "@/components/dashboard/data-record/Data_Record";
import { ChangeProductDetail } from "@/components/dashboard/change-product-detail/Change_Product_Detail";
import { MasterDataTable, isProduct } from "@/components/dashboard/master-data/MasterDataTable";
import { AddCustomerForm } from "@/components/dashboard/master-data/customers/CustomerForm";
import { AddProductForm } from "@/components/dashboard/master-data/products/ProductForm";
import { AddAddressForm } from "@/components/dashboard/master-data/addresses/AddressForm";
import { ProductMasterSection } from "@/components/dashboard/master-data/products/ProductMasterSection";
import { useToast } from "@/components/ToastProvider";

// Extend Window interface for custom global functions
declare global {
  interface Window {
    setDashboardActiveTab?: (tab: SlideBarTab) => void;
  }
}

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
  const [makroSelectedProduct, setMakroSelectedProduct] = useState<MasterData | null>(null);

  return (
    <main className="relative flex-1 min-h-0 flex flex-col">
      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div 
            key={`${activeTab}-list-${currentPage}`}
            variants={tabVariants} initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* แสดง loding */}
            {loading && ["customer", "address", "product", "change-product"].includes(activeTab) ? (
              <div className="text-center p-12 md:p-20 flex-1 flex flex-col items-center justify-center bg-ui-card rounded-[2rem] md:rounded-[3rem] border border-ui-border shadow-xl">
                <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4 md:mb-6" />
                <p className="text-[10px] md:text-sm font-black tracking-[0.2em] md:tracking-[0.3em] animate-pulse uppercase text-brand-primary">Synchronizing...</p>
              </div>
            ) : error ? (
              <div className="p-10 bg-brand-primary/5 border-2 border-dashed border-brand-primary/20 rounded-[2rem] md:rounded-[3rem] text-brand-primary text-center flex-1 flex flex-col items-center justify-center font-black">
                <span className="text-4xl md:text-5xl mb-4 md:mb-6">⚠️</span>
                <p className="text-lg md:text-xl uppercase tracking-widest mb-4">Error</p>
                <button onClick={() => refresh()} className="px-6 py-2.5 md:px-8 md:py-3 bg-brand-primary text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs shadow-lg hover:scale-105 active:scale-95 transition-all">TRY AGAIN</button>
              </div>
            ) : activeTab === "users" ? <UserManagement />
              : activeTab === "import" ? <ImportAS400 setActiveTab={(tab) => {
                // อัปเดตผ่าน Prop ที่ได้รับมาหรือใช้ลอจิกภายใน Dashboard
                // ในที่นี้คือการเรียกฟังก์ชันที่ Dashboard ส่งมา
                const setActiveTabFunc = window.setDashboardActiveTab;
                if (setActiveTabFunc) setActiveTabFunc(tab);
              }} />
              : activeTab === "processed-data" ? <AS400History />
              : activeTab === "data-record" ? <DataRecord />
              : activeTab === "change-product" ? <ChangeProductDetail />
              : activeTab === "product" ? (
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                  {/* Left: Table */}
                  <div className="w-full lg:w-[70%] bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg min-h-0 flex flex-col relative overflow-hidden text-ui-text">
                    <MasterDataTable 
                      data={filteredData} 
                      activeTab={activeTab as TabType} 
                      userRole={userRole} 
                      onDelete={(id) => setDeleteTarget({ id, type: activeTab as TabType })} 
                      onEdit={(item) => setEditTarget(item)}
                      onView={(item) => setViewTarget(item)} 
                      onManagePrice={(item) => {
                        setMakroSelectedProduct(item);
                        const displayTitle = isProduct(item) ? item.product_description : "สินค้า";
                        const displayId = isProduct(item) ? item.ean_product_code : "";
                        showToast(`เลือกสินค้า: ${displayTitle} (${displayId}) เรียบร้อยแล้ว`, "success");
                        document.getElementById("makro-form-section")?.scrollIntoView({ behavior: "smooth" });
                      }} 
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onNextPage={goToNextPage}
                      onPrevPage={goToPreviousPage}
                    />
                  </div>
                  {/* Right: Product Master Section */}
                  <div className="w-full lg:w-[30%] overflow-y-auto">
                    <ProductMasterSection selectedProductFromTable={makroSelectedProduct} />
                  </div>
                </div>
              )
              : (
              <div className="bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg flex-1 min-h-0 flex flex-col relative overflow-hidden text-ui-text">
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
            className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar"
          >
            <div className="w-full bg-ui-card p-4 md:p-6 rounded-2xl border border-ui-border shadow-2xl my-4">
              <div className="bg-ui-bg/50 p-4 md:p-6 rounded-xl border border-ui-border shadow-inner mt-4">
                {activeTab === "customer" && <AddCustomerForm onSuccess={() => { refresh(); setViewMode("list"); showToast("เพิ่มข้อมูลลูกค้าสำเร็จ!", "success"); }} />}
                {activeTab === "address" && <AddAddressForm onSuccess={() => { refresh(); setViewMode("list"); showToast("เพิ่มที่อยู่สำเร็จ!", "success"); }} />}
                {activeTab === "product" && <AddProductForm onSuccess={() => { refresh(); setViewMode("list"); showToast("เพิ่มข้อมูลสินค้าสำเร็จ!", "success"); }} />}
              </div>

              <button onClick={() => setViewMode("list")} className="mt-6 group flex items-center gap-3 text-ui-muted text-[10px] md:text-xs hover:text-brand-primary transition-all font-black uppercase tracking-widest">
                <span className="group-hover:-translate-x-2 transition-transform">←</span> Back to Overview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
