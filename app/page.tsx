"use client";

import React, { Suspense, useCallback, useEffect, useState, useMemo } from "react";
import { useMasterData } from "@/app/useMasterData";
import { SessionUser } from "@/app/edi";
import { useDashboardActions } from "@/app/hooks/useDashboardActions";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { SlidebarLayout } from "@/components/layout/SlideBar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { DashboardMainContent } from "@/components/dashboard/DashboardMainContent";

export const dynamic = "force-dynamic";

function DashboardContent() {
  const router = useRouter();
  const { data: session, isPending: isAuthLoading } = authClient.useSession();
  
  // 🌸 State สำหรับจัดการ Fallback กรณีระบบ Auth ค้าง (เช่น WebSocket ผ่าน IP มีปัญหา)
  const [isTimeout, setIsTimeout] = useState(false);

  // 🛡️ Effect สำหรับนับถอยหลัง 3 วินาที
  useEffect(() => {
    if (isAuthLoading) {
      const timer = setTimeout(() => {
        setIsTimeout(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading]);

  //  Dashboard Logic Hook
  const {
    activeTab, setActiveTab, viewMode, setViewMode, isPending,
    deleteTarget, setDeleteTarget, editTarget, setEditTarget,
    viewTarget, setViewTarget, handleDelete
  } = useDashboardActions();

  //  Data Fetching Hook
  const masterData = useMasterData(activeTab);

  //  คำนวณค่าต่างๆ โดยใช้ useMemo เพื่อประสิทธิภาพสูงสุด
  const user = session?.user as SessionUser | undefined;
  const userRole = useMemo(() => user?.role || "user", [user]);
  const isMasterDataTab = useMemo(() => 
    ["customer", "address", "product"].includes(activeTab), 
    [activeTab]
  );

  //  ตัดสินใจว่าจะโชว์เนื้อหาหรือยัง
  const shouldShowContent = !isAuthLoading || isTimeout;

  //  ป้องกันการเข้าถึงโดยไม่ได้ Login (Client-side Guard)
  useEffect(() => {
    if (shouldShowContent && !session && !isAuthLoading) {
      router.push("/login");
    }
  }, [shouldShowContent, session, isAuthLoading, router]);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut({
      fetchOptions: { 
        onSuccess: () => { 
          router.push("/login"); 
          router.refresh(); 
        } 
      },
    });
  }, [router]);

  //  แสดงสถานะ Loading (Spinner)
  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-ui-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SlidebarLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onSignOut={handleSignOut}
      viewTarget={viewTarget}
      setViewTarget={setViewTarget}
      editTarget={editTarget}
      setEditTarget={setEditTarget}
      deleteTarget={deleteTarget}
      setDeleteTarget={setDeleteTarget}
      isPending={isPending}
      handleDelete={handleDelete}
      refresh={masterData.refresh}
    >
      {/* 🏷️ ส่วนหัวและส่วนค้นหา - ปรับให้กระชับขึ้น */}
      <div className="bg-ui-card p-4 md:p-6 rounded-2xl border border-ui-border shadow-md relative z-[40] mb-4">
        <DashboardHeader 
          activeTab={activeTab}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isMasterDataTab={isMasterDataTab}
        />

        <DashboardSearch 
          viewMode={viewMode}
          isMasterDataTab={isMasterDataTab}
          searchQuery={masterData.searchQuery}
          setSearchQuery={masterData.setSearchQuery}
          activeTab={activeTab}
        />
      </div>

      {/* 🏷️ ส่วนแสดงเนื้อหาหลัก - ลบความเทอะทะ */}
      <DashboardMainContent 
        viewMode={viewMode}
        activeTab={activeTab}
        loading={masterData.loading}
        error={masterData.error}
        refresh={masterData.refresh}
        filteredData={masterData.filteredData}
        userRole={userRole}
        setDeleteTarget={setDeleteTarget}
        setEditTarget={setEditTarget}
        setViewTarget={setViewTarget}
        currentPage={masterData.currentPage}
        totalPages={masterData.totalPages}
        goToNextPage={masterData.goToNextPage}
        goToPreviousPage={masterData.goToPreviousPage}
        setViewMode={setViewMode}
      />
    </SlidebarLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ui-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
