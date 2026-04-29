"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, CheckCircle2, 
  Search, Loader2,
  MousePointer2,
  Printer, 
  Database,
  RefreshCw,
  Clock,
  Edit2,
  Check,
  X,
  Trash2
} from "lucide-react";

import { 
  getImportedAS400Data, 
  upsertToAS400,
  deleteImportedAction,
  getEDLHistoryByHeadersAction,
  getAS400LogsByHistoryIds,
  updateHistoryStatus,
  reTransferHistoryAction
} from "@/app/actions/as400-actions";
import { useToast } from "@/components/ToastProvider";

// --- Types ---
interface EDHData {
  id: number;
  customerPo: string | null;
  customerNum: string | null;
  datePo: string | null;
  dateShip: string | null;
  customerName: string | null;
  shortName: string | null;
  fileName: string | null;
  as400Status: boolean | null;
  buyerName: string | null;
  totalAmount: string | null;
  hType: string | null;
  as400ImportedAt: Date | null;
  createdAt: Date | null;
}

interface AS400Log {
  id: number;
  historyId: number | null;
  status: string | null;
  errorMessage: string | null;
  createdAt: Date | null;
}

interface EDLData {
  id: number;
  customerPo: string | null;
  seqNum: string | null;
  eanNum: string | null;
  productName: string | null;
  qtyOrder: string | null;
  priceUnit: string | null;
  fileName: string | null;
  packSize: string | null;
  buyerProdCode: string | null;
  vendorProdCode: string | null;
  freeQty: string | null;
  discount1: string | null;
  discount2: string | null;
  discount3: string | null;
  totalAmount: string | null; 
}

