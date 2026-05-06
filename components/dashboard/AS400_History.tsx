"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Search, Loader2,
  MousePointer2,
  Printer, 
  Database,
  RefreshCw,
  Clock,
  Check,
  Trash2
} from "lucide-react";

import { useAS400History } from "../../app/actions/AS400_History_logic";

export function AS400History() {
  // --- ชุดตัวแปร (States) สำหรับปรับขนาดคอลัมน์ ---
  const [headerWidths, setHeaderWidths] = useState<Record<string, number>>({});
  const [detailWidths, setDetailWidths] = useState<Record<string, number>>({});

  // ฟังก์ชันลอจิกตอนลากปรับขนาดคอลัมน์
  const handleResize = (table: 'header' | 'detail', column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.pageX;
    const startWidth = table === 'header' 
      ? (headerWidths[column] || 150) 
      : (detailWidths[column] || 150);

    // ใช้ overlay โปร่งใสเต็มหน้าจอขณะลาก เพื่อให้การลื่นไหลไม่หลุดแม้เมาส์จะเลื่อนเร็ว
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.cursor = 'col-resize';
    document.body.appendChild(overlay);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      
      if (table === 'header') {
        setHeaderWidths(prev => ({ ...prev, [column]: newWidth }));
      } else {
        setDetailWidths(prev => ({ ...prev, [column]: newWidth }));
      }
    };

    const onMouseUp = () => {
      document.body.removeChild(overlay);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const {
    selectedHeaders,
    detailData,
    logData,
    activeBottomTab,
    setActiveBottomTab,
    isLoading,
    isDetailLoading,
    isLogsLoading,
    isTransferring,
    isPending,
    searchQuery,
    setSearchQuery,
    filteredHeaders,
    loadData,
    handleSelectHeader,
    toggleSelectAllHeaders,
    handleToggleStatus,
    handleReTransfer,
    handleDeleteSelectedHeaders
  } = useAS400History();

  return (
    <div className="bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg min-h-[600px] flex flex-col relative overflow-hidden text-ui-text">
      
      {/* ส่วน Loading ขณะประมวลผลประวัติ */}
      <AnimatePresence>
        {(isLoading || isTransferring) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-ui-card/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-brand-primary mb-2" />
            <h3 className="text-brand-primary font-bold text-sm uppercase tracking-widest">กำลังประมวลผลประวัติ...</h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ส่วนหัวตารางและแถบค้นหา */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-500 uppercase tracking-tight">AS/400 HISTORY</h2>
            <p className="text-[10px] text-ui-muted font-bold uppercase tracking-widest">ประวัติการนำเข้าข้อมูล (ถาวร)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" />
            <input 
              type="text" 
              placeholder="ค้นหาประวัติ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-ui-bg border border-ui-border rounded-lg pl-9 pr-3 py-2 text-sm w-72 focus:border-brand-primary outline-none"
            />
          </div>
          <button onClick={loadData} className="p-2 bg-ui-bg border border-ui-border rounded-lg text-ui-muted hover:text-brand-primary hover:border-brand-primary transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        
        {/* --- ส่วนตารางบน: ประวัติรายการทั้งหมด --- */}
        <div className="flex-[3] min-h-0 flex flex-col bg-ui-bg/30 border border-ui-border rounded-lg overflow-hidden shadow-inner">
          <div className="px-4 py-2 border-b border-ui-border bg-ui-card flex justify-between items-center whitespace-nowrap">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleSelectAllHeaders}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedHeaders.length === filteredHeaders.length && filteredHeaders.length > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "border-ui-border bg-ui-bg"}`}
              >
                {selectedHeaders.length === filteredHeaders.length && filteredHeaders.length > 0 && <Check size={10} />}
              </button>
              <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500">ประวัติถาวร</h3>
            </div>
            <span className="text-[10px] font-bold text-ui-muted uppercase">{filteredHeaders.length} รายการ</span>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[1500px] table-fixed">
              <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-10">
                <tr className="font-bold uppercase text-ui-muted whitespace-nowrap text-[13px]">
                  <th className="px-3 py-2 border-r border-ui-border w-10 text-center relative">เลือก</th>
                  
                  <th style={{ width: headerWidths['customerNum'] || 100 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ลูกค้า</span>
                    <div onMouseDown={(e) => handleResize('header', 'customerNum', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['fileName'] || 150 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ชื่อ file</span>
                    <div onMouseDown={(e) => handleResize('header', 'fileName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['customerPo'] || 150 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">เลขที่ใบสั่งซื้อ</span>
                    <div onMouseDown={(e) => handleResize('header', 'customerPo', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['buyerName'] || 120 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ผู้สั่งซื้อ</span>
                    <div onMouseDown={(e) => handleResize('header', 'buyerName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['customerName'] || 200 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ชื่อบริษัท</span>
                    <div onMouseDown={(e) => handleResize('header', 'customerName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['datePo'] || 100 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">วันที่สั่ง</span>
                    <div onMouseDown={(e) => handleResize('header', 'datePo', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['dateShip'] || 100 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">วันที่ส่ง</span>
                    <div onMouseDown={(e) => handleResize('header', 'dateShip', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['totalAmount'] || 120 }} className="px-3 py-2 border-r border-ui-border text-right relative group">
                    <span className="truncate block">จำนวนเงินรวม</span>
                    <div onMouseDown={(e) => handleResize('header', 'totalAmount', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['as400ImportedAt'] || 150 }} className="px-3 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">วันที่นำเข้าจริง</span>
                    <div onMouseDown={(e) => handleResize('header', 'as400ImportedAt', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['status'] || 150 }} className="px-3 py-2 border-r border-ui-border text-center relative group">
                    <span className="truncate block">สถานะ</span>
                    <div onMouseDown={(e) => handleResize('header', 'status', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['flag'] || 60 }} className="px-3 py-2 border-r border-ui-border text-center relative group">
                    <span className="truncate block">Flag</span>
                    <div onMouseDown={(e) => handleResize('header', 'flag', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['cusNameOp'] || 120 }} className="px-3 py-2 border-r border-ui-border text-center relative group">
                    <span className="truncate block">Cus_Name_OP</span>
                    <div onMouseDown={(e) => handleResize('header', 'cusNameOp', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['cusProdChange'] || 120 }} className="px-3 py-2 text-center relative group">
                    <span className="truncate block">Cus_Prod_Change</span>
                    <div onMouseDown={(e) => handleResize('header', 'cusProdChange', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border/10">
                {filteredHeaders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-20 text-center text-ui-muted italic">
                      ไม่พบประวัติการนำเข้าในระบบ 📭
                    </td>
                  </tr>
                ) : (
                  filteredHeaders.map(h => {
                    const isSelected = selectedHeaders.some(sh => sh.id === h.id);
                    return (
                      <tr 
                        key={h.id} 
                        onClick={() => handleSelectHeader(h)} 
                        className={`cursor-pointer transition-all border-l-4 whitespace-nowrap leading-relaxed ${isSelected ? "bg-emerald-500/10 border-l-emerald-500 font-bold" : "hover:bg-emerald-500/5 border-l-transparent"}`}
                      >
                        <td className="px-3 py-2 border-r border-ui-border/10 text-center">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center mx-auto transition-all ${isSelected ? "bg-emerald-500 border-emerald-500 text-white shadow-md" : "border-ui-border bg-ui-bg"}`}>
                            {isSelected && <Check size={8} />}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-ui-border/10 font-bold">{h.shortName || h.customerNum}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 truncate max-w-[100px]" title={h.fileName ?? ""}>{h.fileName}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 font-bold text-emerald-600">{h.customerPo}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 font-bold">{h.buyerName || h.customerNum}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 uppercase truncate max-w-[150px]" title={h.customerName ?? ""}>{h.customerName}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 font-mono">{h.datePo}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 font-mono">{h.dateShip}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 text-right font-bold text-emerald-600">{Number(h.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10 text-ui-muted text-xs">
                          {h.as400ImportedAt ? new Date(h.as400ImportedAt).toLocaleString('th-TH') : "-"}
                        </td>
                        <td className="px-3 py-3 border-r border-ui-border/10 text-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(h.id, h.as400Status ?? false); }}
                            className="relative group outline-none"
                          >
                            <motion.div 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`
                                min-w-[130px] px-4 py-2 rounded-xl text-[13px] font-black uppercase tracking-tight
                                transition-colors duration-500 border-2 shadow-sm
                                flex items-center justify-center gap-2
                                ${h.as400Status 
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500 hover:text-white" 
                                  : "bg-status-error/10 text-status-error border-status-error/30 hover:bg-status-error hover:text-white"
                                }
                              `}
                            >
                              <AnimatePresence mode="wait">
                                <motion.span
                                  key={h.as400Status ? "success" : "pending"}
                                  initial={{ opacity: 0, y: 2 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -2 }}
                                  transition={{ duration: 0.3 }}
                                  className="whitespace-nowrap"
                                >
                                  {h.as400Status ? (
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> สำเร็จ</span>
                                  ) : (
                                    <span className="flex items-center gap-1.5"><Clock size={16} /> รอนำเข้า</span>
                                  )}
                                </motion.span>
                              </AnimatePresence>

                              <motion.div 
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-ui-text text-white text-[11px] font-bold rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50 border border-white/10"
                              >
                                คลิกเพื่อสลับสถานะ
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-ui-text" />
                              </motion.div>
                            </motion.div>
                          </button>
                          
                        </td>
                        {/* รอ logic เพิ่มเติม */}
                        <td className="px-3 py-2 border-r border-ui-border/10 font-mono">{h.flag ? "F" : "S"}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10">{h.cusNameOp || "-"}</td>
                        <td className="px-3 py-2 border-r border-ui-border/10">{h.cusProdChange || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- ส่วนล่าง: รายละเอียด (สินค้า / Logs) --- */}
        <div className="flex-[2] min-h-0 flex flex-col bg-ui-card border border-ui-border rounded-lg overflow-hidden shadow-2xl">
          <div className="px-4 py-2 border-b border-ui-border bg-ui-bg/50 flex justify-between items-center whitespace-nowrap">
            <div className="flex items-center gap-4">
                <div className="flex bg-ui-bg p-0.5 rounded-lg border border-ui-border">
                  <button 
                    onClick={() => setActiveBottomTab("items")}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${activeBottomTab === "items" ? "bg-brand-primary text-white shadow-sm" : "text-ui-muted hover:text-ui-text"}`}
                  >
                    รายการสินค้า (History)
                  </button>
                  <button 
                    onClick={() => setActiveBottomTab("logs")}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${activeBottomTab === "logs" ? "bg-emerald-500 text-white shadow-sm" : "text-ui-muted hover:text-ui-text"}`}
                  >
                    AS/400 Logs
                  </button>
                </div>
                {(isDetailLoading || isPending || isLogsLoading) && <Loader2 size={12} className="animate-spin text-emerald-500" />}
            </div>
            <div className="flex gap-2">
              {selectedHeaders.length > 0 && (
                <button 
                  onClick={handleDeleteSelectedHeaders}
                  className="flex items-center gap-1.5 px-3 py-1 bg-status-error/10 text-status-error border border-status-error/20 rounded text-xs font-black uppercase hover:bg-status-error hover:text-white transition-all"
                >
                  <Trash2 size={12} /> Delete History ({selectedHeaders.length})
                </button>
              )}
              <button 
                onClick={handleReTransfer}
                disabled={selectedHeaders.length === 0 || isTransferring}
                className="disabled:opacity-30 flex items-center gap-1.5 px-3 py-1 bg-ui-bg border border-ui-border rounded text-xs font-black uppercase hover:text-brand-primary transition-all"
              >
                <RefreshCw size={12} className={isTransferring ? "animate-spin" : ""} /> Re-Sync ({selectedHeaders.length})
              </button>
              <button 
                disabled={selectedHeaders.length === 0} 
                className="disabled:opacity-30 flex items-center gap-1.5 px-3 py-1 bg-brand-primary text-white rounded text-xs font-black uppercase shadow-md"
              >
                <Printer size={12} /> Re-Print ({selectedHeaders.length})
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar text-xs">
            {selectedHeaders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                <MousePointer2 size={24} className="animate-bounce" />
                <span className="uppercase text-xs font-black tracking-widest">เลือกรายการประวัติเพื่อดูรายละเอียด</span>
              </div>
            ) : activeBottomTab === "items" ? (
              <table className="w-full text-left border-collapse min-w-[1800px] table-fixed">
                <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-20">
                  <tr className="font-black uppercase text-ui-muted whitespace-nowrap">
                    <th style={{ width: detailWidths['seqNum'] || 60 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">ลำดับ</span>
                      <div onMouseDown={(e) => handleResize('detail', 'seqNum', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['productName'] || 250 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">รายการ</span>
                      <div onMouseDown={(e) => handleResize('detail', 'productName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['packSize'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">ขนาดบรรจุ</span>
                      <div onMouseDown={(e) => handleResize('detail', 'packSize', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['eanNum'] || 130 }} className="px-4 py-2 border-r border-ui-border font-mono relative group">
                      <span className="truncate block">บาร์โค้ด</span>
                      <div onMouseDown={(e) => handleResize('detail', 'eanNum', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['buyerProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">รหัสผู้ซื้อ</span>
                      <div onMouseDown={(e) => handleResize('detail', 'buyerProdCode', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['vendorProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">รหัสผู้ผลิต</span>
                      <div onMouseDown={(e) => handleResize('detail', 'vendorProdCode', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['orderQty'] || 80 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      <span className="truncate block">จำนวน</span>
                      <div onMouseDown={(e) => handleResize('detail', 'orderQty', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['unitPrice'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      <span className="truncate block">ราคา</span>
                      <div onMouseDown={(e) => handleResize('detail', 'unitPrice', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['freeQty'] || 80 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      <span className="truncate block">แถม</span>
                      <div onMouseDown={(e) => handleResize('detail', 'freeQty', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['discount1'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      <span className="truncate block">ส่วนลด 1</span>
                      <div onMouseDown={(e) => handleResize('detail', 'discount1', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th> 
                    <th style={{ width: detailWidths['discount2'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      <span className="truncate block">ส่วนลด 2</span>
                      <div onMouseDown={(e) => handleResize('detail', 'discount2', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['discount3'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      <span className="truncate block">ส่วนลด 3</span>
                      <div onMouseDown={(e) => handleResize('detail', 'discount3', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>                    
                    <th style={{ width: detailWidths['totalAmount'] || 120 }} className="px-4 py-2 border-r border-ui-border text-right font-black text-emerald-600 relative group">
                      <span className="truncate block">จำนวนเงิน</span>
                      <div onMouseDown={(e) => handleResize('detail', 'totalAmount', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['checkBarInt'] || 130 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">Check_Bar_In</span>
                      <div onMouseDown={(e) => handleResize('detail', 'checkBarInt', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['checkNameOldProd'] || 150 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">Check_Name_Old_Prod</span>
                      <div onMouseDown={(e) => handleResize('detail', 'checkNameOldProd', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['changeItem'] || 130 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">Change_Item</span>
                      <div onMouseDown={(e) => handleResize('detail', 'changeItem', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                    <th style={{ width: detailWidths['changeProdName'] || 180 }} className="px-4 py-2 border-r border-ui-border relative group">
                      <span className="truncate block">Change_Prod_Name</span>
                      <div onMouseDown={(e) => handleResize('detail', 'changeProdName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                        <div className="w-[1.5px] h-full bg-slate-400/50 dark:bg-blue-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border/10">
                  {detailData.length > 0 ? (
                    detailData.map(d => (
                      <tr key={d.id} className="hover:bg-ui-bg/50 transition-colors whitespace-nowrap text-ui-text">
                        <td className="px-4 py-1.5 font-bold">{d.seqNum}</td>
                        <td className="px-4 py-1.5 font-bold truncate max-w-[200px]">{d.productName}</td>
                        <td className="px-4 py-1.5">{d.packSize || "-"}</td>
                        <td className="px-4 py-1.5 font-mono font-bold text-brand-primary">{d.eanNum}</td>
                        <td className="px-4 py-1.5 font-bold">{d.buyerProdCode || "-"}</td>
                        <td className="px-4 py-1.5 font-bold">{d.vendorProdCode || "-"}</td>
                        <td className="px-4 py-1.5 text-right font-bold">{Number(d.orderQty || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right font-bold text-emerald-600">{Number(d.unitPrice || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.freeQty || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount1 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount2 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount3 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right font-bold">{Number(d.totalAmount || 0).toFixed(2)}</td>

                        {/* รอข้อมูลมาเติม */}
                        <td className="px-4 py-1.5 text-right">{(d.checkBarInt || "-")}</td>  
                        <td className="px-4 py-1.5 text-right">{d.checkNameOldProd || "-"}</td>
                        <td className="px-4 py-1.5 text-right">{d.changeItem || "-"}</td>
                        <td className="px-4 py-1.5 text-right">{d.changeProdName || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-4 py-10 text-center text-ui-muted italic">
                        ไม่พบรายละเอียดสินค้าในประวัติ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-20">
                  <tr className="font-black uppercase text-ui-muted whitespace-nowrap">
                    <th className="px-4 py-2 border-r border-ui-border w-44">วันที่/เวลาดำเนินการ</th>
                    <th className="px-4 py-2 border-r border-ui-border w-32 text-center">สถานะ</th>
                    <th className="px-4 py-2 border-r border-ui-border">ข้อความบันทึก / Error Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border/10">
                  {logData.length > 0 ? (
                    logData.map(log => (
                      <tr key={log.id} className="hover:bg-ui-bg/50 transition-colors">
                        <td className="px-4 py-2 font-mono text-ui-muted">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('th-TH') : "-"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-status-error/10 text-status-error'}`}>
                            {log.status === 'success' ? 'สำเร็จ' : log.status === 'failed' ? 'ล้มเหลว' : (log.status || '-')}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-medium">{log.errorMessage || "ดำเนินการสำเร็จ"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-ui-muted italic">
                        ไม่พบ Log การทำงาน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
