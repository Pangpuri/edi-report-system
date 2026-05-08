"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { customerSchema } from "@/lib/validations/edi";
import { useTransition } from "react"; // 👈 เพิ่มมาคุมสถานะ
import { motion } from "framer-motion";
import { createCustomerAction, updateCustomerAction } from "@/app/actions/master/customer-actions"; 
import { useToast } from "@/components/ToastProvider";

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddCustomerFormProps {
  initialValues?: CustomerFormData;
  onSuccess?: () => void;
}

export function AddCustomerForm({ onSuccess, initialValues }: AddCustomerFormProps) {
  const isEdit = !!initialValues;
  const [isPending, startTransition] = useTransition(); // 👈 สร้างสถานะ Loading
  const { showToast } = useToast();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialValues,
  });

  const onSubmit = (data: CustomerFormData) => {
    // 🚀 เริ่มต้นการส่งข้อมูลอย่างปลอดภัย
    startTransition(async () => {
      try {
        let result;

        if (isEdit) {
          // 🛡️ ดึง ID สำหรับอัปเดต (ถ้าไม่มีใน initialValues ให้ใช้จาก data ที่พิมพ์มาแทน)
          const targetCode = initialValues?.customer_code || data.customer_code;
          
          if (!targetCode) {
             showToast("ไม่พบรหัสลูกค้าสำหรับอัปเดต", "error");
             return;
          }
          
          result = await updateCustomerAction(targetCode, data);
        } else {
          // ✨ กรณีเพิ่มข้อมูลใหม่
          result = await createCustomerAction(data);
        }
        
        if (result.success) {
          showToast(isEdit ? "อัปเดตข้อมูลลูกค้าสำเร็จ! 🎉" : "บันทึกข้อมูลลูกค้าสำเร็จ! 🎉", "success");
          
          // 🧹 ล้างฟอร์มเฉพาะตอนเพิ่มใหม่ (ถ้า Edit ไม่ต้องล้างก็ได้เพื่อให้ User ดูข้อมูลที่แก้เสร็จแล้ว)
          if (!isEdit) reset(); 
          
          onSuccess?.(); // แจ้งเตือน Component แม่ให้ Refresh ข้อมูล
        } else {
          // 🚩 กรณีติด Validation หรือ DB Error
          showToast(`เกิดข้อผิดพลาด: ${result.error}`, "error");
        }
      } catch (err) {
        showToast("ไม่สามารถเชื่อมต่อกับ Server ได้ กรุณาลองใหม่อีกครั้ง", "error");
      }
    });
  };

  const renderField = (id: keyof CustomerFormData, label: string, maxLength: number) => {
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
          disabled={isPending || (isEdit && id === "customer_code")} // 🛡️ ห้ามแก้รหัสหลักถ้าเป็นการ Edit
          className={`w-full bg-ui-bg border border-ui-border p-2 rounded-lg text-sm text-ui-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 outline-none transition-all ${isPending ? 'opacity-50' : ''}`}
        />
        {errors[id] && <p className="text-status-error text-[10px] mt-1">{errors[id]?.message}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-ui-card p-6 rounded-2xl border border-ui-border shadow-sm">
      <h2 className="text-xl font-black text-brand-primary mb-6 flex items-center gap-2 uppercase tracking-tight">
        🏢 {isEdit ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มข้อมูลลูกค้า"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField("customer_code", "รหัสลูกค้า (Customer Code)", 25)}
        {renderField("ean_location_code", "EAN Location Code", 13)}
        <div className="col-span-full">
          {renderField("company_name", "ชื่อบริษัท (Company Name)", 50)}
        </div>
        {renderField("short_name", "ชื่อย่อ (Short Name)", 10)}
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
            กำลังบันทึกข้อมูล...
          </span>
        ) : isEdit ? "อัปเดตข้อมูลลูกค้า 💾" : "บันทึกข้อมูลลูกค้า 💾"}
      </motion.button>
    </form>
  );
}