export function ProcessedData() {
  const { showToast } = useToast();
  const [headerData, setHeaderData] = useState<EDHData[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<EDHData[]>([]);
  const [detailData, setDetailData] = useState<EDLData[]>([]);
  const [logData, setLogData] = useState<AS400Log[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<"items" | "logs">("items");
  
  // Optimization State
  const [isPending, startTransition] = useTransition();
  const [detailCache, setDetailCache] = useState<Record<string, EDLData[]>>({});
  const [logCache, setLogCache] = useState<Record<number, AS400Log[]>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getImportedAS400Data();
      setHeaderData(data as unknown as EDHData[]);
    } catch (error) {
      console.error("Load History Data Error:", error);
      showToast("ไม่สามารถโหลดข้อมูลประวัติได้", "error");
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
      setLogData([]);
      return;
    }

    const syncDetailsAndLogs = async () => {
      // --- Fetch Details from History ---
      const uncachedDetails = selectedHeaders.filter(h => !detailCache[`${h.customerPo}|${h.fileName}`]);
      if (uncachedDetails.length > 0) {
        setIsDetailLoading(true);
        const items = uncachedDetails.map(h => ({ customerPo: h.customerPo ?? "", fileName: h.fileName ?? "" }));
        const newDetails = await getEDLHistoryByHeadersAction(items);
        const newEntries: Record<string, EDLData[]> = {};
        uncachedDetails.forEach(h => {
          newEntries[`${h.customerPo}|${h.fileName}`] = (newDetails as unknown as EDLData[]).filter(d => d.customerPo === h.customerPo && d.fileName === h.fileName);
        });
        setDetailCache(prev => ({ ...prev, ...newEntries }));
      }

      // --- Fetch Logs from History ---
      const uncachedLogs = selectedHeaders.filter(h => !logCache[h.id]);
      if (uncachedLogs.length > 0) {
        setIsLogsLoading(true);
        const historyIds = uncachedLogs.map(h => h.id);
        const newLogs = await getAS400LogsByHistoryIds(historyIds);
        const newLogEntries: Record<number, AS400Log[]> = {};
        uncachedLogs.forEach(h => {
          newLogEntries[h.id] = (newLogs as unknown as AS400Log[]).filter(log => log.historyId === h.id);
        });
        setLogCache(prev => ({ ...prev, ...newLogEntries }));
      }

      setIsDetailLoading(false);
      setIsLogsLoading(false);

      startTransition(() => {
        const allDetailsRaw = selectedHeaders.flatMap(h => detailCache[`${h.customerPo}|${h.fileName}`] || []);
        const allDetails = Array.from(new Map(allDetailsRaw.map(d => [d.id, d])).values());
        setDetailData(allDetails);

        const allLogs = selectedHeaders.flatMap(h => logCache[h.id] || []);
        setLogData([...allLogs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      });
    };

    syncDetailsAndLogs();
  }, [selectedHeaders, detailCache, logCache]);

  const handleSelectHeader = (header: EDHData) => {
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

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const res = await updateHistoryStatus(id, !currentStatus);
    if (res.success) {
      showToast(res.message, "success");
      setEditingId(null);
      loadData();
    } else {
      showToast(res.message, "error");
    }
  };

  const handleReTransfer = async () => {
    if (selectedHeaders.length === 0) return;
    
    setIsTransferring(true);
    let successCount = 0;
    for (const header of selectedHeaders) {
      try {
        const res = await reTransferHistoryAction(header.id);
        if (res.success) successCount++;
      } catch (error) {
        console.error(`Re-transfer Error for history ID ${header.id}:`, error);
      }
    }
    
    setIsTransferring(false);
    showToast(`นำเข้าข้อมูลซ้ำสำเร็จ ${successCount} จาก ${selectedHeaders.length} รายการ`, successCount > 0 ? "success" : "error");
    
    setSelectedHeaders([]);
    setDetailData([]);
    setLogData([]);
    setDetailCache({});
    setLogCache({}); 
    loadData();
  };

  const handleDeleteSelectedHeaders = async () => {
    if (selectedHeaders.length === 0) return;
    if (!confirm(`ยืนยันการลบข้อมูลประวัติ ${selectedHeaders.length} รายการที่เลือก?`)) return;

    setIsLoading(true);
    try {
      const ids = selectedHeaders.map(h => h.id);
      const res = await deleteImportedAction(ids);
      if (res.success) {
        showToast(res.message, "success");
        setSelectedHeaders([]);
        setDetailData([]);
        setLogData([]);
        setDetailCache({});
        setLogCache({});
        loadData();
      } else {
        showToast(res.message, "error");
      }
    } catch (error) {
      console.error("Delete History Error:", error);
      showToast("เกิดข้อผิดพลาดในการลบข้อมูลประวัติ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHeaders = useMemo(() => {
    return headerData.filter(h => 
      h.customerPo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.customerNum?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [headerData, searchQuery]);

  return (
    <div className="bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg min-h-[600px] flex flex-col relative overflow-hidden text-ui-text">
      
      <AnimatePresence>
        {(isLoading || isTransferring) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-ui-card/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-brand-primary mb-2" />
            <h3 className="text-brand-primary font-bold text-sm uppercase tracking-widest">กำลังประมวลผลประวัติ...</h3>
          </motion.div>
        )}
      </AnimatePresence>

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
            <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
              <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-10">
                <tr className="font-bold uppercase text-ui-muted whitespace-nowrap text-[13px]">
                  <th className="px-3 py-2 border-r border-ui-border w-10 text-center">เลือก</th>
                  <th className="px-3 py-2 border-r border-ui-border w-[100px]">ลูกค้า</th>
                  <th className="px-3 py-2 border-r border-ui-border">ชื่อ file</th>
                  <th className="px-3 py-2 border-r border-ui-border">เลขที่ใบสั่งซื้อ</th>
                  <th className="px-3 py-2 border-r border-ui-border w-[120px]">ผู้สั่งซื้อ</th>
                  <th className="px-3 py-2 border-r border-ui-border">ชื่อบริษัท</th>
                  <th className="px-3 py-2 border-r border-ui-border">วันที่สั่ง</th>
                  <th className="px-3 py-2 border-r border-ui-border">วันที่ส่ง</th>
                  <th className="px-3 py-2 border-r border-ui-border text-right">จำนวนเงินรวม</th>
                  <th className="px-3 py-2 border-r border-ui-border">วันที่นำเข้าจริง</th>
                  <th className="px-3 py-2 text-center">สถานะ</th>
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

                              {/* Tooltip นุ่มๆ ที่จะโชว์เมื่อ Hover */}
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

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
              <table className="w-full text-left border-collapse min-w-[1600px]">
                <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-20">
                  <tr className="font-black uppercase text-ui-muted whitespace-nowrap">
                    <th className="px-4 py-2 border-r border-ui-border">ลำดับ</th>
                    <th className="px-4 py-2 border-r border-ui-border">รายการ</th>
                    <th className="px-4 py-2 border-r border-ui-border">ขนาดบรรจุ</th>
                    <th className="px-4 py-2 border-r border-ui-border font-mono">บาร์โค้ด</th>
                    <th className="px-4 py-2 border-r border-ui-border">รหัสผู้ซื้อ</th>
                    <th className="px-4 py-2 border-r border-ui-border">รหัสผู้ผลิต</th>
                    <th className="px-4 py-2 text-right">จำนวน</th>
                    <th className="px-4 py-2 text-right">ราคา</th>
                    <th className="px-4 py-2 text-right">แถม</th>
                    <th className="px-4 py-2 text-right">ส่วนลด(%)</th> 
                    <th className="px-4 py-2 text-right">ส่วนลด</th>
                    <th className="px-4 py-2 text-right font-black text-emerald-600">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border/10">
                  {detailData.length > 0 ? (
                    detailData.map(d => (
                      <tr key={d.id} className="hover:bg-ui-bg/50 transition-colors whitespace-nowrap">
                        <td className="px-4 py-1.5 text-ui-muted">{d.seqNum}</td>
                        <td className="px-4 py-1.5 font-bold truncate max-w-[200px]">{d.productName}</td>
                        <td className="px-4 py-1.5">{d.packSize || "-"}</td>
                        <td className="px-4 py-1.5 font-mono text-emerald-600">{d.eanNum}</td>
                        <td className="px-4 py-1.5">{d.buyerProdCode || "-"}</td>
                        <td className="px-4 py-1.5 font-bold text-brand-primary">{d.vendorProdCode || "-"}</td>
                        <td className="px-4 py-1.5 text-right font-bold">{Number(d.qtyOrder).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right font-bold text-emerald-600">{Number(d.priceUnit).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.freeQty || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount1 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right">{Number(d.discount2 || 0).toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right font-bold">{Number(d.totalAmount || 0).toFixed(2)}</td>
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
