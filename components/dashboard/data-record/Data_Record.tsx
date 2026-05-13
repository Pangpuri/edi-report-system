"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, Search, Loader2, MousePointer2, 
  Printer, RefreshCw, Check, Trash2, FileCheck
} from "lucide-react";
import { getEDHRecordData, getEDLRecordByHeadersAction, deleteRecordAction } from "@/app/actions/edi/record-actions";
import { useToast } from "@/components/ToastProvider";

interface EDHRecord {
  id: number;
  hType: string | null;
  customerPo: string | null;
  customerNum: string | null;
  customerName: string | null;
  shortName: string | null;
  buyerName: string | null;
  datePo: string | null;
  dateShip: string | null;
  totalAmount: string | null;
  fileName: string | null;
  createdAt: Date | null;
  importedAtDisplay: string;
}

interface EDLRecord {
  id: number;
  headerId: number | null;
  customerPo: string | null;
  customerNum: string | null;
  seqNum: string | null;
  productName: string | null;
  packSize: string | null;
  Bar_Code_Item: string | null;
  buyerProdCode: string | null;
  vendorProdCode: string | null;
  orderQty: string | null;
  unitPrice: string | null;
  freeQty: string | null;
  discount1: string | null;
  discount2: string | null;
  discount3: string | null;
  netAmount: string | null;
  fileName: string | null;
  checkBarInt: string | null;
  changeItem: string | null;
  changeProdName: string | null;
}

