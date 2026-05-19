"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { 
  getImportedAS400Data, 
  deleteImportedAction,
  getEDLHistoryByHeadersAction,
  getAS400LogsByHistoryIds,
  updateHistoryStatus,
  reTransferHistoryAction
} from "./as400-actions";
import { useToast } from "@/components/ToastProvider";

// --- Types ---
export interface EDHHistoryData {
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
  importedAtDisplay: string | null;
  createdAt: Date | null;
  cusNameOp: string | null;
  cusProdChange: string | null;
  flag: boolean | null;
  eanLocationCode: string | null;
  hasAddress: boolean;
}

export interface AS400Log {
  id: number;
  historyId: number | null;
  status: string | null;
  errorMessage: string | null;
  createdAt: Date | null;
  createdAtDisplay: string | null;
}

export interface EDLHistoryData {
  id: number;
  headerId: number | null;
  customerPo: string | null;
  seqNum: string | null;
  Bar_Code_Item: string | null;
  productName: string | null;
  orderQty: string | number | null;
  unitPrice: string | number | null;
  fileName: string | null;
  packSize: string | null;
  buyerProdCode: string | null;
  vendorProdCode: string | null;
  freeQty: string | number | null;
  discount1: string | number | null;
  discount2: string | number | null;
  discount3: string | number | null;
  netAmount: string | number | null; 
  checkBarInt: string | null;
  checkNameOldProd: string | null;
  changeItem: string | null;
  changeProdName: string | null;
}

export function useAS400History() {
  const { showToast } = useToast();
  const [headerData, setHeaderData] = useState<EDHHistoryData[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<EDHHistoryData[]>([]);
  const [detailData, setDetailData] = useState<EDLHistoryData[]>([]);
  const [logData, setLogData] = useState<AS400Log[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<"items" | "logs">("items");
  
  const [isPending, startTransition] = useTransition();
  const [detailCache, setDetailCache] = useState<Record<number, EDLHistoryData[]>>({});
  const [logCache, setLogCache] = useState<Record<number, AS400Log[]>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getImportedAS400Data();
      setHeaderData(data as unknown as EDHHistoryData[]);
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
      const uncachedDetails = selectedHeaders.filter(h => !detailCache[h.id]);
      if (uncachedDetails.length > 0) {
        setIsDetailLoading(true);
        const historyIds = uncachedDetails.map(h => h.id);
        const newDetails = await getEDLHistoryByHeadersAction(historyIds);
        const newEntries: Record<number, EDLHistoryData[]> = {};
        uncachedDetails.forEach(h => {
          newEntries[h.id] = (newDetails as unknown as EDLHistoryData[]).filter(d => d.headerId === h.id);
        });
        setDetailCache(prev => ({ ...prev, ...newEntries }));
      }

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
        const allDetailsRaw = selectedHeaders.flatMap(h => detailCache[h.id] || []);
        const allDetails = Array.from(new Map(allDetailsRaw.map(d => [d.id, d])).values());
        setDetailData(allDetails);

        const allLogs = selectedHeaders.flatMap(h => logCache[h.id] || []);
        setLogData([...allLogs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      });
    };

    syncDetailsAndLogs();
  }, [selectedHeaders, detailCache, logCache]);

  const handleSelectHeader = (header: EDHHistoryData) => {
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

  return {
    headerData,
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
    setSelectedHeaders,
    toggleSelectAllHeaders,
    handleToggleStatus,
    handleReTransfer,
    handleDeleteSelectedHeaders
  };
}