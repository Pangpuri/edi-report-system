"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MasterData, TabType, Customer, Product, Address } from "@/app/edi";

interface TableProps {
  data: MasterData[];
  activeTab: TabType;
  onDelete: (id: string) => void;
  onEdit: (item: MasterData) => void;
  onView: (item: MasterData) => void;
  userRole?: string;
  currentPage?: number;
  totalPages?: number;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export const isCustomer = (item: MasterData): item is Customer => "customer_code" in item;
export const isProduct = (item: MasterData): item is Product => "ean_product_code" in item;
export const isAddress = (item: MasterData): item is Address => "customer_no" in item;

export function MasterDataTable({ 
  data, 
  activeTab, 
  onDelete,
  onEdit,
  onView,
  userRole,
  currentPage = 1,
  totalPages = 1,
  onNextPage,
  onPrevPage 
}: TableProps) {

  const isAdmin = userRole === "admin";

  if (data.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="p-12 text-center text-ui-muted italic bg-ui-card rounded-[2.5rem] border border-ui-border text-xs font-medium"
      >
        ไม่พบข้อมูลที่ค้นหา 🔍
      </motion.div>
    );
  }

  const stickyLeftHeader = "sticky left-0 z-30 bg-ui-bg/95 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  const stickyLeftCell = "sticky left-0 z-10 bg-ui-card group-hover:bg-brand-primary/[0.03] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors";
  
  const stickyRightHeader = "md:sticky md:right-0 z-30 bg-ui-bg/95 backdrop-blur-sm md:shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  const stickyRightCell = "md:sticky md:right-0 z-10 bg-ui-card group-hover:bg-brand-primary/[0.03] md:shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors border-l border-ui-border/20 md:border-none";

  // Dynamic padding based on tab (Address needs to be tighter)
  const cellPadding = activeTab === "address" ? "p-2.5" : "p-4";

