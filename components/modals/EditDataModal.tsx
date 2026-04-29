"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MasterData, TabType, Customer, Product, Address } from "@/app/edi";
import { isCustomer, isProduct, isAddress } from "@/components/MasterDataTable";
import { AddCustomerForm } from "@/components/forms/AddCustomerForm";
import { AddProductForm } from "@/components/forms/AddProductForm";
import { AddAddressForm } from "@/components/forms/AddAddressForm";

interface EditDataModalProps {
  target: MasterData | null;
  activeTab: TabType;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditDataModal({ target, activeTab, onClose, onSuccess }: EditDataModalProps) {
  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[100] flex justify-center bg-ui-bg/95 backdrop-blur-xl overflow-y-auto p-4 items-start sm:items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 40 }} 
            className="w-full max-w-4xl my-auto"
          >
            <div className="flex justify-between items-center mb-6 px-6 py-4 bg-ui-card rounded-2xl border border-ui-border sticky top-0 z-10 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✏️</span>
                <h2 className="text-xl font-black text-brand-primary uppercase">แก้ไขข้อมูล Master Data</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-brand-primary/10 text-ui-muted hover:text-brand-primary rounded-xl transition-all">✕</button>
            </div>
            <div className="bg-ui-card p-1 rounded-3xl border border-ui-border shadow-2xl">
              {activeTab === "customer" && isCustomer(target) && (
                <AddCustomerForm key={target.customer_code} initialValues={target as Customer} onSuccess={onSuccess} />
              )}
              {activeTab === "product" && isProduct(target) && (
                <AddProductForm key={target.ean_product_code} initialValues={target as Product} onSuccess={onSuccess} />
              )}
              {activeTab === "address" && isAddress(target) && (
                <AddAddressForm key={target.customer_no} initialValues={target as Address} onSuccess={onSuccess} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
