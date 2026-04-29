import { AnimatePresence, motion } from "framer-motion";
import { TabType, MasterData, Customer, Product, Address, DashboardTab } from "@/app/edi";
import { isCustomer, isProduct, isAddress } from "@/components/MasterDataTable";
import { AddCustomerForm } from "@/components/forms/AddCustomerForm";
import { AddProductForm } from "@/components/forms/AddProductForm";
import { AddAddressForm } from "@/components/forms/AddAddressForm";

interface DashboardModalsProps {
  viewTarget: MasterData | null;
  setViewTarget: (val: MasterData | null) => void;
  editTarget: MasterData | null;
  setEditTarget: (val: MasterData | null) => void;
  deleteTarget: { id: string; type: TabType } | null;
  setDeleteTarget: (val: { id: string; type: TabType } | null) => void;
  activeTab: DashboardTab;
  isPending: boolean;
  onDelete: () => void;
  refresh: () => void;
}

export function DashboardModals({
  viewTarget, setViewTarget,
  editTarget, setEditTarget,
  deleteTarget, setDeleteTarget,
  activeTab, isPending, onDelete, refresh
}: DashboardModalsProps) {
  return (
    <>
      {/* 👁️ View Modal */}
      <AnimatePresence>
        {viewTarget && (
          <div className="fixed inset-0 z-[100] flex justify-center bg-ui-bg/95 backdrop-blur-xl overflow-y-auto p-4 items-start sm:items-center">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="w-full max-w-2xl my-auto">
              <div className="bg-ui-card rounded-3xl border border-ui-border shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-ui-border bg-ui-bg/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">👁️</div>
                    <h2 className="text-xl font-black text-ui-text uppercase tracking-tight">รายละเอียดข้อมูล</h2>
                  </div>
                  <button onClick={() => setViewTarget(null)} className="p-2 hover:bg-ui-bg rounded-xl transition-all text-ui-muted">✕</button>
                </div>
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {Object.entries(viewTarget).map(([key, value]) => (
                      <div key={key} className="space-y-1.5 border-b border-ui-border/50 pb-3">
                        <label className="text-[10px] font-black text-ui-muted uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                        <div className="text-sm font-bold text-ui-text break-words">
                          {value !== null && value !== undefined && value !== "" ? String(value) : <span className="text-ui-muted font-normal italic opacity-50">ไม่มีข้อมูล</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-ui-bg/50 border-t border-ui-border flex justify-end">
                  <button onClick={() => setViewTarget(null)} className="px-8 py-2.5 bg-ui-card border border-ui-border text-ui-text rounded-xl font-black text-xs hover:border-brand-primary/50 hover:text-brand-primary transition-all shadow-sm active:scale-95">ปิดหน้าต่าง</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ Edit Modal */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex justify-center bg-ui-bg/95 backdrop-blur-xl overflow-y-auto p-4 items-start sm:items-center">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="w-full max-w-4xl my-auto">
              <div className="flex justify-between items-center mb-6 px-6 py-4 bg-ui-card rounded-2xl border border-ui-border sticky top-0 z-10 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✏️</span>
                  <h2 className="text-xl font-black text-brand-primary uppercase">แก้ไขข้อมูล Master Data</h2>
                </div>
                <button onClick={() => setEditTarget(null)} className="p-2 hover:bg-brand-primary/10 text-ui-muted hover:text-brand-primary rounded-xl transition-all">✕</button>
              </div>
              <div className="bg-ui-card p-1 rounded-3xl border border-ui-border shadow-2xl">
                {activeTab === "customer" && isCustomer(editTarget) && <AddCustomerForm key={editTarget.customer_code} initialValues={editTarget as Customer} onSuccess={() => { setEditTarget(null); refresh(); }} />}
                {activeTab === "product" && isProduct(editTarget) && <AddProductForm key={editTarget.ean_product_code} initialValues={editTarget as Product} onSuccess={() => { setEditTarget(null); refresh(); }} />}
                {activeTab === "address" && isAddress(editTarget) && <AddAddressForm key={editTarget.customer_no} initialValues={editTarget as Address} onSuccess={() => { setEditTarget(null); refresh(); }} />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🗑️ Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ui-bg/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-ui-card border border-ui-border p-8 rounded-[2.5rem] max-w-md w-full shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
              <div className="p-4 bg-status-error/10 w-fit rounded-2xl mb-6"><span className="text-3xl text-status-error">⚠️</span></div>
              <h3 className="text-2xl font-black text-ui-text mb-2">ยืนยันการลบข้อมูล?</h3>
              <p className="text-ui-muted text-sm mb-8 leading-relaxed font-medium">การกระทำนี้จะลบข้อมูลออกจากฐานข้อมูลถาวร โปรดตรวจสอบความถูกต้องก่อนกดยืนยัน</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteTarget(null)} disabled={isPending} className="flex-1 py-3 text-sm font-bold text-ui-muted hover:text-ui-text transition-colors disabled:opacity-50">ยกเลิก</button>
                <button onClick={onDelete} disabled={isPending} className="flex-[2] bg-status-error hover:brightness-110 active:scale-95 px-6 py-3 rounded-2xl text-sm font-black text-white transition-all shadow-xl shadow-status-error/20 uppercase tracking-widest disabled:opacity-50">{isPending ? "กำลังดำเนินการ..." : "ยืนยันการลบ"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
