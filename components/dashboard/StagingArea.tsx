"use client";

export function StagingArea() {
  return (
    <div className="bg-ui-card p-20 rounded-[2.5rem] border border-ui-border text-center">
      <span className="text-5xl mb-4 block">🛠️</span>
      <h2 className="text-2xl font-black text-ui-text mb-2">Data Staging Area</h2>
      <p className="text-ui-muted text-sm max-w-md mx-auto italic">
        จุดพักข้อมูลที่ตรวจสอบพบข้อผิดพลาดจาก AS400 เพื่อรอการแก้ไขเพิ่มเติม
        (กำลังอยู่ระหว่างการพัฒนา)
      </p>
    </div>
  );
}
