import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TabType, MasterData } from "@/app/edi";
import { getCustomerMaster } from "@/app/actions/edi-customer";
import { getProductMaster } from "@/app/actions/edi-product";
import { getCustomerAddresses } from "@/app/actions/edi-custAddress";

interface ActionResult {
  success: boolean;
  data?: MasterData[];
  error?: string;
}

/**
 * Optimized Hook for Master Data Management
 * Fixed: Infinite Loop and Laggy Search
 */
export function useMasterData(activeTab: string) {
  const [data, setData] = useState<MasterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // 🔍 Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // 🔢 Pagination State (Local only for maximum speed)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 🛡️ Reference to track tab changes
  const lastTab = useRef(activeTab);

  // 🛡️ Debounce logic: Delay filtering to keep typing smooth
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 🔄 Data Loader
  const loadData = useCallback(async (isSilent = false) => {
    const isMasterDataTab = ["customer", "product", "address"].includes(activeTab);
    if (!isMasterDataTab) {
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    setError(false);
    
    try {
      let result: ActionResult | null = null;
      if (activeTab === "customer") result = await getCustomerMaster() as ActionResult;
      else if (activeTab === "product") result = await getProductMaster() as ActionResult;
      else if (activeTab === "address") result = await getCustomerAddresses() as ActionResult;

      if (result?.success && Array.isArray(result.data)) {
        setData(result.data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("[MasterData Load Error]", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // 🔄 Initial Load & Tab Change handling
  useEffect(() => {
    loadData();
    if (lastTab.current !== activeTab) {
      setSearchQuery("");
      setDebouncedQuery("");
      setCurrentPage(1);
      lastTab.current = activeTab;
    }
  }, [activeTab, loadData]);

  // 🔍 Optimized Search Filter
  const allFilteredData = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    if (!query) return data;

    return data.filter((item) => {
      // Surgical check to avoid heavy Object.values recursion if possible
      for (const key in item) {
        const val = (item as any)[key];
        if (val && String(val).toLowerCase().includes(query)) return true;
      }
      return false;
    });
  }, [data, debouncedQuery]);

  // 🔢 Reset page to 1 on search result change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  // 🔢 Slice data for current page
  const totalPages = Math.ceil(allFilteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allFilteredData.slice(start, start + itemsPerPage);
  }, [allFilteredData, currentPage]);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  return {
    data,
    filteredData: paginatedData,
    currentPage,
    totalPages,
    setCurrentPage, // keep it for compatibility if needed elsewhere
    goToNextPage,
    goToPreviousPage,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refresh: (isSilent = true) => loadData(isSilent), 
  };
}
