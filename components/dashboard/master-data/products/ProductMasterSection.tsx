"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ToastProvider";
import { MasterData } from "@/app/edi";
import {
  getEditUnitMakroListAction,
  createEditUnitMakroAction, // isProduct is not from actions
  deleteEditUnitMakroAction, // isProduct is not from actions
} from "@/app/actions/master/edit-unit-makro-actions";
import { isProduct } from "@/components/dashboard/master-data/MasterDataTable"; // Import isProduct from the correct location

interface SelectedProduct {
  id: string;
  ean_product_code: string;
  product_description: string;
}

interface EditUnitMakroRecord {
  id: number;
  product_id: string | null;
  product_name: string;
  unit_product: string | number;
  unit_cn: string;
  discount_1: string | number | null;
  discount_2: string | number | null;
  discount_3: string | number | null;
  discount_amount: string | number | null;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface MakroFormData {
  unit_product: string;
  unit_cn: string;
  discount_1: string;
  discount_2: string;
  discount_3: string;
  discount_amount: string;
}

interface ProductMasterSectionProps {
  selectedProductFromTable?: MasterData | null;
}
function MakroProductForm({
  selectedProduct,
  records,
  isPending,
  onSave,
  onCancel,
}: {
  selectedProduct: SelectedProduct;
  records: EditUnitMakroRecord[];
  isPending: boolean;
  onSave: (formData: MakroFormData) => void;
  onCancel: () => void;
}) {
  // Find existing record for initial state
  const existing = useMemo(() => 
    records.find((r) => r.product_id === selectedProduct.id && r.status === "active"),
    [records, selectedProduct.id]
  );

  // Form fields state initialized from existing record
  const [formData, setFormData] = useState<MakroFormData>({
    unit_product: existing?.unit_product?.toString() || "",
    unit_cn: existing?.unit_cn || "",
    discount_1: existing?.discount_1?.toString() || "",
    discount_2: existing?.discount_2?.toString() || "",
    discount_3: existing?.discount_3?.toString() || "",
    discount_amount: existing?.discount_amount?.toString() || "",
  });

  // Adjust state during render when 'existing' record changes (late loading)
  // This avoids useEffect cascading render warnings
  const [prevExisting, setPrevExisting] = useState<EditUnitMakroRecord | undefined>(existing);
  if (existing !== prevExisting) {
    setPrevExisting(existing);
    if (existing) {
      setFormData({
        unit_product: existing.unit_product?.toString() || "",
        unit_cn: existing.unit_cn,
        discount_1: existing.discount_1?.toString() || "",
        discount_2: existing.discount_2?.toString() || "",
        discount_3: existing.discount_3?.toString() || "",
        discount_amount: existing.discount_amount?.toString() || "",
      });
    }
  }

  const renderInput = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder = "",
    type = "text",
    step = "0.01"
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-ui-text">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        disabled={isPending}
        className="px-3 py-2 text-sm bg-ui-bg border border-ui-border rounded-lg text-ui-text placeholder-ui-muted/50 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 p-4 bg-ui-bg rounded-lg border border-ui-border/50"
    >
      {/* Quantity and Unit Section */}
      <div className="grid grid-cols-2 gap-4">
        {renderInput(
          "จำนวนต่อหน่วย",
          formData.unit_product,
          (val) => setFormData(prev => ({ ...prev, unit_product: val })),
          "0.00",
          "number"
        )}
        {renderInput(
          "------",
          formData.unit_cn,
          (val) => setFormData(prev => ({ ...prev, unit_cn: val })),
          "CN"
        )}
      </div>

      {/* Discount Section */}
      <div className="border-t border-ui-border/50 pt-4">
        <h3 className="text-sm font-semibold text-ui-text mb-3">
            --- ส่วนลด ---
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {renderInput(
            "ส่วนลด 1 (%)",
            formData.discount_1,
            (val) => setFormData(prev => ({ ...prev, discount_1: val })),
            "0.00",
            "number"
          )}
          {renderInput(
            "ส่วนลด 2 (%)",
            formData.discount_2,
            (val) => setFormData(prev => ({ ...prev, discount_2: val })),
            "0.00",
            "number"
          )}
          {renderInput(
            "ส่วนลด 3 (%)",
            formData.discount_3,
            (val) => setFormData(prev => ({ ...prev, discount_3: val })),
            "0.00",
            "number"
          )}
          {renderInput(
            "จำนวนส่วนลด",
            formData.discount_amount,
            (val) => setFormData(prev => ({ ...prev, discount_amount: val })),
            "0.00",
            "number"
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-ui-border/50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSave(formData)}
          disabled={isPending}
          className="flex-1 px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "⏳ กำลังบันทึก..." : "✓ ยืนยัน"}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 border border-ui-border text-ui-text font-semibold rounded-lg hover:bg-ui-bg transition-all disabled:opacity-50"
        >
          ✕ ยกเลิก
        </motion.button>
      </div>
    </motion.div>
  );
}

export function ProductMasterSection({ selectedProductFromTable }: ProductMasterSectionProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [records, setRecords] = useState<EditUnitMakroRecord[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);

  const loadInitialData = useCallback(() => {
    startTransition(async () => {
      try {
        const recordsRes = await getEditUnitMakroListAction();

        if (recordsRes.success && recordsRes.data) {
          setRecords(recordsRes.data as EditUnitMakroRecord[]);
        } else {
          showToast(recordsRes.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
        }
      } catch (error) {
        showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
      }
    });
  }, [showToast]);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Adjust state during render when prop changes (Sync selection)
  // This avoids useEffect cascading render warnings
  const [prevSelectedProp, setPrevSelectedProp] = useState<MasterData | null | undefined>(undefined);
  if (selectedProductFromTable !== prevSelectedProp) {
    setPrevSelectedProp(selectedProductFromTable);
    if (selectedProductFromTable) {
      // Intermediate cast to unknown resolves the overlap error between MasterData and Record
      // Use type guard to safely access product properties
      if (isProduct(selectedProductFromTable)) {
        setSelectedProduct({
          id: selectedProductFromTable.ean_product_code,
          ean_product_code: selectedProductFromTable.ean_product_code,
          product_description: selectedProductFromTable.product_description || ""
        });
      } else {
        // Handle cases where it's not a product, or log a warning
        console.warn("selectedProductFromTable is not a Product type:", selectedProductFromTable);
        setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }
  }

  const handleSave = (formData: MakroFormData) => {
    if (!selectedProduct) {
      showToast("กรุณาเลือกสินค้า", "error");
      return;
    }

    const unitProduct = parseFloat(formData.unit_product);
    if (isNaN(unitProduct)) {
      showToast("กรุณากรอกจำนวนต่อหน่วยเป็นตัวเลข", "error");
      return;
    }

    if (!formData.unit_cn) {
      showToast("กรุณากรอกหน่วยที่ต้องการเปลี่ยน", "error");
      return;
    }

    startTransition(async () => {
      const result = await createEditUnitMakroAction({
        product_id: selectedProduct.id,
        product_name: selectedProduct.product_description,
        unit_product: unitProduct,
        unit_cn: formData.unit_cn,
        discount_1: formData.discount_1 ? parseFloat(formData.discount_1) : null,
        discount_2: formData.discount_2 ? parseFloat(formData.discount_2) : null,
        discount_3: formData.discount_3 ? parseFloat(formData.discount_3) : null,
        discount_amount: formData.discount_amount
          ? parseFloat(formData.discount_amount)
          : null,
      });

      if (result.success) {
        showToast("บันทึกข้อมูลสำเร็จ ✨", "success");
        setSelectedProduct(null);
        loadInitialData();
      } else {
        showToast(result.error || "บันทึกข้อมูลไม่สำเร็จ", "error");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("คุณแน่ใจหรือว่าต้องการลบรายการนี้?")) return;

    startTransition(async () => {
      const result = await deleteEditUnitMakroAction(id);

      if (result.success) {
        showToast("ลบรายการสำเร็จ ✨", "success");
        loadInitialData();
      } else {
        showToast(result.error || "ลบรายการไม่สำเร็จ", "error");
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      id="makro-form-section"
      className="bg-ui-card border border-ui-border rounded-xl shadow-lg p-6 md:p-8 flex-1 min-h-0 flex flex-col overflow-hidden text-ui-text"
    >
      <h2 className="text-xl font-bold text-brand-primary mb-6 flex items-center gap-2">
        ข้อมูลการเปลี่ยนแปลงหน่วยสินค้า Makro
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
        {/* Product Selection */}
        <div className="space-y-3">
          {!selectedProduct && (
            <div className="p-8 border-2 border-dashed border-ui-border rounded-xl text-center text-ui-muted">
              <p className="text-sm"> คลิกที่ปุ่ม [แปลงหน่วย] เพื่อเริ่มแก้ไขข้อมูลหน่วยสินค้าสำหรับ Makro</p>
            </div>
          )}

          {/* Selected Product Display */}
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-brand-primary/10 border-l-4 border-brand-primary rounded-lg flex justify-between items-center"
            >
              <div className="text-sm">
                <div className="font-semibold text-ui-text">
                  {selectedProduct.product_description}
                </div>
                <div className="text-xs text-ui-muted">
                  รหัส: {selectedProduct.id}
                </div>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="text-xs font-bold text-brand-primary hover:underline uppercase"
              >
                ล้างการเลือก
              </button>
            </motion.div>
          )}
        </div>

        {/* Form Fields - Isolated sub-component with key for identity-based state reset */}
        {selectedProduct && (
          <MakroProductForm
            key={selectedProduct.id}
            selectedProduct={selectedProduct}
            records={records}
            isPending={isPending}
            onSave={handleSave}
            onCancel={() => setSelectedProduct(null)}
          />
        )}

        {/* Records List */}
        <div className="border-t border-ui-border pt-6 space-y-3">
          <h3 className="text-lg font-bold text-ui-text">
             รายการสินค้าและราคา ({records.length})
          </h3>

          {records.length > 0 ? (
            <div className="space-y-2">
              {records.map((record) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-ui-bg border border-ui-border/50 rounded-lg hover:border-brand-primary/30 transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold text-ui-text">
                        {record.product_name}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-ui-muted">
                        <div>จำนวน: {record.unit_product} {record.unit_cn}</div>
                        <div>
                          {record.discount_1
                            ? `ส่วนลด 1: ${record.discount_1}%`
                            : ""}
                        </div>
                        <div>
                          {record.discount_2
                            ? `ส่วนลด 2: ${record.discount_2}%`
                            : ""}
                        </div>
                        <div>
                          {record.discount_3
                            ? `ส่วนลด 3: ${record.discount_3}%`
                            : ""}
                        </div>
                        <div>
                          {record.discount_amount
                            ? `จำนวนลด: ${record.discount_amount}`
                            : ""}
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(record.id)}
                      disabled={isPending}
                      className="px-3 py-1 bg-status-error/20 text-status-error font-semibold rounded hover:bg-status-error/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                     ลบ
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ui-muted">
              ยังไม่มีรายการ
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
