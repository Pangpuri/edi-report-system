"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, CheckCircle2, 
  ArrowRight, Search, RefreshCw, Loader2,
  Database, Layers, MousePointer2,
  Trash2, Globe, ChevronRight, Home, Settings, FileInput, Download,
  FolderOpen, ClipboardCheck, Printer, AlertTriangle
} from "lucide-react";
import { 
  processImportAS400, 
  getEDHData, 
  getEDLByHeadersAction,
  getBranchesAction,
  getStagingFilesAction,
  deleteAS400FileAction,
  getRawFileArchivesAction,
  deleteRawArchiveAction,
  clearTempTablesAction
} from "@/app/actions/as400-import";
import { upsertToAS400, deleteImportedAction } from "@/app/actions/as400-actions";
import { useSession } from "@/lib/auth-client";
import { SessionUser } from "@/app/edi";
import { useToast } from "@/components/ToastProvider";

// --- Types ---
interface Branch {
  id: number;
  branchName: string;
  branchCode: string;
  sourcePath: string | null;
  ipAddress?: string | null;
  username?: string | null;
  password?: string | null;
}

interface StagingFile {
  name: string;
  size: number;
  mtime: Date;
}

interface EDHData {
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
  as400Status: boolean | null;
  as400ImportedAt: Date | null;
  createdAt: Date | null;
}

interface EDLData {
  id: number;
  dType: string | null;
  customerPo: string | null;
  customerNum: string | null;
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
  checkBarInt: string | null;
  checkNameOldProd: string | null;
  changeItem: string | null;
  changeProdName: string | null;
}

interface RawArchive {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number | null;
  uploadedAt: Date | null;
  storagePath: string;
}

type TabType = "import" | "staging" | "data_view" | "archives";