export function DataRecord() {
  const { showToast } = useToast();
  
  // --- States ---
  const [headerData, setHeaderData] = useState<EDHRecord[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<EDHRecord[]>([]);
  const [detailData, setDetailData] = useState<EDLRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [headerWidths, setHeaderWidths] = useState<Record<string, number>>({});
  const [detailWidths, setDetailWidths] = useState<Record<string, number>>({});

  // --- Handlers ---
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEDHRecordData();
      setHeaderData(data as EDHRecord[]);
    } catch (error) {
      console.error("Load Record Data Error:", error);
      showToast("ไม่สามารถโหลดข้อมูลที่นำเข้าระบบแล้วได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedHeaders.length === 0) {
      setDetailData([]);
      return;
    }

    const fetchDetails = async () => {
      setIsDetailLoading(true);
      try {
        const historyIds = selectedHeaders.map(h => h.id);
        const details = await getEDLRecordByHeadersAction(historyIds);
        setDetailData(details as EDLRecord[]);
      } catch (error) {
        console.error("Fetch Detail Error:", error);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchDetails();
  }, [selectedHeaders]);

  const handleSelectHeader = (header: EDHRecord) => {
    const isSelected = selectedHeaders.some(h => h.id === header.id);
    const next = isSelected 
      ? selectedHeaders.filter(h => h.id !== header.id) 
      : [...selectedHeaders, header];
    
    setSelectedHeaders(next);
  };

  const toggleSelectAllHeaders = () => {
    if (selectedHeaders.length === filteredHeaders.length && filteredHeaders.length > 0) {
      setSelectedHeaders([]);
    } else {
      setSelectedHeaders(filteredHeaders);
    }
  };

  const handleDeleteRecords = async () => {
    if (selectedHeaders.length === 0) return;
    if (!confirm(`ยืนยันการลบข้อมูลถาวรจำนวน ${selectedHeaders.length} รายการ?`)) return;

    setIsLoading(true);
    try {
      const ids = selectedHeaders.map(h => h.id);
      const res = await deleteRecordAction(ids);
      if (res.success) {
        showToast(res.message, "success");
        setSelectedHeaders([]);
        loadData();
      } else {
        showToast(res.message, "error");
      }
    } catch (error) {
      showToast("เกิดข้อผิดพลาดในการลบข้อมูล", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResize = (table: 'header' | 'detail', column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = table === 'header' ? (headerWidths[column] || 150) : (detailWidths[column] || 150);
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;cursor:col-resize;";
    document.body.appendChild(overlay);
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + (moveEvent.pageX - startX));
      if (table === 'header') setHeaderWidths(prev => ({ ...prev, [column]: newWidth }));
      else setDetailWidths(prev => ({ ...prev, [column]: newWidth }));
    };
    const onMouseUp = () => {
      document.body.removeChild(overlay);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const filteredHeaders = useMemo(() => {
    return headerData.filter(h => 
      h.customerPo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.customerNum?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [headerData, searchQuery]);

  return (
    <div className="bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg min-h-[600px] flex flex-col relative overflow-hidden text-ui-text">
      
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-ui-card/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-brand-primary mb-2" />
            <h3 className="text-brand-primary font-bold text-sm uppercase tracking-widest">กำลังโหลดข้อมูล...</h3>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary border border-brand-primary/20">
            <FileCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-medium text-brand-primary uppercase tracking-tight">ข้อมูลที่นำเข้าระบบแล้ว</h2>
            <p className="text-[14px] text-ui-muted uppercase tracking-widest">AS400 Integrated Records</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" />
            <input 
              type="text" 
              placeholder="ค้นหา PO, ไฟล์, ลูกค้า..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-ui-bg border border-ui-border rounded-lg pl-9 pr-3 py-2 text-sm w-72 focus:border-brand-primary outline-none"
            />
          </div>
          <button onClick={loadData} className="p-2 bg-ui-bg border border-ui-border rounded-lg text-ui-muted hover:text-brand-primary transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        
        {/* --- Table H (Header Record) --- */}
        <div className="flex-[3] min-h-0 flex flex-col bg-ui-bg/30 border border-ui-border rounded-lg overflow-hidden shadow-inner">
          <div className="px-4 py-2 border-b border-ui-border bg-ui-card flex justify-between items-center whitespace-nowrap">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleSelectAllHeaders}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedHeaders.length === filteredHeaders.length && filteredHeaders.length > 0 ? "bg-brand-primary border-brand-primary text-white" : "border-ui-border bg-ui-bg"}`}
              >
                {selectedHeaders.length === filteredHeaders.length && filteredHeaders.length > 0 && <Check size={12} />}
              </button>
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-primary">ประวัติการนำเข้า ({filteredHeaders.length}) รายการ</h3>
            </div>
            <span className="text-[10px] font-bold text-ui-muted uppercase">เรียงตามวันที่นำเข้าล่าสุด</span>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[1200px] table-fixed">
              <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-10">
                <tr className="font-medium uppercase text-ui-muted whitespace-nowrap">
                  <th className="px-2 py-2 border-r border-ui-border w-[60px] text-center relative">เลือก</th>
                  <th style={{ width: headerWidths['customerNum'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">ลูกค้า</th>
                  <th style={{ width: headerWidths['fileName'] || 150 }} className="px-4 py-2 border-r border-ui-border relative group">ชื่อไฟล์</th>
                  <th style={{ width: headerWidths['customerPo'] || 150 }} className="px-4 py-2 border-r border-ui-border relative group">เลขที่ใบสั่งซื้อ</th>
                  <th style={{ width: headerWidths['customerName'] || 250 }} className="px-4 py-2 border-r border-ui-border relative group">ชื่อบริษัท</th>
                  <th style={{ width: headerWidths['datePo'] || 100 }} className="px-4 py-2 border-r border-ui-border relative group">วันที่สั่ง</th>
                  <th style={{ width: headerWidths['totalAmount'] || 120 }} className="px-4 py-2 border-r border-ui-border text-right relative group">จำนวนเงินรวม</th>
                  <th style={{ width: headerWidths['importedAt'] || 150 }} className="px-4 py-2 relative group">วันที่นำเข้าจริง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border/10">
                {filteredHeaders.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-20 text-center text-ui-muted italic">ไม่พบข้อมูลในระบบ</td></tr>
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
                        <td className="px-4 py-2 border-r border-ui-border/10 truncate" title={h.fileName ?? undefined}>{h.fileName}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10 text-brand-primary">{h.customerPo}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10 uppercase truncate" title={h.customerName ?? undefined}>{h.customerName}</td>
                        <td className="px-4 py-2 border-r border-ui-border/10">{h.datePo}</td>
                        <td className="px-4 py-1.5 text-right font-medium text-emerald-600 border-r border-ui-border/10">{Number(h.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-2 text-ui-muted">{h.importedAtDisplay || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Table D (Detail Record) --- */}
        <div className="flex-[2] min-h-0 flex flex-col bg-ui-card border border-ui-border rounded-lg overflow-hidden shadow-2xl">
          <div className="px-4 py-1.5 border-b border-ui-border bg-ui-bg/50 flex justify-between items-center whitespace-nowrap">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary">รายละเอียดรายการสินค้าที่นำเข้าแล้ว</h3>
              {(isDetailLoading || isPending) && <Loader2 size={12} className="animate-spin text-brand-primary" />}
            </div>
            <div className="flex gap-2">
              {selectedHeaders.length > 0 && (
                <>
                  <button onClick={handleDeleteRecords} className="flex items-center gap-1.5 px-3 py-1 bg-status-error/10 text-status-error border border-status-error/20 rounded-lg text-[12px] font-black uppercase tracking-widest hover:bg-status-error hover:text-white transition-all">
                    <Trash2 size={14} /> ลบ ({selectedHeaders.length})
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1 bg-brand-primary text-white rounded-lg text-[12px] font-black uppercase tracking-widest shadow-md hover:bg-brand-primary/90 transition-all">
                    <Printer size={14} /> พิมพ์ใบสั่งซื้อ ({selectedHeaders.length})
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar text-xs">
            {selectedHeaders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                <MousePointer2 size={24} className="animate-bounce" />
                <span className="uppercase text-[10px] font-black tracking-widest">เลือกรายการด้านบนเพื่อดูรายละเอียด</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1500px] table-fixed">
                <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-20">
                  <tr className="font-medium uppercase text-ui-muted whitespace-nowrap">
                    <th style={{ width: 60 }} className="px-4 py-2 border-r border-ui-border">ลำดับ</th>
                    <th style={{ width: 250 }} className="px-4 py-2 border-r border-ui-border">รายการ</th>
                    <th style={{ width: 130 }} className="px-4 py-2 border-r border-ui-border font-mono">บาร์โค้ด</th>
                    <th style={{ width: 120 }} className="px-4 py-2 border-r border-ui-border text-center">รหัสผู้ซื้อ</th>
                    <th style={{ width: 80 }} className="px-4 py-2 border-r border-ui-border text-right">จำนวน</th>
                    <th style={{ width: 100 }} className="px-4 py-2 border-r border-ui-border text-right">ราคา</th>
                    <th style={{ width: 120 }} className="px-4 py-2 border-r border-ui-border text-right">จำนวนเงิน</th>
                    <th style={{ width: 130 }} className="px-4 py-2 border-r border-ui-border">บาร์โค้ดใหม่</th>
                    <th style={{ width: 130 }} className="px-4 py-2 border-r border-ui-border">รหัสสินค้าใหม่</th>
                    <th style={{ width: 180 }} className="px-4 py-2">ชื่อสินค้าใหม่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border/10">
                  {detailData.map(d => (
                    <tr key={d.id} className="hover:bg-ui-bg/50 transition-colors whitespace-nowrap text-ui-text font-medium">
                      <td className="px-4 py-1.5">{d.seqNum}</td>
                      <td className="px-4 py-1.5 truncate max-w-[200px]" title={d.productName ?? undefined}>{d.productName}</td>
                      <td className="px-4 py-1.5 text-emerald-600 font-mono">{d.Bar_Code_Item}</td>
                      <td className="px-4 py-1.5 text-center">{d.buyerProdCode || "-"}</td>
                      <td className="px-4 py-1.5 text-right">{Number(d.orderQty || 0).toFixed(2)}</td>
                      <td className="px-4 py-1.5 text-right text-emerald-600">{Number(d.unitPrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-1.5 text-right font-medium text-emerald-600 border-r border-ui-border/10">{Number(d.netAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-1.5 text-brand-primary font-mono">{d.checkBarInt || "-"}</td>
                      <td className="px-4 py-1.5">{d.checkBarInt ? (d.changeItem || "-") : "-"}</td>
                      <td className="px-4 py-1.5 truncate">{d.checkBarInt ? (d.changeProdName || "-") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
