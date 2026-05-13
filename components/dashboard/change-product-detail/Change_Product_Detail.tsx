"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Package, ArrowRightLeft, Search, 
  RefreshCw, History, FileEdit, 
  Save, Trash2, ArrowRight, Plus,
  CheckCircle2, AlertCircle, Loader2,
  Eraser
} from "lucide-react";
import { getEditDetailsAction, saveEditDetailAction, deleteEditDetailAction } from "@/app/actions/master/change-product-actions";
import { useToast } from "@/components/ToastProvider";

interface ProductChangeDetail {
  id?: number;
  BarCode: string;
  Internal_Code1: string;
  Prod_Name1: string | null;
  Internal_Code2: string;
  Prod_Name2: string | null;
  Cus_Code: string | null;
  createdAt?: Date | null;
  lastUsed?: Date | null;
}

const INITIAL_STATE: ProductChangeDetail = {
  BarCode: "",
  Internal_Code1: "",
  Prod_Name1: null,
  Internal_Code2: "",
  Prod_Name2: null,
  Cus_Code: null,
  createdAt: null,
  lastUsed: null,
};

export function ChangeProductDetail() {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<ProductChangeDetail>(INITIAL_STATE);
  const [data, setData] = useState<ProductChangeDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const results = await getEditDetailsAction();
      setData(results);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = () => {
    if (!selectedItem.BarCode || !selectedItem.Internal_Code2) {
      showToast("กรุณากรอกบาร์โค้ดและรหัสสินค้าใหม่", "error");
      return;
    }

    startTransition(async () => {
      const res = await saveEditDetailAction(selectedItem);
      if (res.success) {
        showToast("บันทึกการเปลี่ยนแปลงรหัสสินค้าเรียบร้อยแล้ว", "success");
        loadData();
      } else {
        showToast(res.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
    startTransition(async () => {
      const res = await deleteEditDetailAction(id);
      if (res.success) {
        showToast("ลบข้อมูลเรียบร้อยแล้ว", "success");
        setSelectedItem(INITIAL_STATE);
        loadData();
      }
    });
  };

  const filteredData = data.filter(item => 
    item.BarCode.includes(searchTerm) || 
    (item.Prod_Name1 && item.Prod_Name1.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-1 text-ui-text overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center bg-ui-card p-4 rounded-xl border border-ui-border shadow-sm text-medium shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-amber-600 uppercase tracking-tight">สินค้าที่ต้องเปลี่ยนรหัส</h2>
            <p className="text-[12px] text-ui-muted font-medium uppercase tracking-widest">Product Code Change Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={loadData} className="p-2 bg-ui-bg border border-ui-border rounded-lg text-ui-muted hover:text-brand-primary transition-all">
             <RefreshCw size={18} />
           </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Left Side: Table List */}
        <div className="flex-1 bg-ui-card border border-ui-border rounded-2xl overflow-hidden shadow-lg flex flex-col">
          <div className="p-4 border-b border-ui-border bg-ui-bg/50 flex justify-between items-center shrink-0">
             <div className="relative text-xs w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" size={14} />
                <input 
                  type="text" 
                  placeholder="ค้นหารหัส หรือชื่อสินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-ui-card border border-ui-border rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                />
              </div>
              <div className="flex items-center gap-2 text-[12px] font-black uppercase text-ui-muted tracking-widest">
                  <History size={14} /> ประวัติ ({data.length})
              </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-center border-collapse table-fixed">
              <thead className="sticky top-0 bg-ui-bg border-b border-ui-border z-10 text-xs font-black uppercase text-ui-muted tracking-widest">
                <tr>
                  <th className="p-4 w-36">Barcode</th>
                  <th className="p-4 w-28">Internal1</th>
                  <th className="p-4 w-28">ลูกค้า</th>
                  <th className="p-4">ชื่อเดิมสินค้า</th>
                  <th className="p-4 w-28 text-emerald-600">Internal2</th>
                  <th className="p-4 text-emerald-600">ชื่อใหม่สินค้า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border/50 text-sm font-medium">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" size={24} /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-ui-muted italic">ไม่พบข้อมูล</td></tr>
                ) : (
                  filteredData.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedItem({ ...item })}
                      className={`hover:bg-ui-bg/50 transition-colors cursor-pointer ${selectedItem?.id === item.id ? "bg-brand-primary/5" : ""}`}
                    >
                      <td className="p-4 font-mono text-amber-600">{item.BarCode}</td>
                      <td className="p-4">{item.Internal_Code1}</td>
                      <td className="p-4">{item.Cus_Code || "-"}</td>
                      <td className="p-4 truncate">{item.Prod_Name1 || "-"}</td>
                      <td className="p-4 text-emerald-600 underline decoration-dotted">{item.Internal_Code2}</td>
                      <td className="p-4 text-emerald-600 truncate">{item.Prod_Name2 || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Edit Form */}
        <div className="w-96 bg-ui-card border border-ui-border rounded-2xl overflow-hidden shadow-lg flex flex-col shrink-0">
          <div className="p-4 border-b border-ui-border bg-brand-primary text-white flex items-center gap-3 shrink-0">
            <FileEdit size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest">
              {selectedItem?.id ? "แก้ไขการเปลี่ยนรหัส" : "เพิ่มการเปลี่ยนรหัส"}
            </h3>
            {selectedItem?.id && (
              <button 
                onClick={() => handleDelete(selectedItem.id!)} 
                className="ml-auto p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="ลบรายการ"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-3 space-y-2 custom-scrollbar">
            {/* Section 1: ข้อมูลเดิม */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-[11px] font-black text-amber-600 uppercase tracking-tighter border-l-2 border-amber-500 pl-2">
                  <AlertCircle size={12} /> ข้อมูลเดิม
                </div>
                {selectedItem.id && (
                  <button 
                    onClick={() => setSelectedItem(INITIAL_STATE)}
                    className="text-[9px] font-medium text-brand-primary flex items-center gap-1 hover:underline uppercase"
                  >
                    <Plus size={9} /> เพิ่มใหม่
                  </button>
                )}
              </div>
              
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] font-black text-ui-muted uppercase block mb-0.5">Barcode</label>
                  <input 
                    type="text" 
                    value={selectedItem.BarCode || ""} 
                    onChange={(e) => setSelectedItem({ ...selectedItem, BarCode: e.target.value })}
                    placeholder="บาร์โค้ด"
                    className="w-full bg-ui-bg border border-ui-border rounded px-2 py-1 text-xs font-mono font-medium focus:border-brand-primary outline-none text-ui-text" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ui-muted uppercase block mb-0.5">Code 1</label>
                  <input 
                    type="text" 
                    value={selectedItem.Internal_Code1 || ""} 
                    onChange={(e) => setSelectedItem({ ...selectedItem, Internal_Code1: e.target.value })}
                    placeholder="รหัสเดิม"
                    className="w-full bg-ui-bg border border-ui-border rounded px-2 py-1 text-xs font-medium focus:border-brand-primary outline-none text-ui-text" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ui-muted uppercase block mb-0.5">ชื่อสินค้า</label>
                  <input 
                    type="text" 
                    value={selectedItem.Prod_Name1 || ""} 
                    onChange={(e) => setSelectedItem({ ...selectedItem, Prod_Name1: e.target.value })}
                    placeholder="ชื่อเดิม"
                    className="w-full bg-ui-bg border border-ui-border rounded px-2 py-1 text-xs font-medium focus:border-brand-primary outline-none text-ui-text" 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: ข้อมูลใหม่ */}
            <div className="space-y-1.5 border-t border-ui-border pt-2">
              <div className="flex items-center gap-1 text-[11px] font-black text-emerald-500 uppercase tracking-tighter border-l-2 border-emerald-500 pl-2">
                <CheckCircle2 size={12} /> ข้อมูลใหม่
              </div>
              
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] font-black text-ui-text uppercase block mb-0.5">Code 2</label>
                  <input 
                    type="text" 
                    value={selectedItem.Internal_Code2 || ""} 
                    onChange={(e) => setSelectedItem({ ...selectedItem, Internal_Code2: e.target.value })}
                    placeholder="รหัสใหม่"
                    className="w-full bg-ui-card border-2 border-emerald-500/30 rounded px-2 py-1 text-xs font-medium focus:border-emerald-500 outline-none text-ui-text" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ui-text uppercase block mb-0.5">ชื่อสินค้า</label>
                  <input 
                    type="text" 
                    value={selectedItem.Prod_Name2 || ""} 
                    onChange={(e) => setSelectedItem({ ...selectedItem, Prod_Name2: e.target.value })}
                    placeholder="ชื่อใหม่"
                    className="w-full bg-ui-card border-2 border-emerald-500/30 rounded px-2 py-1 text-xs font-medium focus:border-emerald-500 outline-none text-ui-text" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ui-text uppercase block mb-0.5">ลูกค้า</label>
                  <input 
                    type="text" 
                    value={selectedItem.Cus_Code || ""} 
                    onChange={(e) => setSelectedItem({ ...selectedItem, Cus_Code: e.target.value })}
                    placeholder="รหัส/ชื่อลูกค้า"
                    className="w-full bg-ui-card border border-ui-border rounded px-2 py-1 text-xs font-medium focus:border-brand-primary outline-none text-ui-text" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 border-t border-ui-border bg-ui-bg/50 flex gap-2">
            <button 
              onClick={() => setSelectedItem(INITIAL_STATE)}
              className="p-2 bg-ui-card border border-ui-border text-ui-muted rounded-xl hover:text-brand-primary transition-all shadow-sm"
              title="ล้างข้อมูลในฟอร์ม"
            >
              <Eraser size={20} />
            </button>
            <button 
              disabled={isPending}
              onClick={handleSave}
              className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-[14px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}