  return (
    <div className="w-full flex-1 flex flex-col bg-transparent overflow-hidden">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className={`text-left text-xs border-separate border-spacing-0 ${activeTab === "address" ? "min-w-[2800px]" : "min-w-full"}`}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-ui-bg text-ui-muted uppercase tracking-wider font-medium">
              {activeTab === "customer" && (
                <>
                  <th className={`${cellPadding} border-b border-ui-border w-[120px] ${stickyLeftHeader}`}>Code</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>EAN</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>Company Name</th>
                  <th className={`${cellPadding} border-b border-ui-border text-right bg-ui-bg/95 backdrop-blur-sm`}>Short Name</th>
                  <th className={`${cellPadding} border-b border-ui-border text-center w-44 ${stickyRightHeader}`}>Management</th>
                </>
              )}
              {activeTab === "product" && (
                <>
                  <th className={`${cellPadding} border-b border-ui-border w-[150px] ${stickyLeftHeader}`}>Barcode</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>Internal</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>Description</th>
                  <th className={`${cellPadding} border-b border-ui-border text-center w-44 ${stickyRightHeader}`}>Management</th>
                </>
              )}
              {activeTab === "address" && (
                <>
                  <th className={`${cellPadding} border-b border-ui-border w-[120px] ${stickyLeftHeader}`}>Cust No</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm w-[250px]`}>Company Name</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm w-[200px]`}>Local Name</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>EAN</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm w-[300px]`}>Address 1</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm w-[300px]`}>Address 2</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>City</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>Zip</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm`}>Tel</th>
                  <th className={`${cellPadding} border-b border-ui-border bg-ui-bg/95 backdrop-blur-sm text-center w-44 ${stickyRightHeader}`}>Management</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border/30 text-ui-text relative">
            <AnimatePresence mode="popLayout" initial={false}>
              {data.map((item, index) => {
                const rawId = String(isCustomer(item) ? item.customer_code : isProduct(item) ? item.ean_product_code : item.customer_no || "").trim();
                const rowKey = `${activeTab}-${rawId}-${index}`;

                return (
                  <motion.tr
                    key={rowKey}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="hover:bg-brand-primary/[0.01] transition-colors group"
                  >
                    {/* 🏢 CUSTOMER RENDER */}
                    {activeTab === "customer" && isCustomer(item) && (
                      <>
                        <td className={`${cellPadding} whitespace-nowrap font-mono text-brand-primary font-medium w-[120px] ${stickyLeftCell}`}>
                          {item.customer_code}
                        </td>
                        <td className={`${cellPadding} whitespace-nowrap font-mono`}>
                          {item.ean_location_code ?? "-"}
                        </td>
                        <td className={`${cellPadding} whitespace-nowrap font-medium`}>
                          {item.company_name ?? "-"}
                        </td>
                        <td className={`${cellPadding} text-right whitespace-nowrap text-ui-muted font-medium`}>
                          {item.short_name ?? "-"}
                        </td>
                      </>
                    )}

                    {/* 📦 PRODUCT RENDER */}
                    {activeTab === "product" && isProduct(item) && (
                      <>
                        <td className={`${cellPadding} whitespace-nowrap font-mono text-brand-secondary font-medium w-[150px] ${stickyLeftCell}`}>
                          {item.ean_product_code}
                        </td>
                        <td className={`${cellPadding} whitespace-nowrap font-mono font-medium`}>
                          {item.internal_product_code ?? "-"}
                        </td>
                        <td className={`${cellPadding} whitespace-nowrap font-medium`}>
                          {item.product_description ?? "-"}
                        </td>
                      </>
                    )}

                    {/* 🏠 ADDRESS RENDER */}
                    {activeTab === "address" && isAddress(item) && (
                      <>
                        <td className={`${cellPadding} whitespace-nowrap font-mono text-brand-primary font-medium w-[120px] ${stickyLeftCell}`}>
                          {item.customer_no}
                        </td>
                        <td className={`${cellPadding} whitespace-nowrap font-medium`}>
                          <div className="max-w-[250px] truncate">{item.company_name ?? "-"}</div>
                        </td>
                        <td className={`${cellPadding} whitespace-nowrap font-medium text-ui-muted`}>
                          <div className="max-w-[200px] truncate">{item.local_name ?? "-"}</div>
                        </td>
                        <td className={`${cellPadding} whitespace-nowrap font-mono text-[14px]`}>{item.ean_location_code ?? "-"}</td>
                        <td className={`${cellPadding} whitespace-nowrap`}><div className="max-w-[300px] truncate">{item.address1 ?? "-"}</div></td>
                        <td className={`${cellPadding} whitespace-nowrap`}><div className="max-w-[300px] truncate">{item.address2 ?? "-"}</div></td>
                        <td className={`${cellPadding} whitespace-nowrap`}>{item.city ?? "-"}</td>
                        <td className={`${cellPadding} whitespace-nowrap font-mono text-brand-secondary`}>{item.zip_code ?? "-"}</td>
                        <td className={`${cellPadding} whitespace-nowrap`}>{item.telephone ?? "-"}</td>
                      </>
                    )}

                    <td className={`${cellPadding} ${stickyRightCell}`}>
                      <div className="flex justify-center gap-2">
                        <button onClick={() => onView(item)} className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all text-[11px] font-medium border border-blue-500/20">
                          View
                        </button>
                        <button onClick={() => onEdit(item)} className="px-3 py-1.5 rounded-xl bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary hover:text-white transition-all text-[11px] font-medium border border-brand-secondary/20">
                          Edit
                        </button>
                        {isAdmin && (
                          <button onClick={() => onDelete(rawId)} className="px-3 py-1.5 rounded-xl bg-status-error/10 text-status-error hover:bg-status-error hover:text-white transition-all text-[11px] font-medium border border-status-error/20">
                            Del
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="bg-ui-bg/50 border-t border-ui-border p-4 flex items-center justify-between">
        <div className="text-ui-muted text-[11px] font-medium uppercase tracking-widest pl-4">
          PAGE <span className="text-brand-primary">{currentPage}</span> / {totalPages}
        </div>
        <div className="flex gap-2 pr-4">
          <button onClick={onPrevPage} disabled={currentPage === 1} className="px-4 py-2 rounded-2xl bg-ui-card text-ui-text border border-ui-border hover:border-brand-primary disabled:opacity-30 transition-all font-medium text-[11px] shadow-sm active:scale-95">
            PREV
          </button>
          <button onClick={onNextPage} disabled={currentPage === totalPages} className="px-4 py-2 rounded-2xl bg-ui-card text-ui-text border border-ui-border hover:border-brand-primary disabled:opacity-30 transition-all font-medium text-[11px] shadow-sm active:scale-95">
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
}
