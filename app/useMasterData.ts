import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MasterData } from "@/app/edi";
import { getCustomerMaster } from "@/app/actions/master/customer-actions";
import { getProductMaster } from "@/app/actions/master/product-actions";
import { getCustomerAddresses } from "@/app/actions/master/address-actions";

interface ActionResult {
  success: boolean;
  data?: MasterData[];
  error?: string;
}

/**
 * Optimized Hook for Master Data Management
 * Fixed: Persist Search Query per Tab
 */
export function useMasterData(activeTab: string) {
  const [data, setData] = useState<MasterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  //  Search States (Per-tab storage)
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboard_search_queries");
      try {
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  // Current search query for the active tab
  const searchQuery = useMemo(() => searchQueries[activeTab] || "", [searchQueries, activeTab]);
  
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  
  //  Pagination State (Local only for maximum speed)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  //  Reference to track tab changes
  const lastTab = useRef(activeTab);

  // Persistence logic
  const updateSearchQuery = (query: string) => {
    setSearchQueries(prev => {
      const next = { ...prev, [activeTab]: query };
      localStorage.setItem("dashboard_search_queries", JSON.stringify(next));
      return next;
    });
  };

  // Synchronize debounced query when switching tabs (immediately)
  useEffect(() => {
    if (lastTab.current !== activeTab) {
      const savedQuery = searchQueries[activeTab] || "";
      setDebouncedQuery(savedQuery);
      setCurrentPage(1);
      lastTab.current = activeTab;
    }
  }, [activeTab, searchQueries]);

  //  Debounce logic for the current query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  //  Data Loader
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

  //  Initial Load
  useEffect(() => {
    loadData();
  }, [loadData]);

  //  Optimized Search Filter
  const allFilteredData = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    if (!query) return data;

    return data.filter((item) => {
      return Object.values(item).some((val) => 
        val && String(val).toLowerCase().includes(query)
      );
    });
  }, [data, debouncedQuery]);

  
  //ถ้าไม่มีส่วนนี้ การค้นหาจะไม่เปลี่ยนหน้าเพิ่มเติม ช่วยค้นหาแบบข้ามหน้า
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  // ช่วยค้นหาแบบข้ามหน้า
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
    setCurrentPage, 
    goToNextPage,
    goToPreviousPage,
    loading,
    error,
    searchQuery,
    setSearchQuery: updateSearchQuery,
    refresh: (isSilent = true) => loadData(isSilent), 
  };
}