export function ImportAS400() {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const isAdminOrStaff = useMemo(() => {
    const user = session?.user as SessionUser | undefined;
    const role = user?.role?.toLowerCase();
    return role === "admin" || role === "staff";
  }, [session]);

  const isAdmin = useMemo(() => {
    const user = session?.user as SessionUser | undefined;
    return user?.role?.toLowerCase() === "admin";
  }, [session]);

  const [activeTab, setActiveTab] = useState<TabType>("import");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [stagingFiles, setStagingFiles] = useState<StagingFile[]>([]);
  const [rawArchives, setRawArchives] = useState<RawArchive[]>([]);
  const [archiveSearch, setArchiveSearch] = useState("");
  
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStaging, setSelectedStaging] = useState<string[]>([]);
  const [selectedArchives, setSelectedArchives] = useState<number[]>([]);
  const [stagingDeleteTarget, setStagingDeleteTarget] = useState<{
    type: "single" | "multiple";
    fileName?: string;
  } | null>(null);

  // Optimization State
  const [isPending, startTransition] = useTransition();
  const [detailCache, setDetailCache] = useState<Record<string, EDLData[]>>({});

  // Table Column Widths (State for Resizable Columns)
  const [headerWidths, setHeaderWidths] = useState<Record<string, number>>({});
  const [detailWidths, setDetailWidths] = useState<Record<string, number>>({});

  const handleResize = (table: 'header' | 'detail', column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.pageX;
    const startWidth = table === 'header' 
      ? (headerWidths[column] || 150) 
      : (detailWidths[column] || 150);

    // ปรับปรุง: ใช้ overlay โปร่งใสเต็มหน้าจอขณะลาก เพื่อให้การลื่นไหลไม่หลุดแม้เมาส์จะเลื่อนเร็ว
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

  // Master-Detail State
  const [headerData, setHeaderData] = useState<EDHData[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<EDHData[]>([]);
  const [detailData, setDetailData] = useState<EDLData[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Load Initial Data
  const initData = useCallback(async () => {
    const hData = await getEDHData();
    setHeaderData(hData as unknown as EDHData[]);

    const sData = await getStagingFilesAction();
    setStagingFiles(sData as StagingFile[]);

    const aData = await getRawFileArchivesAction();
    setRawArchives(aData as RawArchive[]);
  }, []);

  useEffect(() => {
    initData();
  }, [initData]);

  const processUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    setIsImporting(true);
    try {
      const { uploadAS400FilesAction } = await import("@/app/actions/as400-import");
      await uploadAS400FilesAction(formData);
      const sData = await getStagingFilesAction();
      setStagingFiles(sData as StagingFile[]);
      setActiveTab("staging"); 
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Upload Error:", err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processUpload(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processUpload(e.dataTransfer.files);
  };

  const handleProcessFile = async (fileName: string) => {
    setIsImporting(true);
    try {
      const res = await processImportAS400(fileName);
      if (res.success) {
        initData();
        return true;
      } else {
        showToast(res.message, "error");
        return false;
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Process File Error:", err.message);
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  const fetchMultipleDetails = async (headers: EDHData[]) => {
    if (headers.length === 0) {
      setDetailData([]);
      return;
    }

    // Identify which headers are NOT in cache
    const uncached = headers.filter(h => !detailCache[`${h.customerPo}|${h.fileName}`]);

    if (uncached.length > 0) {
      setIsDetailLoading(true);
      try {
        const items = uncached.map(h => ({ customerPo: h.customerPo ?? "", fileName: h.fileName ?? "" }));
        const newDetails = await getEDLByHeadersAction(items);
        
        // Update cache
        const newCacheEntries: Record<string, EDLData[]> = {};
        uncached.forEach(h => {
          newCacheEntries[`${h.customerPo}|${h.fileName}`] = (newDetails as unknown as EDLData[]).filter(
            d => d.customerPo === h.customerPo && d.fileName === h.fileName
          );
        });

        const updatedCache = { ...detailCache, ...newCacheEntries };
        setDetailCache(updatedCache);

        // Combine from updated cache and deduplicate by id to prevent key errors
        const allDetailsRaw = headers.flatMap(h => updatedCache[`${h.customerPo}|${h.fileName}`] || []);
        const allDetails = Array.from(new Map(allDetailsRaw.map(d => [d.id, d])).values());
        
        startTransition(() => {
          setDetailData(allDetails);
        });
      } catch (error: unknown) {
        console.error("Fetch Details Error:", error);
      } finally {
        setIsDetailLoading(false);
      }
    } else {
      // All in cache - Combine and deduplicate
      const allDetailsRaw = headers.flatMap(h => detailCache[`${h.customerPo}|${h.fileName}`] || []);
      const allDetails = Array.from(new Map(allDetailsRaw.map(d => [d.id, d])).values());
      
      startTransition(() => {
        setDetailData(allDetails);
      });
    }
  };

  const handleProcessSelected = async () => {
    if (selectedStaging.length === 0) {
      showToast("กรุณาเลือกไฟล์ที่ต้องการนำเข้า", "error");
      return;
    }
    if (!confirm(`ยืนยันการกรองรหัสและนำเข้าข้อมูล ${selectedStaging.length} ไฟล์ที่เลือก?`)) return;
    
    setIsImporting(true);
    
    // 1. ล้างตารางชั่วคราวก่อนเริ่มนำเข้าชุดใหม่ เพื่อให้ข้อมูลไม่ปนกับของเก่า
    await clearTempTablesAction();

    let successCount = 0;
    const processedFiles: string[] = [];
    for (const fileName of selectedStaging) {
      // 2. นำเข้าทีละไฟล์โดยส่ง shouldClear = false เพื่อให้ข้อมูล append ต่อกัน
      const res = await processImportAS400(fileName, undefined, false);
      if (res.success) {
        successCount++;
        processedFiles.push(fileName);
      }
    }

    // รีเฟรชข้อมูลทั้งหมด
    await initData();

    setIsImporting(false);
    showToast(`นำเข้าสำเร็จ ${successCount} จาก ${selectedStaging.length} ไฟล์ (กรองรหัส ISP เรียบร้อย)`, "success");
    setSelectedStaging([]);

    // Auto-select processed files in data_view
    const updatedHData = await getEDHData() as unknown as EDHData[];
    setHeaderData(updatedHData);
    const newlyImported = updatedHData.filter(h => processedFiles.includes(h.fileName ?? ""));
    setSelectedHeaders(newlyImported);
    if (newlyImported.length > 0) {
      fetchMultipleDetails(newlyImported);
    }
    
    setActiveTab("data_view");
  };

  const executeDeleteSelected = async () => {
    if (selectedStaging.length === 0) return;

    setStagingDeleteTarget(null);
    setIsImporting(true);
    let successCount = 0;
    for (const fileName of selectedStaging) {
      const res = await deleteAS400FileAction(fileName);
      if (res.success) successCount++;
    }
    setIsImporting(false);
    showToast(`ลบสำเร็จ ${successCount} จาก ${selectedStaging.length} ไฟล์`, "success");
    setSelectedStaging([]);
    initData();
  };

  const toggleSelectStaging = (fileName: string) => {
    setSelectedStaging(prev => 
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  };

  const executeDeleteFile = async (fileName: string) => {
    const res = await deleteAS400FileAction(fileName);
    if (res.success) {
      setSelectedStaging(prev => prev.filter(f => f !== fileName));
      initData();
    }
    setStagingDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!stagingDeleteTarget) return;
    if (stagingDeleteTarget.type === "multiple") {
      await executeDeleteSelected();
    } else if (stagingDeleteTarget.fileName) {
      await executeDeleteFile(stagingDeleteTarget.fileName);
    }
  };

  const toggleSelectAllStaging = () => {
    if (selectedStaging.length === stagingFiles.length) {
      setSelectedStaging([]);
    } else {
      setSelectedStaging(stagingFiles.map(f => f.name));
    }
  };

  const handleDeleteArchive = async (id: number, name: string) => {
    if (!confirm(`ยืนยันการลบไฟล์สำรอง ${name} ออกจากระบบถาวร?`)) return;
    setIsImporting(true);
    try {
      const res = await deleteRawArchiveAction(id);
      showToast(res.message, "success");
      initData();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Delete Archive Error:", err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelectArchive = (id: number) => {
    setSelectedArchives(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleSelectAllArchives = (visibleArchives: RawArchive[]) => {
    if (selectedArchives.length === visibleArchives.length && visibleArchives.length > 0) {
      setSelectedArchives([]);
    } else {
      setSelectedArchives(visibleArchives.map(a => a.id));
    }
  };

  const handleDeleteSelectedArchives = async () => {
    if (selectedArchives.length === 0) return;
    if (!confirm(`ยืนยันการลบไฟล์สำรองที่เลือกจำนวน ${selectedArchives.length} รายการออกจากระบบถาวร?`)) return;

    setIsImporting(true);
    let successCount = 0;
    try {
      for (const id of selectedArchives) {
        const res = await deleteRawArchiveAction(id);
        if (res.success) successCount++;
      }
      showToast(`ลบประวัติไฟล์ดิบสำเร็จ ${successCount} รายการ`, "success");
      setSelectedArchives([]);
      initData();
    } catch (error) {
      console.error("Delete Bulk Archives Error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectHeader = (header: EDHData) => {
    const isSelected = selectedHeaders.some(h => h.id === header.id);
    const next = isSelected 
      ? selectedHeaders.filter(h => h.id !== header.id) 
      : [...selectedHeaders, header];
    
    setSelectedHeaders(next);
    fetchMultipleDetails(next);
  };

  const toggleSelectAllHeaders = () => {
    if (selectedHeaders.length === headerData.length && headerData.length > 0) {
      setSelectedHeaders([]);
      setDetailData([]);
    } else {
      setSelectedHeaders(headerData);
      fetchMultipleDetails(headerData);
    }
  };

  const handleTransferToAS400 = async () => {
    if (selectedHeaders.length === 0) {
      showToast("กรุณาเลือกรายการใบสั่งซื้อที่ต้องการโอน", "error");
      return;
    }
    
    setIsTransferring(true);
    let successCount = 0;
    for (const header of selectedHeaders) {
      try {
        const res = await upsertToAS400(header.id);
        if (res.success) successCount++;
      } catch (error) {
        console.error(`Transfer Error for PO ${header.customerPo}:`, error);
      }
    }
    
    setIsTransferring(false);
    showToast(`โอนข้อมูลสำเร็จ ${successCount} จาก ${selectedHeaders.length} รายการ (ข้อมูลที่โอนแล้วถูกล้างออกจากระบบ)`, successCount > 0 ? "success" : "error");
    
    // Clear selection and details because the items are deleted from backend
    setSelectedHeaders([]);
    setDetailData([]);
    setDetailCache({}); // Clear cache to stay in sync
    
    await initData();
  };

  const handlePrintPO = () => {
    if (selectedHeaders.length === 0) return;
    showToast(`กำลังเตรียมฟอร์ม PO สำหรับพิมพ์ ${selectedHeaders.length} รายการ...`, "success");
  };

  return (
    <div className="bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg min-h-[600px] flex flex-col relative overflow-hidden text-ui-text">
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {(isImporting || isSavingConfig || isTransferring) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-ui-card/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-brand-primary mb-2" />
            <h3 className="text-brand-primary font-black text-xs uppercase tracking-widest">
              {isTransferring ? "Transferring to AS/400..." : isImporting ? "Filtering & Importing..." : "Configuring..."}
            </h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary border border-brand-primary/20">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-brand-primary uppercase tracking-tight">EDI NATIONWIDE CENTER</h2>
            <p className="text-[8px] text-ui-muted font-bold uppercase tracking-widest">Staging & ISP Filter</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-ui-bg p-1 rounded-lg border border-ui-border">
          {(["import", "staging", "data_view", "archives"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? "bg-brand-primary text-white shadow-md" : "text-ui-muted hover:text-ui-text"
              }`}
            >
              {tab === "data_view" ? "ข้อมูลที่เข้าระบบแล้ว" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "staging" && ` (${stagingFiles.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          
          {/* TAB: UPLOAD */}
          {activeTab === "import" && (
            <motion.div key="import" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center relative overflow-hidden group ${isDragging ? "border-brand-primary bg-brand-primary/5" : "border-ui-border bg-ui-bg/30"}`}
              >
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} accept=".txt,.TAB,.tab" />
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${isDragging ? "bg-brand-primary text-white scale-110" : "bg-brand-primary/10 text-brand-primary"}`}>
                  <FileInput size={24} />
                </div>
                <h3 className="text-lg font-black text-ui-text uppercase tracking-widest mb-1">Drag & Drop Files</h3>
                <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Or Click to Browse (TXT, TAB)</p>
              </div>
            </motion.div>
          )}

          {/* TAB: STAGING */}
          {activeTab === "staging" && (
            <motion.div key="staging" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleSelectAllStaging}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${selectedStaging.length === stagingFiles.length && stagingFiles.length > 0 ? "bg-brand-primary border-brand-primary text-white" : "border-ui-border bg-ui-bg"}`}
                  >
                    {selectedStaging.length === stagingFiles.length && stagingFiles.length > 0 && <CheckCircle2 size={14} />}
                  </button>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary">Staging Area</h3>
                    <p className="text-[8px] font-bold text-ui-muted uppercase">{selectedStaging.length} Selected</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedStaging.length > 0 && isAdmin && (
                    <button 
                      onClick={() => setStagingDeleteTarget({ type: "multiple" })}
                      className="px-3 py-1.5 bg-status-error/10 text-status-error border border-status-error/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-status-error hover:text-white transition-all"
                    >
                      Delete Selected
                    </button>
                  )}
                  <button 
                    onClick={handleProcessSelected} 
                    disabled={selectedStaging.length === 0}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md transition-all ${selectedStaging.length > 0 ? "bg-brand-primary text-white hover:scale-105" : "bg-ui-border text-ui-muted cursor-not-allowed"}`}
                  >
                    Filter & Import
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {stagingFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full border border-ui-border rounded-xl bg-ui-bg/30 opacity-50">
                    <p className="text-[10px] font-black uppercase tracking-widest">No files found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stagingFiles.map(file => {
                      const isSelected = selectedStaging.includes(file.name);
                      return (
                        <div 
                          key={file.name} 
                          onClick={() => toggleSelectStaging(file.name)}
                          className={`flex items-center gap-3 p-3 border rounded-lg transition-all cursor-pointer ${isSelected ? "bg-brand-primary/5 border-brand-primary" : "bg-ui-card border-ui-border hover:border-brand-primary/30"}`}
                        >
                          <div className={`p-2 rounded-md ${isSelected ? "bg-brand-primary text-white" : "bg-brand-primary/5 text-brand-primary"}`}>
                            <FileText size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{file.name}</p>
                            <p className="text-[10px] text-ui-muted uppercase">{(file.size/1024).toFixed(1)} KB</p>
                          </div>
                          {isAdmin && (
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStagingDeleteTarget({ type: "single", fileName: file.name });
                                }}
                                className="p-2 text-ui-muted hover:text-status-error hover:bg-status-error/10 rounded-xl transition-all"
                                title="ลบไฟล์นี้"
                              >
                                <Trash2 size={18} />
                              </button>
                          )}
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20" : "border-ui-border bg-ui-bg group-hover:border-brand-primary/50"}`}>
                              {isSelected && <CheckCircle2 size={18} />}
                            </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: HISTORY (Master-Detail View) */}
          {activeTab === "data_view" && (
            <motion.div key="data_view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col gap-4 min-h-0">
               
               {/* --- Toolbar Area --- */}
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-ui-bg/50 p-3 rounded-lg border border-ui-border">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-status-error">
                       <AlertTriangle size={14} />
                       <span className="text-xs font-bold uppercase">มีข้อมูลไม่สมบูรณ์ หรือมีปัญหา: 0 รายการ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleTransferToAS400}
                      disabled={selectedHeaders.length === 0 || isTransferring}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedHeaders.length > 0 ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700" : "bg-ui-border text-ui-muted cursor-not-allowed"}`}
                    >
                      <ClipboardCheck size={14} /> โอนข้อมูลเข้า AS/400 ({selectedHeaders.length})
                    </button>
                    <button 
                      onClick={handlePrintPO}
                      disabled={selectedHeaders.length === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedHeaders.length > 0 ? "bg-brand-primary text-white shadow-md hover:brightness-110" : "bg-ui-border text-ui-muted cursor-not-allowed"}`}
                    >
                      <Printer size={14} /> Print ({selectedHeaders.length})
                    </button>
                  </div>
               </div>

               {/* 🟢 TOP TABLE: MASTER (Header) */}
               <div className="flex-[3] min-h-0 flex flex-col bg-ui-bg/30 border border-ui-border rounded-lg overflow-hidden shadow-inner">
                  <div className="px-4 py-2 border-b border-ui-border bg-ui-card flex justify-between items-center whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={toggleSelectAllHeaders}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedHeaders.length === headerData.length && headerData.length > 0 ? "bg-brand-primary border-brand-primary text-white" : "border-ui-border bg-ui-bg"}`}
                      >
                        {selectedHeaders.length === headerData.length && headerData.length > 0 && <CheckCircle2 size={12} />}
                      </button>
                      <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary">ข้อมูลที่เข้าระบบแล้ว (Master)</h3>
                    </div>
                    <span className="text-[10px] font-bold text-ui-muted uppercase">{headerData.length} รายการ (เลือกแล้ว {selectedHeaders.length})</span>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse min-w-[1200px] table-fixed">
                      <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-10">
                        <tr className="font-black uppercase text-ui-muted whitespace-nowrap">
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ui-border/10">
                        {headerData.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-4 py-20 text-center text-ui-muted italic">
                              ไม่พบข้อมูลใบสั่งซื้อที่รอการประมวลผล กรุณานำเข้าไฟล์และกด Filter & Import 📥
                            </td>
                          </tr>
                        ) : headerData.map(h => {
                          const isSelected = selectedHeaders.some(sh => sh.id === h.id);
                          return (
                            <tr 
                              key={h.id} 
                              onClick={() => handleSelectHeader(h)} 
                              className={`cursor-pointer transition-all border-l-2 whitespace-nowrap ${isSelected ? "bg-brand-primary/10 border-l-brand-primary font-bold" : "hover:bg-brand-primary/5 border-l-transparent"}`}
                            >
                              <td className="px-4 py-2 border-r border-ui-border/10 text-center">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center mx-auto transition-all ${isSelected ? "bg-brand-primary border-brand-primary text-white shadow-md" : "border-ui-border bg-ui-bg"}`}>
                                  {isSelected && <CheckCircle2 size={10} />}
                                </div>
                              </td>
                              <td className="px-4 py-2 border-r border-ui-border/10 font-bold">{h.shortName || h.customerNum}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 truncate max-w-[120px]" title={h.fileName ?? ""}>{h.fileName}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 font-bold text-brand-primary">{h.customerPo}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 font-bold">{h.buyerName || h.customerNum}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 uppercase truncate max-w-[150px]" title={h.customerName ?? ""}>{h.customerName}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 font-mono">{h.datePo}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 font-mono">{h.dateShip}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 text-right font-bold text-brand-secondary">{Number(h.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="px-4 py-2 border-r border-ui-border/10 text-ui-muted">
                                {h.createdAt ? new Date(h.createdAt).toLocaleDateString('th-TH') : "-"}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {h.as400Status ? (
                                  <span className="text-[11px] font-black text-red-600 uppercase">เข้า AS/400 แล้ว</span>
                                ) : (
                                  <span className="text-[11px] font-bold text-ui-muted uppercase opacity-50">รอนำเข้า</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>

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
                          <tr className="font-black uppercase text-ui-muted whitespace-nowrap">
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
                            
                            <th style={{ width: detailWidths['eanNum'] || 130 }} className="px-4 py-2 border-r border-ui-border font-mono relative group">
                              บาร์โค้ด
                              <div onMouseDown={(e) => handleResize('detail', 'eanNum', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                            </th>
                            
                            <th style={{ width: detailWidths['buyerProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                              รหัสผู้ซื้อ
                              <div onMouseDown={(e) => handleResize('detail', 'buyerProdCode', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                            </th>
                            
                            <th style={{ width: detailWidths['vendorProdCode'] || 120 }} className="px-4 py-2 border-r border-ui-border relative group">
                              รหัสผู้ผลิต
                              <div onMouseDown={(e) => handleResize('detail', 'vendorProdCode', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                            </th>
                            
                            <th style={{ width: detailWidths['qtyOrder'] || 80 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                              จำนวน
                              <div onMouseDown={(e) => handleResize('detail', 'qtyOrder', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
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
                            
                            <th style={{ width: detailWidths['totalAmount'] || 120 }} className="px-4 py-2 border-r border-ui-border text-right relative group">
                              จำนวนเงิน
                              <div onMouseDown={(e) => handleResize('detail', 'totalAmount', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                            </th>
                            
                            <th style={{ width: detailWidths['fileName'] || 120 }} className="px-4 py-2 text-right relative group">
                              จากไฟล์
                              <div onMouseDown={(e) => handleResize('detail', 'fileName', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/50 transition-colors" />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ui-border/10">
                          {detailData.map(d => (
                            <tr key={d.id} className="hover:bg-ui-bg/50 transition-colors whitespace-nowrap">
                              <td className="px-4 py-1.5 text-ui-muted">{d.seqNum}</td>
                              <td className="px-4 py-1.5 font-bold truncate max-w-[200px]" title={d.productName ?? ""}>{d.productName}</td>
                              <td className="px-4 py-1.5 text-ui-muted">{d.packSize || "-"}</td>
                              <td className="px-4 py-1.5 font-mono text-brand-secondary">{d.eanNum}</td>
                              <td className="px-4 py-1.5">{d.buyerProdCode || "-"}</td>
                              <td className="px-4 py-1.5 font-bold text-brand-primary">{d.vendorProdCode || "-"}</td>
                              <td className="px-4 py-1.5 text-right font-bold">{Number(d.qtyOrder).toFixed(2)}</td>
                              <td className="px-4 py-1.5 text-right font-bold text-emerald-600">{Number(d.priceUnit).toFixed(2)}</td>
                              <td className="px-4 py-1.5 text-right">{Number(d.freeQty || 0).toFixed(2)}</td>
                              <td className="px-4 py-1.5 text-right">{Number(d.discount1 || 0).toFixed(2)}</td>
                              <td className="px-4 py-1.5 text-right">{Number(d.discount2 || 0).toFixed(2)}</td>
                              <td className="px-4 py-1.5 text-right font-bold">{Number(d.totalAmount || 0).toFixed(2)}</td>
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
          ) }

          {/* TAB: ARCHIVES */}
          {activeTab === "archives" && (
            <motion.div key="archives" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black uppercase text-brand-primary">Archives</h3>
                  {selectedArchives.length > 0 && isAdmin && (
                    <button 
                      onClick={handleDeleteSelectedArchives}
                      className="px-3 py-1 bg-status-error/10 text-status-error border border-status-error/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-status-error hover:text-white transition-all"
                    >
                      Delete Selected ({selectedArchives.length})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" />
                  <input type="text" placeholder="Search..." value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} className="bg-ui-bg border border-ui-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-brand-primary outline-none" />
                </div>
              </div>
              <div className="flex-1 bg-ui-bg/30 border border-ui-border rounded-xl overflow-hidden flex flex-col shadow-inner">
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-ui-card z-10 border-b border-ui-border">
                      <tr className="uppercase text-ui-muted">
                        <th className="px-4 py-2 w-10 text-center">
                          <button 
                            onClick={() => toggleSelectAllArchives(rawArchives.filter(a => a.originalName.toLowerCase().includes(archiveSearch.toLowerCase())))}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedArchives.length > 0 && selectedArchives.length === rawArchives.filter(a => a.originalName.toLowerCase().includes(archiveSearch.toLowerCase())).length ? "bg-brand-primary border-brand-primary text-white" : "border-ui-border bg-ui-bg"}`}
                          >
                            {selectedArchives.length > 0 && <CheckCircle2 size={10} />}
                          </button>
                        </th>
                        <th className="px-4 py-2">Filename</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Size</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border/10">
                      {rawArchives.filter(a => a.originalName.toLowerCase().includes(archiveSearch.toLowerCase())).map(archive => {
                        const isSelected = selectedArchives.includes(archive.id);
                        return (
                          <tr 
                            key={archive.id} 
                            onClick={() => toggleSelectArchive(archive.id)}
                            className={`hover:bg-brand-primary/5 transition-colors cursor-pointer ${isSelected ? "bg-brand-primary/5" : ""}`}
                          >
                            <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div 
                                onClick={() => toggleSelectArchive(archive.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center mx-auto transition-all ${isSelected ? "bg-brand-primary border-brand-primary text-white shadow-md" : "border-ui-border bg-ui-bg"}`}
                              >
                                {isSelected && <CheckCircle2 size={10} />}
                              </div>
                            </td>
                            <td className="px-4 py-2 font-bold">{archive.originalName}</td>
                            <td className="px-4 py-2 text-ui-muted">{archive.uploadedAt ? new Date(archive.uploadedAt).toLocaleDateString() : "-"}</td>
                            <td className="px-4 py-2">{(archive.fileSize ? archive.fileSize / 1024 : 0).toFixed(1)} KB</td>
                            <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-1.5">
                                <a href={`/api/archive/download?id=${archive.id}`} target="_blank" rel="noopener noreferrer" className="p-1 text-brand-primary hover:bg-brand-primary/10 rounded transition-all"><Download size={14} /></a>
                                {isAdmin && <button onClick={() => handleDeleteArchive(archive.id, archive.originalName)} className="p-1 text-status-error hover:bg-status-error/10 rounded transition-all"><Trash2 size={14} /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🗑️ Compact Delete Popup */}
      <AnimatePresence>
        {stagingDeleteTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ui-bg/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-ui-card border border-ui-border p-6 rounded-xl max-w-sm w-full shadow-2xl">
              <h3 className="text-sm font-black text-ui-text mb-2 uppercase tracking-widest">Confirm Delete?</h3>
              <p className="text-ui-muted text-[10px] mb-6 uppercase">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setStagingDeleteTarget(null)} className="flex-1 py-2 text-[10px] font-black uppercase text-ui-muted hover:bg-ui-bg rounded-lg transition-all">Cancel</button>
                <button onClick={handleConfirmDelete} className="flex-1 bg-status-error px-4 py-2 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:brightness-110 transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
