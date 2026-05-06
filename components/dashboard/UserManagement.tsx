"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { UserViewModal } from "@/components/modals/UserViewModal";
import { EditUserModal, type User as ModalUser } from "@/components/modals/EditUserModal";
// ✅ ปรับการ Import: เอา updateUserRoleAction ออก และใช้ updateUserAction แทน
import { getUsersAction, updateUserAction, deleteUserAction } from "@/app/actions/user-actions";
import { useToast } from "@/components/ToastProvider";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  username?: string | null;
  displayUsername?: string | null;
  role: "admin" | "user";
  emailVerified: boolean;
}

export function UserManagement() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [viewTarget, setViewTarget] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // --- 🔄 Fetch Data ---
  const refreshUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getUsersAction();
      if (res.success && res.data) {
        setUsers(res.data as unknown as User[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) refreshUsers(false);
    return () => { isMounted = false; };
  }, [refreshUsers]);

  // --- Logic Helpers ---

  const toggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    
    startTransition(async () => {
      // 🛡️ ส่งข้อมูลในรูปแบบ Object ตามที่ updateUserAction ต้องการ
      const res = await updateUserAction(user.id, { role: newRole });
      
      if (res.success) {
        showToast(`เปลี่ยนสิทธิ์ผู้ใช้ ${user.name} เป็น ${newRole} สำเร็จ`, "success");
        refreshUsers(false); // อัปเดตข้อมูลในหน้าจอทันที
      } else {
        showToast(res.error || "เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์", "error");
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const res = await deleteUserAction(deleteTarget.id);
      if (res.success) {
        showToast(`ลบผู้ใช้ ${deleteTarget.name} สำเร็จ`, "success");
        setDeleteTarget(null);
        refreshUsers();
      } else {
        showToast(res.error || "เกิดข้อผิดพลาดในการลบผู้ใช้", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 px-2">
        <div>
          <h2 className="text-3xl font-black text-ui-text tracking-tighter uppercase">User Management</h2>
          <p className="text-ui-muted text-sm font-medium italic">จัดการสิทธิ์และกู้คืนรหัสผ่านผู้ใช้งานในระบบ EDI</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-brand-primary text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest hover:brightness-110 shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
        >
          + เพิ่มผู้ใช้งาน
        </button>
      </div>

      {/* User Table */}
      <div className={`bg-ui-card border border-ui-border rounded-[2.5rem] overflow-hidden shadow-2xl transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
          <thead>
              <tr className="bg-ui-bg/50 border-b border-ui-border text-ui-muted text-[11px] uppercase tracking-[0.2em] font-black">
              <th className="px-6 py-4">ข้อมูลผู้ใช้</th>
              <th className="px-6 py-4">รหัสเข้าใช้งาน / สถานะ</th>
              <th className="px-6 py-4">สิทธิ์การใช้งาน</th>
              <th className="px-6 py-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border/50">
            {!loading && users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-ui-muted italic">
                  ไม่พบรายชื่อผู้ใช้งานในระบบ 👥
                </td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-brand-primary/[0.01] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="font-black text-ui-text tracking-tight">{user.name || "Unknown User"}</div>
                    {(user.phone || user.username) && (
                      <span className="text-[10px] bg-ui-bg border border-ui-border px-1.5 py-0.5 rounded text-ui-muted font-mono shadow-sm">
                        {user.phone || user.username}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ui-muted">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${
                    user.emailVerified ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                  }`}>
                    {user.emailVerified ? "ACTIVE" : "PENDING"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleRole(user)}
                    disabled={isPending}
                    className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg border transition-all active:scale-95 disabled:opacity-50 ${
                      user.role === "admin" 
                        ? "border-brand-primary/30 text-brand-primary bg-brand-primary/5 shadow-sm shadow-brand-primary/5" 
                        : "border-ui-border text-ui-muted bg-ui-bg hover:text-ui-text hover:border-ui-text"
                    }`}
                  >
                    {user.role}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button 
                      onClick={() => setViewTarget(user)}
                      className="p-2.5 hover:bg-ui-bg rounded-xl text-ui-muted hover:text-ui-text transition-all active:scale-90"
                      title="ดูรายละเอียด"
                    >👁️</button>
                    <button 
                      onClick={() => setEditTarget(user)}
                      className="p-2.5 hover:bg-ui-bg rounded-xl text-ui-muted hover:text-ui-text transition-all active:scale-90"
                      title="แก้ไข / รีเซ็ตรหัสผ่าน"
                    >✏️</button>
                    
                    {user.role !== "admin" ? (
                      <button 
                        onClick={() => setDeleteTarget(user)}
                        disabled={isPending}
                        className="p-2.5 hover:bg-brand-primary/10 rounded-xl text-brand-primary transition-all active:scale-90 disabled:opacity-30"
                      >
                        🗑️
                      </button>
                    ) : (
                      <div className="p-2.5 opacity-10 cursor-not-allowed grayscale select-none">🗑️</div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        isPending={isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <EditUserModal 
        key={editTarget?.id || (isAddModalOpen ? "new" : "closed")}
        isOpen={isAddModalOpen || !!editTarget}
        target={editTarget as ModalUser | null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditTarget(null);
        }}
        onSuccess={() => {
          setIsAddModalOpen(false);
          setEditTarget(null);
          refreshUsers();
        }}
      />

      <UserViewModal target={viewTarget} onClose={() => setViewTarget(null)} />

    </div>
  );
}
