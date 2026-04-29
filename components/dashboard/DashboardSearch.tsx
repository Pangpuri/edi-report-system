"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ViewMode } from "@/app/edi";

interface DashboardSearchProps {
  viewMode: ViewMode;
  isMasterDataTab: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
}

export function DashboardSearch({
  viewMode,
  isMasterDataTab,
  searchQuery,
  setSearchQuery,
  activeTab
}: DashboardSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mt-2">
      <div className="relative group w-full sm:w-64 lg:w-80 order-2 sm:order-1">
        <AnimatePresence mode="wait">
          {viewMode === "list" && isMasterDataTab && (
            <motion.div 
              key="search-input"
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -5 }}
              className="relative w-full"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search master data..."
                className="w-full pl-9 pr-4 py-2 bg-ui-bg border border-ui-border rounded-lg text-xs font-medium focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder:text-ui-muted/50"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-40 group-focus-within:opacity-100 transition-opacity">🔍</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5 px-3 py-1 bg-ui-bg/50 rounded-md border border-ui-border order-1 sm:order-2 self-start sm:self-auto">
        <span className="text-[8px] font-black uppercase text-ui-muted tracking-tighter">Path</span>
        <span className="text-ui-muted/20 text-[10px]">/</span>
        <span className="text-[9px] font-bold text-brand-primary uppercase tracking-tight">{activeTab}</span>
      </div>
    </div>
  );
}