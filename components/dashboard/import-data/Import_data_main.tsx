"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";
import { 
  getEDHData, 
  getEDLByHeadersAction,
  getStagingFilesAction,
  deleteAS400FileAction,
  getRawFileArchivesAction,
  deleteRawArchiveAction,
  clearTempTablesAction,
  processImportAS400
} from "@/app/actions/edi/import-actions";
import { upsertToAS400, deleteSelectedTempAction } from "@/app/actions/edi/as400-actions";
import { useSession } from "@/lib/auth-client";
import { SessionUser } from "@/app/edi";
import { useToast } from "@/components/ToastProvider";

// Import types
import { 
  StagingFile, EDHData, EDLData, RawArchive, TabType, StagingDeleteTarget 
} from "./types";

// Import sub-components
import { ImportTab } from "./(tabs)/ImportTab";
import { StagingTab } from "./(tabs)/StagingTab";
import { DataViewTab } from "./(tabs)/DataViewTab";
import { ArchivesTab } from "./(tabs)/ArchivesTab";
import { LoadingOverlay } from "./(shared)/LoadingOverlay";
import { DeleteConfirmModal } from "./(shared)/DeleteConfirmModal";

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

  // --- States ---
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("import_active_tab");
      if (saved && ["import", "staging", "data_view", "archives"].includes(saved)) {
        return saved as TabType;
      }
    }
    return "import";
  });

  const [stagingFiles, setStagingFiles] = useState<StagingFile[]>([]);
  const [rawArchives, setRawArchives] = useState<RawArchive[]>([]);
  const [archiveSearch, setArchiveSearch] = useState("");
  
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStaging, setSelectedStaging] = useState<string[]>([]);
  const [selectedArchives, setSelectedArchives] = useState<number[]>([]);
  const [stagingDeleteTarget, setStagingDeleteTarget] = useState<StagingDeleteTarget | null>(null);

  const [isPending, startTransition] = useTransition();
  const [detailCache, setDetailCache] = useState<Record<string, EDLData[]>>({});

  const [headerWidths, setHeaderWidths] = useState<Record<string, number>>({});
  const [detailWidths, setDetailWidths] = useState<Record<string, number>>({});

  const [headerData, setHeaderData] = useState<EDHData[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<EDHData[]>([]);
  const [detailData, setDetailData] = useState<EDLData[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem("import_active_tab", activeTab);
  }, [activeTab]);

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

  // --- Handlers ---

  const handleResize = (table: 'header' | 'detail', column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.pageX;
    const startWidth = table === 'header' 
      ? (headerWidths[column] || 150) 
      : (detailWidths[column] || 150);

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

  const processUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_SIZE) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    }

    if (oversizedFiles.length > 0) {
      showToast(`ไฟล์มีขนาดใหญ่เกิน 10MB: ${oversizedFiles.join(", ")}`, "error");
    }

    if (validFiles.length === 0) return;

    const formData = new FormData();
    validFiles.forEach((file) => formData.append("files", file));

    setIsImporting(true);
    try {
      const { uploadAS400FilesAction } = await import("@/app/actions/edi/import-actions");
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

  const fetchMultipleDetails = async (headers: EDHData[]) => {
    if (headers.length === 0) {
      setDetailData([]);
      return;
    }

    const uncached = headers.filter(h => !detailCache[`${h.customerPo}|${h.fileName}`]);

    if (uncached.length > 0) {
      setIsDetailLoading(true);
      try {
        const items = uncached.map(h => ({ customerPo: h.customerPo ?? "", fileName: h.fileName ?? "" }));
        const newDetails = await getEDLByHeadersAction(items);
        
        const newCacheEntries: Record<string, EDLData[]> = {};
        uncached.forEach(h => {
          newCacheEntries[`${h.customerPo}|${h.fileName}`] = (newDetails as unknown as EDLData[]).filter(
            d => d.customerPo === h.customerPo && d.fileName === h.fileName
          );
        });

        const updatedCache = { ...detailCache, ...newCacheEntries };
        setDetailCache(updatedCache);

        const allDetailsRaw = headers.flatMap(h => updatedCache[`${h.customerPo}|${h.fileName}`] || []);
        const allDetails = Array.from(new Map(allDetailsRaw.map(d => [d.id, d])).values())
          .sort((a, b) => 
            (a.seqNum ?? "").localeCompare(b.seqNum ?? "", undefined, { numeric: true, sensitivity: 'base' })
          );
        
        startTransition(() => {
          setDetailData(allDetails);
        });
      } catch (error: unknown) {
        console.error("Fetch Details Error:", error);
      } finally {
        setIsDetailLoading(false);
      }
    } else {
      const allDetailsRaw = headers.flatMap(h => detailCache[`${h.customerPo}|${h.fileName}`] || []);
      const allDetails = Array.from(new Map(allDetailsRaw.map(d => [d.id, d])).values())
        .sort((a, b) => 
          (a.seqNum ?? "").localeCompare(b.seqNum ?? "", undefined, { numeric: true, sensitivity: 'base' })
        );
      
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
    await clearTempTablesAction();

    let successCount = 0;
    const processedFiles: string[] = [];
    for (const fileName of selectedStaging) {
      const res = await processImportAS400(fileName, undefined, false);
      if (res.success) {
        successCount++;
        processedFiles.push(fileName);
      }
    }

    await initData();
    setIsImporting(false);
    showToast(`นำเข้าสำเร็จ ${successCount} จาก ${selectedStaging.length} ไฟล์ (กรองรหัส ISP เรียบร้อย)`, "success");
    setSelectedStaging([]);

    const updatedHData = await getEDHData() as unknown as EDHData[];
    setHeaderData(updatedHData);
    const newlyImported = updatedHData.filter(h => processedFiles.includes(h.fileName ?? ""));
    setSelectedHeaders(newlyImported);
    if (newlyImported.length > 0) {
      fetchMultipleDetails(newlyImported);
    }
    
    setActiveTab("data_view");
  };

  const executeDeleteSelectedStaging = async () => {
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

  const executeDeleteStagingFile = async (fileName: string) => {
    const res = await deleteAS400FileAction(fileName);
    if (res.success) {
      setSelectedStaging(prev => prev.filter(f => f !== fileName));
      initData();
    }
    setStagingDeleteTarget(null);
  };

  const handleConfirmStagingDelete = async () => {
    if (!stagingDeleteTarget) return;
    if (stagingDeleteTarget.type === "multiple") {
      await executeDeleteSelectedStaging();
    } else if (stagingDeleteTarget.fileName) {
      await executeDeleteStagingFile(stagingDeleteTarget.fileName);
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
    if (!confirm(`ยืนยันการลบไฟล์สำรอง ${name} ออกจากระบบ?`)) return;
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
    if (!confirm(`ยืนยันการลบไฟล์สำรองที่เลือกจำนวน ${selectedArchives.length} รายการออกจากระบบ?`)) return;

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

  const handleDownloadSelectedArchives = async () => {
    if (selectedArchives.length === 0) return;
    
    showToast(`กำลังเตรียมดาวน์โหลด ${selectedArchives.length} รายการ...`, "success");
    
    for (const id of selectedArchives) {
      const link = document.createElement('a');
      link.href = `/api/archive/download?id=${id}`;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 300));
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
    
    setSelectedHeaders([]);
    setDetailData([]);
    setDetailCache({});
    
    await initData();
  };

  const handleDeleteTemp = async () => {
    if (selectedHeaders.length === 0) {
      showToast("กรุณาเลือกรายการที่ต้องการลบ", "error");
      return;
    }

    if (!confirm(`ยืนยันการลบข้อมูลชั่วคราว ${selectedHeaders.length} รายการที่เลือก? (ข้อมูลนี้จะไม่ถูกนำเข้าสู่ระบบ)`)) return;

    setIsTransferring(true);
    try {
      const ids = selectedHeaders.map(h => h.id);
      const res = await deleteSelectedTempAction(ids);
      if (res.success) {
        showToast(res.message, "success");
        setSelectedHeaders([]);
        setDetailData([]);
        setDetailCache({});
        await initData();
      } else {
        showToast(res.message, "error");
      }
    } catch (error) {
      console.error("Delete Temp Error:", error);
      showToast("เกิดข้อผิดพลาดในการลบข้อมูล", "error");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="bg-ui-card p-4 md:p-6 rounded-xl border border-ui-border shadow-lg min-h-[600px] flex flex-col relative overflow-hidden text-ui-text">
      
      <LoadingOverlay 
        isVisible={isImporting || isSavingConfig || isTransferring} 
        message={isTransferring ? "Processing..." : isImporting ? "Filtering & Importing..." : "Configuring..."}
      />

      {/* ส่วนหัวของหน้าจอ */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary border border-brand-primary/20">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-brand-primary uppercase tracking-tight">ระบบนำเข้า และจัดการไฟล์ EDI</h2>
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
              {tab === "data_view" ? "ข้อมูลเตรียมนำเข้าระบบ" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "staging" && ` (${stagingFiles.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "import" && (
            <ImportTab 
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              handleDrop={handleDrop}
              handleFileUpload={handleFileUpload}
            />
          )}

          {activeTab === "staging" && (
            <StagingTab 
              stagingFiles={stagingFiles}
              selectedStaging={selectedStaging}
              toggleSelectStaging={toggleSelectStaging}
              toggleSelectAllStaging={toggleSelectAllStaging}
              setStagingDeleteTarget={setStagingDeleteTarget}
              handleProcessSelected={handleProcessSelected}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === "data_view" && (
            <DataViewTab 
              headerData={headerData}
              selectedHeaders={selectedHeaders}
              detailData={detailData}
              isDetailLoading={isDetailLoading}
              isPending={isPending}
              isTransferring={isTransferring}
              headerWidths={headerWidths}
              detailWidths={detailWidths}
              handleResize={handleResize}
              handleSelectHeader={handleSelectHeader}
              toggleSelectAllHeaders={toggleSelectAllHeaders}
              handleDeleteTemp={handleDeleteTemp}
              handleTransferToAS400={handleTransferToAS400}
            />
          )}

          {activeTab === "archives" && (
            <ArchivesTab 
              rawArchives={rawArchives}
              archiveSearch={archiveSearch}
              setArchiveSearch={setArchiveSearch}
              selectedArchives={selectedArchives}
              toggleSelectArchive={toggleSelectArchive}
              toggleSelectAllArchives={toggleSelectAllArchives}
              handleDownloadSelectedArchives={handleDownloadSelectedArchives}
              handleDeleteSelectedArchives={handleDeleteSelectedArchives}
              handleDeleteArchive={handleDeleteArchive}
              isAdmin={isAdmin}
            />
          )}
        </AnimatePresence>
      </div>

      <DeleteConfirmModal 
        isVisible={!!stagingDeleteTarget}
        onCancel={() => setStagingDeleteTarget(null)}
        onConfirm={handleConfirmStagingDelete}
      />
    </div>
  );
}
