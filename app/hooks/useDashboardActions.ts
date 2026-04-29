"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { TabType, ViewMode, MasterData, DashboardTab } from "@/app/edi";
import { deleteMasterDataAction } from "@/app/actions/edi-actions";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export function useDashboardActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, hideToast } = useToast();
  
  // 🛡️ Derived State: ใช้ URL เป็น Source of Truth โดยตรง
  // วิธีนี้แก้ปัญหา Cascading Renders เพราะ React จะคำนวณค่าใหม่ทุกครั้งที่ URL เปลี่ยน
  const activeTab = (searchParams.get("tab") as DashboardTab) || "customer";
  const viewMode = (searchParams.get("view") as ViewMode) || "list";

  const [isPending, startTransition] = useTransition();
  
  const setActiveTab = useCallback((tab: DashboardTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    // รีเซ็ตหน้าเมื่อเปลี่ยนแท็บ
    params.delete("page");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const setViewMode = useCallback((view: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Modal States
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: TabType } | null>(null);
  const [editTarget, setEditTarget] = useState<MasterData | null>(null);
  const [viewTarget, setViewTarget] = useState<MasterData | null>(null);

  const handleDelete = async (onSuccess?: () => void) => {
    if (!deleteTarget) return;

    // 🛡️ Guard: Only master data tabs support deletion currently
    const masterDataTabs = ["customer", "product", "address"];
    if (!masterDataTabs.includes(deleteTarget.type)) {
      showToast("ประเภทข้อมูลนี้ยังไม่รองรับการลบ", "error");
      setDeleteTarget(null);
      return;
    }

    startTransition(async () => {
      const res = await deleteMasterDataAction(
        deleteTarget.id, 
        deleteTarget.type as "customer" | "product" | "address"
      );
      if (res.success) {
        setDeleteTarget(null);
        if (onSuccess) onSuccess();
        showToast("ลบข้อมูลสำเร็จแล้วฮะ!", "success");
      } else {
        showToast(res.error || "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
      }
    });
  };

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    isPending,
    deleteTarget,
    setDeleteTarget,
    editTarget,
    setEditTarget,
    viewTarget,
    setViewTarget,
    handleDelete
  };
}
