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

import { useAS400History } from "@/app/actions/edi/history-actions";
import { useColumnResizer } from "@/hooks/useColumnResizer";

export function AS400History() {
  const { columnWidths: headerWidths, handleResize: handleHeaderResize } = useColumnResizer();
  const { columnWidths: detailWidths, handleResize: handleDetailResize } = useColumnResizer();

  const handleResize = (table: 'header' | 'detail', column: string, e: React.MouseEvent) => {
    if (table === 'header') handleHeaderResize(column, e);
    else handleDetailResize(column, e);
  }

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

  // ฟังก์ชันสำหรับส่งออกข้อมูลที่เลือกเป็นไฟล์ TXT เพื่อดูรูปแบบโครงสร้างข้อมูล (จำลองการส่งเข้า AS400)
  const handleExportTxt = async () => {
    if (selectedHeaders.length === 0) return;

    let content = "";
    selectedHeaders.forEach(h => {
      // ส่วน Header
      content += `[HEADER]\n`;
      content += `CUSTOMER_PO: ${h.customerPo || ""}\n`;
      content += `CUSTOMER_NUM: ${h.customerNum || ""}\n`;
      content += `CUSTOMER_NAME: ${h.customerName || ""}\n`;
      content += `DATE_PO: ${h.datePo || ""}\n`;
      content += `DATE_SHIP: ${h.dateShip || ""}\n`;
      content += `TOTAL_AMOUNT: ${h.totalAmount || "0"}\n`;
      content += `FILE_NAME: ${h.fileName || ""}\n`;
      content += `--------------------------------------------------\n`;

      // คัดกรองรายการสินค้าที่ตรงกับ Header นี้จาก detailData
      const items = detailData.filter(d => d.headerId === h.id);
      
      content += `[ITEMS]\n`;
      items.forEach(d => {
        content += `${String(d.seqNum).padStart(3, '0')} | `;
        content += `${(d.Bar_Code_Item || "").padEnd(15, ' ')} | `;
        content += `${(d.productName || "").padEnd(30, ' ')} | `;
        content += `${String(d.orderQty || 0).padStart(8, ' ')} | `;
        content += `${String(d.unitPrice || 0).padStart(10, ' ')} | `;
        content += `${String(d.netAmount || 0).padStart(12, ' ')}\n`;
      });
      content += `\n==================================================\n\n`;
    });

    // หมายเหตุ: ปลายทาง AS400 บางเครื่องอาจต้องการ encoding เฉพาะเจาะจง 
    // การระบุ charset=utf-8 จะช่วยให้เปิดดูใน Notepad/VS Code ได้ถูกต้อง
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // เปลี่ยนชื่อไฟล์ให้สื่อว่าเป็นไฟล์สำหรับ Preview/Review ข้อมูล ไม่ใช่ไฟล์โอนเข้าจริง
    link.download = `EDI_AS400_REVIEW_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // อัปเดตสถานะในฐานข้อมูลสำหรับรายการที่ยังไม่นำเข้า
    for (const h of selectedHeaders) {
      if (!h.as400Status) {
        await handleToggleStatus(h.id, true); // Assuming export means it's now considered processed for AS400
      }
    }
  };

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
            <h2 className="text-lg font-medium text-emerald-600 uppercase tracking-tight">รายการข้อมูลก่อนพิมพ์</h2>
            <p className="text-[14px] text-ui-muted uppercase tracking-widest">ข้อมูลที่นำเข้าแล้ว</p>
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
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedHeaders.length === filteredHeaders.length && filteredHeaders.length > 0 ? "bg-brand-primary border-brand-primary text-white" : "border-ui-border bg-ui-bg"}`}
              >
                {selectedHeaders.length === filteredHeaders.length && filteredHeaders.length > 0 && <Check size={12} />}
              </button>
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-primary">ฐานข้อมูลปัจจุบัน ({filteredHeaders.length}) รายการ</h3>
            </div>
            <span className="text-[10px] font-bold text-ui-muted uppercase">{filteredHeaders.length} รายการ</span>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[1500px] table-fixed">
              <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-10">
                <tr className="font-medium uppercase text-ui-muted whitespace-nowrap">
                  <th className="px-2 py-2 border-r border-ui-border w-[60px] text-center relative">เลือก</th>
                  
                  <th style={{ width: headerWidths['customerNum'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ลูกค้า</span>
                    <div onMouseDown={(e) => handleResize('header', 'customerNum', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['fileName'] || 150 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ชื่อ file</span>
                    <div onMouseDown={(e) => handleResize('header', 'fileName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['customerPo'] || 150 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">เลขที่ใบสั่งซื้อ</span>
                    <div onMouseDown={(e) => handleResize('header', 'customerPo', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['buyerName'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ผู้สั่งซื้อ</span>
                    <div onMouseDown={(e) => handleResize('header', 'buyerName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['customerName'] || 200 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">ชื่อบริษัท</span>
                    <div onMouseDown={(e) => handleResize('header', 'customerName', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['datePo'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">วันที่สั่ง</span>
                    <div onMouseDown={(e) => handleResize('header', 'datePo', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['dateShip'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">วันที่ส่ง</span>
                    <div onMouseDown={(e) => handleResize('header', 'dateShip', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['totalAmount'] || 120 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                    <span className="truncate block">จำนวนเงินรวม</span>
                    <div onMouseDown={(e) => handleResize('header', 'totalAmount', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['as400ImportedAt'] || 150 }} className="px-4 py-2 border-r border-ui-border relative group">
                    <span className="truncate block">วันที่นำเข้าจริง</span>
                    <div onMouseDown={(e) => handleResize('header', 'as400ImportedAt', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['status'] || 150 }} className="px-4 py-2 border-r border-ui-border text-center relative group">
                    <span className="truncate block">สถานะ</span>
                    <div onMouseDown={(e) => handleResize('header', 'status', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['flag'] || 60 }} className="px-4 py-2 border-r border-ui-border text-center relative group">
                    <span className="truncate block">Flag</span>
                    <div onMouseDown={(e) => handleResize('header', 'flag', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['cusNameOp'] || 120 }} className="px-4 py-2 border-r border-ui-border text-center relative group">
                    <span className="truncate block">Cus_Name_OP</span>
                    <div onMouseDown={(e) => handleResize('header', 'cusNameOp', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                  
                  <th style={{ width: headerWidths['cusProdChange'] || 120 }} className="px-4 py-2 text-center relative group">
                    <span className="truncate block">Cus_Prod_Change</span>
                    <div onMouseDown={(e) => handleResize('header', 'cusProdChange', e)} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-primary/30 transition-all z-20 flex justify-center">
                      <div className="w-[1px] h-full bg-slate-400/50 dark:bg-blue-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border/10">
                {filteredHeaders.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-20 text-center text-ui-muted italic">
                      ไม่พบประวัติการนำเข้าในระบบ 
                    </td>
                  </tr>
                ) : (
                  filteredHeaders.map(h => {
                    const isSelected = selectedHeaders.some(sh => sh.id === h.id);
                    return (
                      <tr 
                        key={h.id} 
                        onClick={() => handleSelectHeader(h)} 
                        className={`cursor-pointer transition-all border-l-2 whitespace-nowrap font-medium ${isSelected ? "bg-brand-primary/10 border-l-brand-primary" : "hover:bg-brand-primary/5 border-l-transparent"}`}
                      >
                        <td className="px-4 py-2 border-r border-ui-border/10 text-center">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center mx-auto transition-all ${isSelected ? "bg-brand-primary border-brand-primary text-white shadow-md" : "border-ui-border bg-ui-bg"}`}>
                            {isSelected && <Check size={10} />}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-ui-border/10">{h.shortName || h.customerNum}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10 truncate max-w-[120px]" title={h.fileName ?? ""}>{h.fileName}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10 text-brand-primary">{h.customerPo}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10">{h.buyerName || h.customerNum}</td>
                        <td className="px-4 py-2 border-r text-sm border-ui-border/10 uppercase truncate max-w-[150px]" title={h.customerName ?? ""}>{h.customerName}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10">{h.datePo}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10">{h.dateShip}</td>
                        <td className="px-4 py-1.5 text-right font-medium text-emerald-600">{Number(h.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10 text-ui-muted">
                          {h.importedAtDisplay || "-"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-[11px] font-black uppercase tracking-tight ${h.as400Status ? "text-emerald-600" : "text-status-error"}`}>
                            {h.as400Status ? "นำเข้าAS400แล้ว" : "ยังไม่นำเข้าAS400"}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-r border-ui-border/10 text-center font-mono">{h.flag ? "F" : "S"}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10 truncate max-w-[100px]">{h.cusNameOp || "-"}</td>
                        <td className="px-4 py-2 truncate max-w-[100px]">{h.cusProdChange || "-"}</td>
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
          <div className="px-4 py-1.5 border-b border-ui-border bg-ui-bg/50 flex justify-between items-center whitespace-nowrap">
            <div className="flex items-center gap-4">
                <div className="flex bg-ui-bg p-0.5 rounded-lg border border-ui-border">
                  <button 
                    onClick={() => setActiveBottomTab("items")}
                    className={`px-3 py-1 rounded-md text-[12px] font-black uppercase tracking-widest transition-all ${activeBottomTab === "items" ? "bg-brand-primary text-white shadow-sm" : "text-ui-muted hover:text-ui-text"}`}
                  >
                    รายละเอียด
                  </button>
                  <button 
                    onClick={() => setActiveBottomTab("logs")}
                    className={`px-3 py-1 rounded-md text-[12px] font-black uppercase tracking-widest transition-all ${activeBottomTab === "logs" ? "bg-emerald-600 text-white shadow-sm" : "text-ui-muted hover:text-ui-text"}`}
                  >
                    ประวัติดำเนินการของข้อมูล
                  </button>
                </div>
                {(isDetailLoading || isPending || isLogsLoading) && <Loader2 size={12} className="animate-spin text-brand-primary" />}
            </div>
            <div className="flex gap-2">
              {selectedHeaders.length > 0 && (
                <button 
                  onClick={handleDeleteSelectedHeaders}
                  className="flex items-center gap-1.5 px-3 py-1 bg-status-error/10 text-status-error border border-status-error/20 rounded-lg text-[12px] font-black uppercase tracking-widest hover:bg-status-error hover:text-white transition-all"
                >
                  <Trash2 size={18} /> ลบข้อมูลออก ({selectedHeaders.length})
                </button>
              )}
              <button 
                onClick={handleReTransfer}
                disabled={selectedHeaders.length === 0 || isTransferring}
                className="disabled:opacity-30 flex items-center gap-1.5 px-3 py-1 bg-ui-bg border border-ui-border rounded-lg text-[12px] font-black uppercase tracking-widest hover:text-brand-primary transition-all"
              >
                <RefreshCw size={14} className={isTransferring ? "animate-spin" : ""} /> Re-Transfer ({selectedHeaders.length})
              </button>
              <button 
                disabled={selectedHeaders.length === 0} 
                className="disabled:opacity-30 flex items-center gap-1.5 px-3 py-1 bg-brand-primary text-white rounded-lg text-[12px] font-black uppercase tracking-widest shadow-md"
              >
                {/* รอรูปแบบฟอร์ม */}
                <Printer size={14} /> Print ({selectedHeaders.length}) 
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
                  <tr className="font-medium uppercase text-ui-muted whitespace-nowrap">
                    <th style={{ width: detailWidths['seqNum'] || 60 }} className="px-4 py-2 border-r border-ui-border relative group">
                      ลำดับ
                      <div onMouseDown={(e) => handleResize('detail', 'seqNum', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['productName'] || 250 }} className="px-4 py-2 border-r border-ui-border relative group">
                      รายการ
                      <div onMouseDown={(e) => handleResize('detail', 'productName', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['packSize'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">
                      ขนาดบรรจุ
                      <div onMouseDown={(e) => handleResize('detail', 'packSize', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['Bar_Code_Item'] || 130 }} className="px-4 py-2 border-r border-ui-border font-mono relative group">
                      บาร์โค้ด
                      <div onMouseDown={(e) => handleResize('detail', 'Bar_Code_Item', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['buyerProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                      รหัสผู้ซื้อ
                      <div onMouseDown={(e) => handleResize('detail', 'buyerProdCode', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['vendorProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                      รหัสผู้ผลิต
                      <div onMouseDown={(e) => handleResize('detail', 'vendorProdCode', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['orderQty'] || 80 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      จำนวน
                      <div onMouseDown={(e) => handleResize('detail', 'orderQty', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['unitPrice'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      ราคา
                      <div onMouseDown={(e) => handleResize('detail', 'unitPrice', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['freeQty'] || 80 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      แถม
                      <div onMouseDown={(e) => handleResize('detail', 'freeQty', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['discount1'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      ส่วนลด 1
                      <div onMouseDown={(e) => handleResize('detail', 'discount1', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th> 
                    <th style={{ width: detailWidths['discount2'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      ส่วนลด 2
                      <div onMouseDown={(e) => handleResize('detail', 'discount2', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['discount3'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      ส่วนลด 3
                      <div onMouseDown={(e) => handleResize('detail', 'discount3', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>                    
                    <th style={{ width: detailWidths['netAmount'] || 120 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                      จำนวนเงิน
                      <div onMouseDown={(e) => handleResize('detail', 'netAmount', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['checkBarInt'] || 130 }} className="px-4 py-2 border-r border-ui-border relative group">
                      Check_Bar_In
                      <div onMouseDown={(e) => handleResize('detail', 'checkBarInt', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['checkNameOldProd'] || 150 }} className="px-4 py-2 border-r border-ui-border relative group">
                      Check_Name_Old_Prod
                      <div onMouseDown={(e) => handleResize('detail', 'checkNameOldProd', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['changeItem'] || 130 }} className="px-4 py-2 border-r border-ui-border relative group">
                      Change_Item
                      <div onMouseDown={(e) => handleResize('detail', 'changeItem', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                    <th style={{ width: detailWidths['changeProdName'] || 180 }} className="px-4 py-2 border-r border-ui-border relative group">
                      Change_Prod_Name
                      <div onMouseDown={(e) => handleResize('detail', 'changeProdName', e)} className="absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border/10">
                  {detailData.length > 0 ? (
                    Array.from(new Map(detailData.map(d => [d.id, d])).values()).map(d => (
                      <tr key={d.id} className="hover:bg-ui-bg/50 transition-colors whitespace-nowrap text-ui-text font-medium">
                        <td className="px-4 py-1.5 font-medium">{d.seqNum}</td>
                        <td className="px-4 py-1.5 text-xs truncate max-w-[200px]" title={d.productName ?? ""}>{d.productName}</td>
                        <td className="px-4 py-1.5">{d.packSize || "-"}</td>
                        <td className="px-4 py-1.5 text-left text-emerald-600 font-mono">{d.Bar_Code_Item}</td>
                        <td className="px-4 py-1.5">{d.buyerProdCode || "-"}</td>
                        <td className="px-4 py-1.5">{d.vendorProdCode || "-"}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.orderQty || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right text-emerald-600">{Number(d.unitPrice || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.freeQty || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount1 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount2 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount3 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right font-medium text-emerald-600">{Number(d.netAmount || 0).toFixed(2)}</td>

                        <td className="px-4 py-1.5 text-brand-primary font-mono">{d.checkBarInt || "-"}</td>
                        <td className="px-4 py-1.5 truncate max-w-[120px]">{d.checkBarInt ? (d.checkNameOldProd || "-") : "-"}</td>
                        <td className="px-4 py-1.5 truncate max-w-[100px]">{d.checkBarInt ? (d.changeItem || "-") : "-"}</td>
                        <td className="px-4 py-1.5 truncate max-w-[150px]">{d.checkBarInt ? (d.changeProdName || "-") : "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={17} className="px-4 py-10 text-center text-ui-muted italic">
                        ไม่พบรายละเอียดสินค้าในประวัติ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
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
                          {log.createdAtDisplay || "-"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-status-error/10 text-status-error'}`}>
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
