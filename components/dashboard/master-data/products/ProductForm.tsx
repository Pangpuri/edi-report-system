"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { prodcodeSchema } from "@/lib/validations/edi";
import { motion } from "framer-motion";
import { useTransition } from "react";
import { createProductAction, updateProductAction } from "@/app/actions/master/product-actions"; 
import { useToast } from "@/components/ToastProvider";

type ProductFormData = z.infer<typeof prodcodeSchema>;

interface AddProductFormProps {
  initialValues?: ProductFormData;
  onSuccess?: () => void;
}

export function AddProductForm({ onSuccess, initialValues }: AddProductFormProps) {
  const isEdit = !!initialValues;
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(prodcodeSchema),
    defaultValues: initialValues,
  });

  const onSubmit = (data: ProductFormData) => {
  startTransition(async () => {
    try {
      let result;
      
      if (isEdit && initialValues) {
        // 🛡️ ท่าป้องกัน: ส่ง ID (PK) ไปอัปเดต โดยรับประกันว่าไม่เป็น null/undefined
        const targetId = initialValues.ean_product_code ?? ""; 
        result = await updateProductAction(targetId, data);
      } else {
        result = await createProductAction(data);
      }

      if (result.success) {
        showToast(isEdit ? "อัปเดตข้อมูลสินค้าสำเร็จ! 📦✨" : "บันทึกข้อมูลสินค้าสำเร็จ! 📦✨", "success");
        if (!isEdit) reset(); // ถ้าเป็น Add ค่อย Reset ถ้า Edit ไม่ต้องก็ได้
        onSuccess?.();
      } else {
        showToast(`${result.error}`, "error");
      }
    } catch (err) {
      showToast("Internal Server Error: ไม่สามารถติดต่อ Server Action ได้", "error");
    }
  });
};

  const renderField = (id: keyof ProductFormData, label: string, maxLength: number) => {
    const value = watch(id) || "";
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[14px]">
          <label className="text-ui-muted font-medium">{label}</label>
          <span className="text-ui-muted/60">{value.length}/{maxLength}</span>
        </div>
        <input 
          {...register(id)}
          maxLength={maxLength}
          disabled={isPending || (isEdit && id === "ean_product_code")}
          className={`w-full bg-ui-bg border border-ui-border p-2 rounded-lg text-sm text-ui-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 outline-none transition-all font-mono ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        />
        {errors[id] && <p className="text-status-error text-[10px] mt-1">{errors[id]?.message}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-ui-card p-6 rounded-2xl border border-ui-border shadow-sm">
      <h2 className="text-xl font-black text-brand-primary mb-6 flex items-center gap-2 uppercase tracking-tight">
        📦 {isEdit ? "แก้ไขข้อมูลรายการสินค้า" : "เพิ่มข้อมูลรายการสินค้า"}
      </h2>
      
      <div className="space-y-4">
        {renderField("ean_product_code", "EAN Product Code (บาร์โค้ด)", 15)}
        {renderField("internal_product_code", "รหัสสินค้าภายใน (Internal Code)", 25)}
        {renderField("product_description", "รายละเอียดสินค้า", 35)}
      </div>

      <motion.button 
        whileTap={{ scale: 0.98 }}
        type="submit" 
        disabled={isPending}
        className={`mt-8 w-full py-3 rounded-xl font-bold transition-all shadow-lg text-white
          ${isPending ? "bg-ui-muted/50 cursor-not-allowed" : "bg-brand-primary hover:opacity-90 shadow-brand-primary/20"}`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            กำลังบันทึกสินค้า...
          </span>
        ) : isEdit ? "อัปเดตข้อมูลสินค้า 💾" : "บันทึกข้อมูลสินค้า 💾"}
      </motion.button>
    </form>
  );
}
