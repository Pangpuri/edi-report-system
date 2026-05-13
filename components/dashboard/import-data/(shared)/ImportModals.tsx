"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users2, Box, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { EDHData, EDLData } from "../types";
import { AddCustomerForm } from "../../master-data/customers/CustomerForm";
import { AddProductForm } from "../../master-data/products/ProductForm";

interface ImportModalsProps {
  customerModalTarget: EDHData | null;
  setCustomerModalTarget: (val: EDHData | null) => void;
  productModalTarget: { header: EDHData; details: EDLData[] } | null;
  setProductModalTarget: (val: { header: EDHData; details: EDLData[] } | null) => void;
  onSuccess: () => void;
}

export function ImportModals({
  customerModalTarget,
  setCustomerModalTarget,
  productModalTarget,
  setProductModalTarget,
  onSuccess
}: ImportModalsProps) {
  
  // State for Product Modal Tab
  const [activeProductIdx, setActiveProductIdx] = useState(0);

  const invalidProducts = useMemo(() => {
    if (!productModalTarget) return [];
    return productModalTarget.details.filter(d => d.isProductValid === false);
  }, [productModalTarget]);

  return (
    <>
      {/* 🏢 Customer Modal */}
      <AnimatePresence>
        {customerModalTarget && (
          <div className="fixed inset-0 z-[100] flex justify-center bg-ui-bg/95 backdrop-blur-xl overflow-y-auto p-4 items-start sm:items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="w-full max-w-4xl my-auto"
            >
              <div className="flex justify-between items-center mb-4 px-6 py-4 bg-ui-card rounded-2xl border border-ui-border shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <Users2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-brand-primary uppercase tracking-tight">เพิ่ม/แก้ไข ข้อมูลลูกค้า</h2>
                    <div className="flex items-center gap-2 text-[10px] text-ui-muted font-bold uppercase tracking-widest mt-1">
                      <FileText size={10} /> ไฟล์: {customerModalTarget.fileName}
                    </div>
                  </div>
                </div>
                <button onClick={() => setCustomerModalTarget(null)} className="p-2 hover:bg-brand-primary/10 text-ui-muted hover:text-brand-primary rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <AddCustomerForm 
                initialValues={{
                  customer_code: customerModalTarget.customerNum || "",
                  company_name: customerModalTarget.customerName || "",
                  ean_location_code: "",
                  short_name: customerModalTarget.shortName || "",
                }} 
                onSuccess={() => {
                  onSuccess();
                  setCustomerModalTarget(null);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📦 Product Modal (Multi-tab) */}
      <AnimatePresence>
        {productModalTarget && (
          <div className="fixed inset-0 z-[100] flex justify-center bg-ui-bg/95 backdrop-blur-xl overflow-y-auto p-4 items-start sm:items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="w-full max-w-5xl my-auto flex flex-col gap-4"
            >
              <div className="flex justify-between items-center px-6 py-4 bg-ui-card rounded-2xl border border-ui-border shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-secondary/10 rounded-xl text-brand-secondary">
                    <Box size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-brand-secondary uppercase tracking-tight">เพิ่ม/แก้ไข ข้อมูลสินค้า</h2>
                    <div className="flex items-center gap-2 text-[10px] text-ui-muted font-bold uppercase tracking-widest mt-1">
                      <FileText size={10} /> ไฟล์: {productModalTarget.header.fileName}
                    </div>
                  </div>
                </div>
                <button onClick={() => setProductModalTarget(null)} className="p-2 hover:bg-brand-secondary/10 text-ui-muted hover:text-brand-secondary rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 h-[600px]">
                {/* Tabs Sidebar */}
                <div className="w-full lg:w-72 bg-ui-card rounded-2xl border border-ui-border shadow-lg flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-ui-border bg-ui-bg/50">
                    <h3 className="text-[10px] font-black text-ui-muted uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} className="text-status-error" /> รายการที่ต้องจัดการ ({invalidProducts.length})
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {invalidProducts.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setActiveProductIdx(idx)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 border ${
                          activeProductIdx === idx 
                            ? "bg-brand-secondary/10 border-brand-secondary/30 shadow-sm" 
                            : "border-transparent hover:bg-ui-bg text-ui-muted"
                        }`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-tight ${activeProductIdx === idx ? "text-brand-secondary" : ""}`}>
                          รหัส: {p.Bar_Code_Item}
                        </span>
                        <span className="text-xs font-bold truncate">{p.productName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Area */}
                <div className="flex-1 bg-ui-card rounded-2xl border border-ui-border shadow-lg overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto p-1">
                    {invalidProducts[activeProductIdx] && (
                      <AddProductForm 
                        key={invalidProducts[activeProductIdx].id}
                        initialValues={{
                          ean_product_code: invalidProducts[activeProductIdx].Bar_Code_Item || "",
                          internal_product_code: invalidProducts[activeProductIdx].vendorProdCode || "",
                          product_description: invalidProducts[activeProductIdx].productName || "",
                        }}
                        onSuccess={() => {
                          onSuccess();
                          // If it was the last one, close the modal, otherwise move to next
                          if (invalidProducts.length === 1) {
                            setProductModalTarget(null);
                          } else {
                            // Refresh logic might be needed here to update the list
                            // For now, let's keep it simple
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
