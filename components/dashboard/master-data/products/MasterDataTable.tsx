"use client";

import { useState } from "react";
import { MasterData, TabType, Customer, Product, Address } from "@/app/edi";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Edit, Trash2, DollarSign } from "lucide-react";

interface MasterDataTableProps {
  data: MasterData[];
  activeTab: TabType;
  userRole: string;
  onDelete: (id: string) => void;
  onEdit: (item: MasterData) => void;
  onView: (item: MasterData) => void;
  onManagePrice?: (item: MasterData) => void;
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
}

// Type guards using 'in' operator for better narrowing
export const isCustomer = (item: MasterData): item is Customer => "customer_code" in item;
export const isProduct = (item: MasterData): item is Product => "ean_product_code" in item;
export const isAddress = (item: MasterData): item is Address => "customer_no" in item;

// Helper to get unique ID from MasterData item safely
export const getItemId = (item: MasterData): string => {
  if (isCustomer(item)) return item.customer_code;
  if (isProduct(item)) return item.ean_product_code;
  if (isAddress(item)) return item.customer_no;
  return "";
};

export function MasterDataTable({
  data,
  activeTab,
  userRole,
  onDelete,
  onEdit,
  onView,
  onManagePrice,
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
}: MasterDataTableProps) {

  const isAdmin = userRole === "admin";
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // ฟังก์ชันลอจิกการลากปรับขนาดคอลัมน์
  const handleResize = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.pageX;
    const startWidth = columnWidths[column] || 100;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.cursor = 'col-resize';
    document.body.appendChild(overlay);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
    };

    const onMouseUp = () => {
      document.body.removeChild(overlay);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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

  // Dynamic padding based on tab (Tight padding to match EDI center)
  const cellPadding = "px-1.5 py-1";
  const colBorder = "border-r border-ui-border/30";

  return (
    <div className="w-full flex-1 flex flex-col bg-transparent overflow-hidden">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className={`w-full text-left text-[13px] border-collapse ${activeTab === "address" ? "min-w-[1800px]" : "min-w-full"}`}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-ui-bg text-ui-muted tracking-tight font-bold uppercase text-[12px] border-b border-ui-border">
              {activeTab === "customer" && (
                <>
                  <th style={{ width: columnWidths['cus_code'] || 100 }} className={`${cellPadding} ${colBorder} ${stickyLeftHeader} relative group`}>
                    <span className="truncate block">Code</span>
                    <div onMouseDown={(e) => handleResize('cus_code', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['cus_ean'] || 140 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">EAN</span>
                    <div onMouseDown={(e) => handleResize('cus_ean', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['cus_company'] || 300 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Company Name</span>
                    <div onMouseDown={(e) => handleResize('cus_company', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['cus_short'] || 180 }} className={`${cellPadding} ${colBorder} text-right bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Short Name</span>
                    <div onMouseDown={(e) => handleResize('cus_short', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th className={`${cellPadding} border-b border-ui-border text-center w-44 ${stickyRightHeader}`}>Management</th>
                </>
              )}
              {activeTab === "product" && (
                <>
                  <th style={{ width: columnWidths['prod_barcode'] || 160 }} className={`${cellPadding} ${colBorder} ${stickyLeftHeader} relative group`}>
                    <span className="truncate block">Barcode</span>
                    <div onMouseDown={(e) => handleResize('prod_barcode', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['prod_internal'] || 130 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Internal</span>
                    <div onMouseDown={(e) => handleResize('prod_internal', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['prod_description'] || 400 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Description</span>
                    <div onMouseDown={(e) => handleResize('prod_description', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th className={`${cellPadding} border-b border-ui-border text-center w-44 ${stickyRightHeader}`}>Management</th>
                </>
              )}
              {activeTab === "address" && (
                <>
                  <th style={{ width: columnWidths['addr_code'] || 140 }} className={`${cellPadding} ${colBorder} ${stickyLeftHeader} relative group`}>
                    <span className="truncate block">Customer_Code</span>
                    <div onMouseDown={(e) => handleResize('addr_code', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['addr_name'] || 240 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Customer_Name</span>
                    <div onMouseDown={(e) => handleResize('addr_name', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['addr_addr1'] || 240 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Cus_Address1</span>
                    <div onMouseDown={(e) => handleResize('addr_addr1', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['addr_addr2'] || 200 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Cus_Address2</span>
                    <div onMouseDown={(e) => handleResize('addr_addr2', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['addr_addr3'] || 150 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Cus_Address3</span>
                    <div onMouseDown={(e) => handleResize('addr_addr3', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['addr_tel'] || 120 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Tel</span>
                    <div onMouseDown={(e) => handleResize('addr_tel', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['addr_fax'] || 120 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Fax</span>
                    <div onMouseDown={(e) => handleResize('addr_fax', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths['addr_cus_name'] || 160 }} className={`${cellPadding} ${colBorder} bg-ui-bg/95 backdrop-blur-sm relative group`}>
                    <span className="truncate block">Cus_Name</span>
                    <div onMouseDown={(e) => handleResize('addr_cus_name', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  <th className={`${cellPadding} border-b border-ui-border text-center w-44 ${stickyRightHeader}`}>Management</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border/10 text-ui-text relative">
            <AnimatePresence mode="popLayout" initial={false}>
              {data.map((item, index) => {
                const rawId = getItemId(item); // Use the helper function
                const rowKey = `${activeTab}-${rawId}-${index}`;

                return (
                  <motion.tr
                    key={rowKey}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="hover:bg-brand-primary/[0.03] transition-colors group border-b border-ui-border/5"
                  >
                    {/*  CUSTOMER RENDER */}
                    {activeTab === "customer" && isCustomer(item) && (
                      <>
                        <td style={{ width: columnWidths['cus_code'] || 100 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-medium text-brand-primary ${stickyLeftCell}`}>
                          {item.customer_code}
                        </td>
                        <td style={{ width: columnWidths['cus_ean'] || 140 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-mono text-[12px]`}>
                          {item.ean_location_code ?? "-"}
                        </td>
                        <td style={{ width: columnWidths['cus_company'] || 300 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-medium`}>
                          <div className="max-w-[400px] truncate">{item.company_name ?? "-"}</div>
                        </td>
                        <td style={{ width: columnWidths['cus_short'] || 180 }} className={`${cellPadding} ${colBorder} text-right whitespace-nowrap text-ui-muted font-medium`}>
                          {item.short_name ?? "-"}
                        </td>
                      </>
                    )}

                    {/*  PRODUCT RENDER */}
                    {activeTab === "product" && isProduct(item) && (
                      <>
                        <td style={{ width: columnWidths['prod_barcode'] || 160 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-medium text-brand-secondary ${stickyLeftCell}`}>
                          {item.ean_product_code}
                        </td>
                        <td style={{ width: columnWidths['prod_internal'] || 130 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-mono font-medium`}>
                          {item.internal_product_code ?? "-"}
                        </td>
                        <td style={{ width: columnWidths['prod_description'] || 400 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-medium`}>
                          <div className="max-w-[600px] truncate">{item.product_description ?? "-"}</div>
                        </td>
                      </>
                    )}

                    {/*  ADDRESS RENDER */}
                    {activeTab === "address" && isAddress(item) && (
                      <>
                        <td style={{ width: columnWidths['addr_code'] || 140 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-medium text-brand-primary ${stickyLeftCell}`}>
                          {item.ean_location_code || "-"}
                        </td>
                        <td style={{ width: columnWidths['addr_name'] || 240 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-medium`}>
                          <div className="max-w-[220px] truncate">{item.company_name || item.local_name || "-"}</div>
                        </td>
                        <td style={{ width: columnWidths['addr_addr1'] || 240 }} className={`${cellPadding} ${colBorder} whitespace-nowrap`}><div className="max-w-[220px] truncate">{item.address1 ?? "-"}</div></td>
                        <td style={{ width: columnWidths['addr_addr2'] || 200 }} className={`${cellPadding} ${colBorder} whitespace-nowrap`}><div className="max-w-[180px] truncate">{item.address2 ?? "-"}</div></td>
                        <td style={{ width: columnWidths['addr_addr3'] || 150 }} className={`${cellPadding} ${colBorder} whitespace-nowrap`}>{item.city ?? "-"}</td>
                        <td style={{ width: columnWidths['addr_tel'] || 120 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-mono text-[12px]`}>{item.telephone ?? "-"}</td>
                        <td style={{ width: columnWidths['addr_fax'] || 120 }} className={`${cellPadding} ${colBorder} whitespace-nowrap font-mono text-[12px]`}>{item.fax_no ?? "-"}</td>
                        <td style={{ width: columnWidths['addr_cus_name'] || 160 }} className={`${cellPadding} ${colBorder} whitespace-nowrap text-ui-muted font-medium`}>{item.customer_no || "-"}</td>
                      </>
                    )}

                    <td className={`${cellPadding} ${stickyRightCell}`}>
                      <div className="flex justify-center gap-1.5">
                        {activeTab === "product" && onManagePrice && (
                          <button 
                            onClick={() => onManagePrice(item)} 
                            className="px-3 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-[12px] font-medium border border-brand-primary/20"
                          >
                            แปลงหน่วย
                          </button>
                        )}
                        <button onClick={() => onView(item)} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all text-[12px] font-medium border border-blue-500/20">
                          View
                        </button>
                        <button onClick={() => onEdit(item)} className="px-3 py-1.5 rounded-lg bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary hover:text-white transition-all text-[12px] font-medium border border-brand-secondary/20">
                          Edit
                        </button>
                        {isAdmin && (
                          <button onClick={() => onDelete(rawId)} className="px-3 py-1.5 rounded-lg bg-status-error/10 text-status-error hover:bg-status-error hover:text-white transition-all text-[12px] font-medium border border-status-error/20">
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

      <div className="bg-ui-bg/50 border-t border-ui-border p-2 flex items-center justify-between">
        <div className="text-ui-muted text-[10px] font-black uppercase tracking-widest pl-4">
          PAGE <span className="text-brand-primary">{currentPage}</span> / {totalPages}
        </div>
        <div className="flex gap-2 pr-4">
          <button onClick={onPrevPage} disabled={currentPage === 1} className="px-4 py-1.5 rounded-lg bg-ui-card text-ui-text border border-ui-border hover:border-brand-primary disabled:opacity-30 transition-all font-black text-[9px] uppercase tracking-widest shadow-sm active:scale-95">
            PREV
          </button>
          <button onClick={onNextPage} disabled={currentPage === totalPages} className="px-4 py-1.5 rounded-lg bg-ui-card text-ui-text border border-ui-border hover:border-brand-primary disabled:opacity-30 transition-all font-black text-[9px] uppercase tracking-widest shadow-sm active:scale-95">
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
}