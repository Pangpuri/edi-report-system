// components/dashboard/import-data/(tabs)/DataViewTab.tsx
"use client";

import { motion } from "framer-motion";
import { 
  AlertTriangle, Trash2, ClipboardCheck, 
  CheckCircle2, Loader2, MousePointer2 
} from "lucide-react";
import { EDHData, EDLData } from "../types";

interface DataViewTabProps {
  headerData: EDHData[];
  selectedHeaders: EDHData[];
  detailData: EDLData[];
  isDetailLoading: boolean;
  isPending: boolean;
  isTransferring: boolean;
  headerWidths: Record<string, number>;
  detailWidths: Record<string, number>;
  handleResize: (table: 'header' | 'detail', column: string, e: React.MouseEvent) => void;
  handleSelectHeader: (header: EDHData) => void;
  toggleSelectAllHeaders: () => void;
  handleDeleteTemp: () => void;
  handleTransferToAS400: () => void;
}

export function DataViewTab({
  headerData,
  selectedHeaders,
  detailData,
  isDetailLoading,
  isPending,
  isTransferring,
  headerWidths,
  detailWidths,
  handleResize,
  handleSelectHeader,
  toggleSelectAllHeaders,
  handleDeleteTemp,
  handleTransferToAS400
}: DataViewTabProps) {
  // คำนวณจำนวนรายการที่มีปัญหา (ไม่พบลูกค้า หรือ สินค้าใน PO มีปัญหา)
  const incompleteCount = headerData.filter(h => h.isCustomerValid === false || h.hasDetailError === true).length;

  // ตรวจสอบว่าในรายการที่เลือก "มีรายการที่ผิดปกติ" รวมอยู่ด้วยหรือไม่ ผิดปกติจะไม่ให้โอนไปได้ เพราะไม่ตรงตามฐานข้อมูลหลัก
  const hasInvalidSelection = selectedHeaders.some(
    (h) => h.isCustomerValid === false || h.hasDetailError === true
  );

  return (
    <motion.div 
      key="data_view" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 flex flex-col gap-4 min-h-0"
    >
      {/* แถบเครื่องมือ: แจ้งเตือน และ ปุ่มโอนข้อมูล/ลบข้อมูล */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-ui-bg/50 p-3 rounded-lg border border-ui-border">
        <div className="flex flex-col gap-1">
          <div className={`flex items-center gap-2 ${incompleteCount > 0 ? "text-status-error" : "text-emerald-600"}`}>
            <AlertTriangle size={14} />
            <span className="text-sm font-bold uppercase">ไม่ตรงตามฐานข้อมูล หรือมีปัญหา : {incompleteCount} รายการ</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDeleteTemp}
            disabled={selectedHeaders.length === 0 || isTransferring}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all ${
              selectedHeaders.length > 0 
                ? "bg-status-error/10 text-status-error border border-status-error/20 hover:bg-status-error hover:text-white" 
                : "bg-ui-border text-ui-muted cursor-not-allowed"
            }`}
          >
            <Trash2 size={14} /> ลบข้อมูล ({selectedHeaders.length})
          </button>
          <button 
            onClick={handleTransferToAS400}
            disabled={selectedHeaders.length === 0 || isTransferring || hasInvalidSelection}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all ${
              selectedHeaders.length > 0 && !hasInvalidSelection
                ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700" 
                : "bg-ui-border text-ui-muted cursor-not-allowed"
            }`}
          >
            <ClipboardCheck size={14} /> โอนเข้าฐานข้อมูลก่อนพิมพ์ ({selectedHeaders.length})
          </button>
        </div>
      </div>

      {/* --- ตาราง MASTER (Header) --- */}
      <div className="flex-[3] min-h-0 flex flex-col bg-ui-bg/30 border border-ui-border rounded-lg overflow-hidden shadow-inner">
        <div className="px-4 py-2 border-b border-ui-border bg-ui-card flex justify-between items-center whitespace-nowrap">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAllHeaders}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                selectedHeaders.length === headerData.length && headerData.length > 0 
                  ? "bg-brand-primary border-brand-primary text-white" 
                  : "border-ui-border bg-ui-bg"
              }`}
            >
              {selectedHeaders.length === headerData.length && headerData.length > 0 && <CheckCircle2 size={12} />}
            </button>
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary">ข้อมูลที่ประมวลผลแล้ว</h3>
          </div>
          <span className="text-[10px] font-bold text-ui-muted uppercase">{headerData.length} รายการ (เลือกแล้ว {selectedHeaders.length})</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[1200px] table-fixed">
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
                
                <th className="px-4 py-2 text-left">วันที่เข้าสู่ระบบ</th>
                <th className="px-4 py-2 text-center">สถานะ</th>
                <th className="px-4 py-2 text-center">ตรวจสอบข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border/10">
              {headerData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-20 text-center text-ui-muted italic">
                    ไม่พบข้อมูลใบสั่งซื้อที่รอการประมวลผล กรุณานำเข้าไฟล์และกด ประมวลผลไฟล์ 📥
                  </td>
                </tr>
              ) : headerData.map(h => {
                const isSelected = selectedHeaders.some(sh => sh.id === h.id);
                const hasError = h.isCustomerValid === false || h.hasDetailError === true;
                return (
                  <tr 
                    key={h.id} 
                    onClick={() => handleSelectHeader(h)} 
                    className={`cursor-pointer transition-all border-l-2 whitespace-nowrap font-medium ${
                      isSelected ? "bg-brand-primary/10 border-l-brand-primary" : "hover:bg-brand-primary/5 border-l-transparent"
                    }`}
                  >
                    <td className="px-4 py-2 border-r border-ui-border/10 text-center">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center mx-auto transition-all ${
                        isSelected ? "bg-brand-primary border-brand-primary text-white shadow-md" : "border-ui-border bg-ui-bg"
                      }`}>
                        {isSelected && <CheckCircle2 size={10} />}
                      </div>
                    </td>
                    <td className="px-4 py-2 border-r border-ui-border/10">{h.shortName || h.customerNum}</td>
                    <td className="px-4 py-2 border-r border-ui-border/10 truncate max-w-[120px]" title={h.fileName ?? ""}>{h.fileName}</td>
                    <td className="px-4 py-2 border-r border-ui-border/10 text-brand-primary">{h.customerPo}</td>
                    <td className="px-4 py-2 border-r border-ui-border/10">{h.buyerName || h.customerNum}</td>
                    <td className="px-4 py-2 border-r text-sm border-ui-border/10 uppercase truncate max-w-[150px]" title={h.customerName ?? ""}>{h.customerName}</td>
                    <td className="px-4 py-2 border-r border-ui-border/10">{h.datePo}</td>
                    <td className="px-4 py-2 border-r border-ui-border/10">{h.dateShip}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-emerald-600">
                      {Number(h.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-4 py-2 border-r border-ui-border/10 text-ui-muted">
                      {h.createdAtDisplay || (h.createdAt ? new Date(h.createdAt).toLocaleString('th-TH') : "-")}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {h.as400Status ?  (
                        <span className="text-[12px] font-medium text-red-600 uppercase">เคยนำเข้าแล้ว</span>
                      ) : (
                        <span className="text-[12px] font-medium text-ui-muted uppercase opacity-50">รอนำเข้า</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {h.isCustomerValid === false ? (
                        <span className="text-[12px] font-medium text-red-600 px-2 py-0.5 rounded ">ไม่พบลูกค้า</span>
                      ) : h.hasDetailError === true ? (
                        <span className="text-[12px] font-medium text-orange-600 px-2 py-0.5 "> ข้อมูลผิดปกติ </span>
                      ) : (
                        <span className="text-[12px] font-medium text-emerald-600 ">ข้อมูลถูกต้อง</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ตาราง DETAIL (รายการสินค้า) --- */}
      <div className="flex-[2] min-h-0 flex flex-col bg-ui-card border border-ui-border rounded-lg overflow-hidden shadow-2xl">
        <div className="px-4 py-1.5 border-b border-ui-border bg-ui-bg/50 flex justify-between items-center whitespace-nowrap">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase text-ui-text">รายละเอียดรายการสินค้า</h3>
            {(isDetailLoading || isPending) && <Loader2 size={12} className="animate-spin text-brand-primary" />}
          </div>
          {selectedHeaders.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-brand-primary uppercase bg-brand-primary/10 px-2 py-0.5 rounded">
                {selectedHeaders.length === 1 ? `PO: ${selectedHeaders[0].customerPo}` : `เลือกแล้ว ${selectedHeaders.length} ใบสั่งซื้อ`}
              </span>
              <span className="text-[10px] font-bold text-ui-muted uppercase">{detailData.length} รายการรวม</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar text-xs">
          {selectedHeaders.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[1400px] table-fixed">
              <thead className="sticky top-0 bg-ui-bg border-b border-ui-border">
                <tr className="font-medium uppercase text-ui-muted whitespace-nowrap">
                  <th style={{ width: detailWidths['seqNum'] || 60 }} className="px-4 py-2 border-r border-ui-border relative group">
                    ลำดับ
                    <div onMouseDown={(e) => handleResize('detail', 'seqNum', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['productName'] || 250 }} className="px-4 py-2 border-r border-ui-border relative group">
                    รายการ
                    <div onMouseDown={(e) => handleResize('detail', 'productName', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['packSize'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">
                    ขนาดบรรจุ
                    <div onMouseDown={(e) => handleResize('detail', 'packSize', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['Bar_Code_Item'] || 130 }} className="px-4 py-2 border-r border-ui-border font-mono relative group">
                    บาร์โค้ด
                    <div onMouseDown={(e) => handleResize('detail', 'Bar_Code_Item', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['buyerProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                    รหัสผู้ซื้อ
                    <div onMouseDown={(e) => handleResize('detail', 'buyerProdCode', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['vendorProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                    รหัสผู้ผลิต
                    <div onMouseDown={(e) => handleResize('detail', 'vendorProdCode', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['orderQty'] || 80 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                    จำนวน
                    <div onMouseDown={(e) => handleResize('detail', 'orderQty', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['priceUnit'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                    ราคา
                    <div onMouseDown={(e) => handleResize('detail', 'priceUnit', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['freeQty'] || 80 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                    แถม
                    <div onMouseDown={(e) => handleResize('detail', 'freeQty', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['discount1'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                    ส่วนลด(%)
                    <div onMouseDown={(e) => handleResize('detail', 'discount1', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['discount2'] || 100 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                    ส่วนลด
                    <div onMouseDown={(e) => handleResize('detail', 'discount2', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['netAmount'] || 120 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                    จำนวนเงิน
                    <div onMouseDown={(e) => handleResize('detail', 'netAmount', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                  
                  <th style={{ width: detailWidths['fileName'] || 120 }} className="px-4 py-2 text-right relative group">
                    จากไฟล์
                    <div onMouseDown={(e) => handleResize('detail', 'fileName', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border/10">
                {detailData.map(d => (
                  <tr 
                    key={d.id} 
                    className={`hover:bg-ui-bg/50 transition-colors whitespace-nowrap text-ui-text font-medium ${
                      d.isProductValid === false ? "bg-red-500/5 text-red-600" : ""
                    }`}
                  >
                    <td className="px-4 py-1.5 font-medium">{d.seqNum}</td>
                    <td className="px-4 py-1.5 text-xs">{d.productName}</td>
                    <td className="px-4 py-1.5">{d.unitMeasure || d.packSize || "-"}</td>
                    <td className={`px-4 py-1.5 text-left ${d.isProductValid === false ? "text-red-600 font-medium" : "text-emerald-600"}`}>{d.Bar_Code_Item || "-"}</td>
                    <td className="px-4 py-1.5">{d.buyerProdCode || "-"}</td>
                    <td className="px-4 py-1.5">{d.vendorProdCode || "-"}</td>
                    <td className="px-4 py-1.5 text-right">{Number(d.orderQty).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-right text-emerald-600">{Number(d.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-right">{Number(d.freeQty || 0).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-right">{Number(d.discount1 || 0).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-right">{Number(d.discount2 || 0).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-emerald-600">{Number(d.netAmount || 0).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-right text-ui-muted truncate max-w-[100px]" title={d.fileName ?? ""}>{d.fileName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
              <MousePointer2 size={24} className="animate-bounce" />
              <span className="uppercase text-xs font-black tracking-widest">เลือกใบสั่งซื้อด้านบนเพื่อดูรายละเอียดสินค้า</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
