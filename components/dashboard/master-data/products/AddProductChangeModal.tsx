"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { saveEditDetailAction } from "@/app/actions/master/change-product-actions";
import { useToast } from "@/components/ToastProvider";
import { Loader2, X } from "lucide-react";

interface AddProductChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductChangeModal({ isOpen, onClose, onSuccess }: AddProductChangeModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    BarCode: "",
    Internal_Code1: "",
    Cus_Code: "",
    Prod_Name1: "",
    Internal_Code2: "",
    Prod_Name2: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.BarCode || !formData.Internal_Code1 || !formData.Internal_Code2) {
      showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await saveEditDetailAction(formData);
      if (res.success) {
        showToast("บันทึกการเปลี่ยนรหัสสินค้าสำเร็จ", "success");
        setFormData({
          BarCode: "",
          Internal_Code1: "",
          Cus_Code: "",
          Prod_Name1: "",
          Internal_Code2: "",
          Prod_Name2: "",
        });
        onSuccess();
        onClose();
      } else {
        showToast(res.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err) {
      showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ui-bg/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-ui-card border border-ui-border p-6 md:p-8 rounded-[2rem] max-w-2xl w-full shadow-2xl relative overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-ui-muted hover:text-brand-primary transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-brand-primary uppercase tracking-tight mb-6 flex items-center gap-3">
              <div className="w-2 h-6 bg-brand-primary rounded-full"></div>
              เพิ่มรายการเปลี่ยนรหัสสินค้า (Edit Detail)
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Section: Original Info */}
                <div className="space-y-4 p-4 bg-ui-bg/50 rounded-2xl border border-ui-border">
                  <h4 className="text-[14px] font-black text-ui-muted uppercase tracking-[0.2em] mb-2">กรุณากรอกข้อมูล</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-ui-text ml-1">บาร์โค้ด *</label>
                    <input
                      required
                      value={formData.BarCode}
                      onChange={e => setFormData({ ...formData, BarCode: e.target.value })}
                      placeholder="885XXXXXXXXXX"
                      className="w-full px-4 py-2.5 bg-ui-card border border-ui-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-ui-text ml-1">รหัสสินค้าเดิม</label>
                    <input
                      required
                      value={formData.Internal_Code1}
                      onChange={e => setFormData({ ...formData, Internal_Code1: e.target.value })}
                      placeholder="Internal Code 1"
                      className="w-full px-4 py-2.5 bg-ui-card border border-ui-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-ui-text ml-1">ชื่อสินค้าเดิม</label>
                    <input
                      value={formData.Prod_Name1}
                      onChange={e => setFormData({ ...formData, Prod_Name1: e.target.value })}
                      placeholder="ระบุชื่อสินค้าเดิม"
                      className="w-full px-4 py-2.5 bg-ui-card border border-ui-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                {/* Section: New Info */}
                <div className="space-y-4 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <h4 className="text-[14px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2">ข้อมูลที่ต้องการเปลี่ยน</h4>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-ui-text ml-1">รหัสสินค้าใหม่ *</label>
                    <input
                      required
                      value={formData.Internal_Code2}
                      onChange={e => setFormData({ ...formData, Internal_Code2: e.target.value })}
                      placeholder="Internal Code 2"
                      className="w-full px-4 py-2.5 bg-ui-card border border-ui-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-all font-mono text-brand-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-ui-text ml-1">ชื่อสินค้าใหม่</label>
                    <input
                      value={formData.Prod_Name2}
                      onChange={e => setFormData({ ...formData, Prod_Name2: e.target.value })}
                      placeholder="ระบุชื่อสินค้าใหม่"
                      className="w-full px-4 py-2.5 bg-ui-card border border-ui-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-ui-text ml-1">ลูกค้า</label>
                    <input
                      value={formData.Cus_Code}
                      onChange={e => setFormData({ ...formData, Cus_Code: e.target.value })}
                      placeholder="เช่น CJ , BigC , Lotus"
                      className="w-full px-4 py-2.5 bg-ui-card border border-ui-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-ui-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-sm font-black uppercase text-ui-muted hover:text-ui-text transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-brand-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
