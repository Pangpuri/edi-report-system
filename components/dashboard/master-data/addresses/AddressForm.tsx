"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addressSchema } from "@/lib/validations/edi";
import { motion } from "framer-motion";
import { createAddressAction, updateAddressAction } from "@/app/actions/master/address-actions";
import { useToast } from "@/components/ToastProvider";

// 🛡️ สร้าง Type จาก Schema โดยตรง ไม่ต้องเขียนซ้ำ
type AddressFormData = z.infer<typeof addressSchema>;

interface AddAddressFormProps {
  initialValues?: AddressFormData;
  onSuccess?: () => void;
  mode?: 'add' | 'edit';
}

export function AddAddressForm({ onSuccess, initialValues, mode }: AddAddressFormProps) {
  const isEdit = mode ? mode === 'edit' : !!initialValues;
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  // 🛡️ กำหนด Type ให้ useForm
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialValues,
  });

  const onSubmit = (data: AddressFormData) => {
    startTransition(async () => {
      try {
        let result;
        if (isEdit) {
          // ใช้รหัสเดิมจากตอนโหลดข้อมูล (ไม่ใช่จากช่อง input) เพื่อความแม่นยำในการหา row
          const originalCode = initialValues?.customer_no ?? data.customer_no;
          result = await updateAddressAction(originalCode, data);
        } else {
          result = await createAddressAction(data);
        }

        if (result.success) {
          showToast(isEdit ? "อัปเดตที่อยู่สำเร็จ! 🏠✨" : "บันทึกที่อยู่สำเร็จ! 🏠✨", "success");
          if (!isEdit) reset();
          onSuccess?.();
        } else {
          showToast(`เกิดข้อผิดพลาด: ${result.error}`, "error");
        }
      } catch (err) {
        showToast("ระบบขัดข้อง: ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้", "error");
      }
    });
  };

  //  ใช้ 'keyof AddressFormData' เพื่อให้ id รับได้เฉพาะชื่อฟิลด์ใน Schema เท่านั้น!
  const renderField = (id: keyof AddressFormData, label: string, maxLength: number) => {
    //  watch(id) ตอนนี้จะรู้แล้วว่า return ค่าเป็น string หรือ null
    const value = watch(id) || ""; 
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[14px]">
          <label className="text-ui-muted font-medium">{label}</label>
          <span className="text-ui-muted/60">{value.length}/{maxLength}</span>
        </div>
        <input 
          {...register(id)} // 🛡️ register(id) ตอนนี้จะ Type-safe 100%
          maxLength={maxLength}
          disabled={isPending || (isEdit && id === "customer_no")} // ป้องกันการแก้ PK ตอน Edit
          className={`w-full bg-ui-bg border border-ui-border p-2 rounded-lg text-sm text-ui-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 outline-none transition-all ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        />
        {/*  แสดง error message ถ้ามี (เพิ่มเผื่อไว้ให้ฮะ) */}
        {errors[id] && (
          <p className="text-status-error text-[10px] mt-1">{errors[id]?.message}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-ui-card p-6 rounded-2xl border border-ui-border shadow-sm">
      <h2 className="text-xl font-black text-brand-primary mb-6 flex items-center gap-2 uppercase tracking-tight">
        🏠 {isEdit ? "แก้ไขข้อมูลที่อยู่" : "เพิ่มข้อมูลที่อยู่"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-full lg:col-span-1">
          {renderField("customer_no", "Customer No", 10)}
        </div>

        {renderField("ean_location_code", "EAN Location", 13)}
        {renderField("tax_id", "เลขประจำตัวผู้เสียภาษี", 50)}
        {renderField("branch_code", "รหัสสาขา", 20)}
        
        <div className="col-span-full">
          {renderField("company_name", "ชื่อบริษัท", 50)}
        </div>

        <div className="col-span-full">
          {renderField("local_name", "ชื่อท้องถิ่น / ชื่อร้าน", 10)}
        </div>
     
        <div className="col-span-full">
          {renderField("address1", "ที่อยู่ (Address 1)", 50)}
        </div>

        <div className="col-span-full">
          {renderField("address2", "ที่อยู่เพิ่มเติม (Address 2)", 50)}
        </div>

        {renderField("city", "จังหวัด", 20)}
        {renderField("zip_code", "รหัสไปรษณีย์", 5)}
        {renderField("telephone", "เบอร์โทรศัพท์", 16)}
        {renderField("fax_no", "เบอร์โทรสาร (Fax)", 13)}
        {renderField("branch_short_name", "ชื่อย่อสาขา", 30)}

        <div className="grid grid-cols-2 gap-4 col-span-full">
          {renderField("ship_to_code", "Ship To Code", 4)}
          {renderField("usage_code", "Usage Code", 1)}
          {renderField("product_table", "Product Table", 10)}
          {renderField("signature", "Signature Code", 1)}
        </div>

        {renderField("doc_ref_pttrm", "เอกสารอ้างอิง PTT/RM", 20)}
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
            กำลังบันทึกที่อยู่...
          </span>
        ) : isEdit ? "ยืนยันการแก้ไขข้อมูล 💾" : "ยืนยันการเพิ่มข้อมูล 💾"}
      </motion.button>
    </form>
  );
}
