// components/dashboard/import-data/(tabs)/ArchivesTab.tsx
"use client";

import { motion } from "framer-motion";
import { Search, CheckCircle2, Download, Trash2 } from "lucide-react";
import { RawArchive } from "../types";

interface ArchivesTabProps {
  rawArchives: RawArchive[];
  archiveSearch: string;
  setArchiveSearch: (value: string) => void;
  selectedArchives: number[];
  toggleSelectArchive: (id: number) => void;
  toggleSelectAllArchives: (visibleArchives: RawArchive[]) => void;
  handleDownloadSelectedArchives: () => void;
  handleDeleteSelectedArchives: () => void;
  handleDeleteArchive: (id: number, name: string) => void;
  isAdmin: boolean;
}

export function ArchivesTab({
  rawArchives,
  archiveSearch,
  setArchiveSearch,
  selectedArchives,
  toggleSelectArchive,
  toggleSelectAllArchives,
  handleDownloadSelectedArchives,
  handleDeleteSelectedArchives,
  handleDeleteArchive,
  isAdmin
}: ArchivesTabProps) {
  const visibleArchives = rawArchives.filter(a => 
    a.originalName.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  return (
    <motion.div 
      key="archives" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-black uppercase text-brand-primary">ประวัติไฟล์ที่นำเข้า</h3>
          <div className="flex items-center gap-2">
            {selectedArchives.length > 0 && (
              <button 
                onClick={handleDownloadSelectedArchives}
                className="px-3 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-lg text-[12px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-1.5"
              >
                <Download size={12} /> Download ที่เลือก({selectedArchives.length})
              </button>
            )}
            {selectedArchives.length > 0 && isAdmin && (
              <button 
                onClick={handleDeleteSelectedArchives}
                className="px-3 py-1 bg-status-error/10 text-status-error border border-status-error/20 rounded-lg text-[12px] font-black uppercase tracking-widest hover:bg-status-error hover:text-white transition-all flex items-center gap-1.5"
              >
                <Trash2 size={12} /> ลบที่เลือก ({selectedArchives.length})
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={archiveSearch} 
            onChange={(e) => setArchiveSearch(e.target.value)} 
            className="bg-ui-bg border border-ui-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-brand-primary outline-none" 
          />
        </div>
      </div>
      <div className="flex-1 bg-ui-bg/30 border border-ui-border rounded-xl overflow-hidden flex flex-col shadow-inner">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ui-card z-10 border-b border-ui-border">
              <tr className="uppercase text-ui-muted">
                <th className="px-4 py-2 w-10 text-center">
                  <button 
                    onClick={() => toggleSelectAllArchives(visibleArchives)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      selectedArchives.length > 0 && selectedArchives.length === visibleArchives.length 
                        ? "bg-brand-primary border-brand-primary text-white" 
                        : "border-ui-border bg-ui-bg"
                    }`}
                  >
                    {selectedArchives.length > 0 && <CheckCircle2 size={10} />}
                  </button>
                </th>
                <th className="px-4 py-2">Filename</th>
                <th className="px-4 py-2">Date/Time</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border/10">
              {visibleArchives.map(archive => {
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
                        className={`w-4 h-4 rounded border flex items-center justify-center mx-auto transition-all ${
                          isSelected ? "bg-brand-primary border-brand-primary text-white shadow-md" : "border-ui-border bg-ui-bg"
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={10} />}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-bold">{archive.originalName}</td>
                    <td className="px-4 py-2 text-ui-muted">{archive.uploadedAtDisplay || "-"}</td>
                    <td className="px-4 py-2">{(archive.fileSize ? archive.fileSize / 1024 : 0).toFixed(1)} KB</td>
                    <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1.5">
                        <a 
                          href={`/api/archive/download?id=${archive.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-1 text-brand-primary hover:bg-brand-primary/10 rounded transition-all"
                        >
                          <Download size={14} />
                        </a>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteArchive(archive.id, archive.originalName)} 
                            className="p-1 text-status-error hover:bg-status-error/10 rounded transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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
  );
}
