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
import { SessionUser, SlideBarTab } from "@/app/edi";
import { useToast } from "@/components/ToastProvider";
import { useColumnResizer } from "@/hooks/useColumnResizer";

// Import types
import { 
  StagingFile, EDHData, EDLData, RawArchive, TabType, StagingDeleteTarget 
} from "./types";

// Import sub-components
import { ImportTab } from "./(tabs)/ImportTab";
import { DataViewTab } from "./(tabs)/DataViewTab";
import { ArchivesTab } from "./(tabs)/ArchivesTab";
import { LoadingOverlay } from "./(shared)/LoadingOverlay";
import { ImportModals } from "./(shared)/ImportModals";
import { AddProductChangeModal } from "@/components/dashboard/master-data/products/AddProductChangeModal";

export function ImportAS400({ setActiveTab: setParentTab }: { setActiveTab?: (tab: SlideBarTab) => void }) {
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
      if (saved && ["import", "data_view", "archives"].includes(saved)) {
        return saved as TabType;
      }
    }
    return "import";
  });

  const [rawArchives, setRawArchives] = useState<RawArchive[]>([]);
  const [archiveSearch, setArchiveSearch] = useState("");
  
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedArchives, setSelectedArchives] = useState<number[]>([]);

  const [isPending, startTransition] = useTransition();
  const [detailCache, setDetailCache] = useState<Record<string, EDLData[]>>({});

  const { columnWidths: headerWidths, handleResize: handleHeaderResize } = useColumnResizer();
  const { columnWidths: detailWidths, handleResize: handleDetailResize } = useColumnResizer();

  const [headerData, setHeaderData] = useState<EDHData[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<EDHData[]>([]);
  const [detailData, setDetailData] = useState<EDLData[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // --- Modal States ---
  const [customerModalTarget, setCustomerModalTarget] = useState<EDHData | null>(null);
  const [productModalTarget, setProductModalTarget] = useState<{ header: EDHData; details: EDLData[] } | null>(null);
  const [isProductChangeModalOpen, setIsProductChangeModalOpen] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem("import_active_tab", activeTab);
  }, [activeTab]);

  const initData = useCallback(async () => {
    const hData = await getEDHData();
    setHeaderData(hData as unknown as EDHData[]);

    const aData = await getRawFileArchivesAction();
    setRawArchives(aData as RawArchive[]);
  }, []);

  useEffect(() => {
    initData();
  }, [initData]);

  // ฟังก์ชันสำหรับ Refresh ข้อมูลหลังจากมีการแก้ไข Master Data
  const refreshAfterMasterUpdate = useCallback(async () => {
    const hData = await getEDHData();
    const headers = hData as unknown as EDHData[];
    setHeaderData(headers);

    // อัปเดตสถานะของ Selected Headers
    if (selectedHeaders.length > 0) {
      const updated = headers.filter(h => 
        selectedHeaders.some(sh => sh.id === h.id)
      );
      setSelectedHeaders(updated);
      
      // ล้าง Cache และโหลด Detail ใหม่เพื่อให้เห็นสถานะ Validation ล่าสุด
      setDetailCache({});
      
      if (updated.length > 0) {
        setIsDetailLoading(true);
        try {
          const items = updated.map(h => ({ customerPo: h.customerPo ?? "", fileName: h.fileName ?? "" }));
          const newDetails = await getEDLByHeadersAction(items);
          
          const newCacheEntries: Record<string, EDLData[]> = {};
          updated.forEach(h => {
            newCacheEntries[`${h.customerPo}|${h.fileName}`] = (newDetails as unknown as EDLData[]).filter(
              d => d.customerPo === h.customerPo && d.fileName === h.fileName
            );
          });

          setDetailCache(newCacheEntries);
          
          const allDetailsRaw = updated.flatMap(h => newCacheEntries[`${h.customerPo}|${h.fileName}`] || []);
          const allDetails = Array.from(new Map(allDetailsRaw.map(d => [d.id, d])).values())
            .sort((a, b) => 
              (a.seqNum ?? "").localeCompare(b.seqNum ?? "", undefined, { numeric: true, sensitivity: 'base' })
            );
          
          setDetailData(allDetails);
        } catch (error) {
          console.error("Refresh Details Error:", error);
        } finally {
          setIsDetailLoading(false);
        }
      }
    }
  }, [selectedHeaders]);

  // --- Handlers ---

  const handleResize = (table: 'header' | 'detail', column: string, e: React.MouseEvent) => {
    if (table === 'header') handleHeaderResize(column, e);
    else handleDetailResize(column, e);
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
      const uploadRes = await uploadAS400FilesAction(formData);
      
      if (uploadRes.success) {
// Accumulate items (don't clear)
        let successCount = 0;
        const fileNames = validFiles.map(f => f.name);
        
        for (const fileName of fileNames) {
          const res = await processImportAS400(fileName, undefined, false);
          if (res.success) successCount++;
        }

        await initData();
        showToast(`นำเข้าและประมวลผลสำเร็จ ${successCount} จาก ${fileNames.length} ไฟล์`, "success");
        
        // Auto-selection removed
        
        setActiveTab("data_view"); 
      } else {
        showToast(uploadRes.message || "เกิดข้อผิดพลาดในการอัปโหลด", "error");
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Upload & Process Error:", err.message);
      showToast("เกิดข้อผิดพลาดในระบบ", "error");
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
    const tabFiles: { content: string; name: string }[] = [];

    for (const header of selectedHeaders) {
      try {
        const res = await upsertToAS400(header.id);
        if (res.success) {
          successCount++;
          if (res.tabContent && res.fileName) {
            // เปลี่ยนนามสกุลไฟล์จาก .tab เป็น .txt
            const exportName = res.fileName.replace(/\.tab$/i, ".txt");
            tabFiles.push({ content: res.tabContent, name: exportName });
          }
        } else {
          showToast(res.message, "error");
        }
      } catch (error) {
        console.error(`Transfer Error for PO ${header.customerPo}:`, error);
      }
    }
    
    // ดำเนินการดาวน์โหลดไฟล์ .txt ถ้ามี
    if (tabFiles.length > 0) {
      for (const file of tabFiles) {
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        // หน่วงเวลาเล็กน้อยป้องกัน Browser Block multiple downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setIsTransferring(false);
    if (successCount > 0) {
      showToast(`โอนข้อมูลสำเร็จ ${successCount} จาก ${selectedHeaders.length} รายการ (ข้อมูลถูกกระจายไปที่ History และ Record แล้ว)`, "success");
      
      // เด้งไปที่หน้า "รายการข้อมูลก่อนพิมพ์" ทันทีที่โอนสำเร็จ
      if (setParentTab) setParentTab("processed-data");
    }
    
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
            <h2 className="text-lg font-black text-brand-primary uppercase tracking-tight">ระบบนำเข้า และจัดการไฟล์ EDI</h2>
            <p className="text-[14px] text-ui-muted font-medium uppercase tracking-widest">จัดการไฟล์ ก่อนนำเข้าระบบ</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-ui-bg p-1 rounded-lg border border-ui-border">
          {(["import", "data_view", "archives"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? "bg-brand-primary text-white shadow-md" : "text-ui-muted hover:text-ui-text"
              }`}
            >
              {tab === "data_view" ? "ข้อมูลเตรียมนำเข้าระบบ" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              setCustomerModalTarget={setCustomerModalTarget}
              setProductModalTarget={setProductModalTarget}
              onOpenProductChange={() => setIsProductChangeModalOpen(true)}
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

      <ImportModals 
        customerModalTarget={customerModalTarget}
        setCustomerModalTarget={setCustomerModalTarget}
        productModalTarget={productModalTarget}
        setProductModalTarget={setProductModalTarget}
        onSuccess={refreshAfterMasterUpdate}
      />

      <AddProductChangeModal 
        isOpen={isProductChangeModalOpen}
        onClose={() => setIsProductChangeModalOpen(false)}
        onSuccess={refreshAfterMasterUpdate}
      />
    </div>
  );
}
