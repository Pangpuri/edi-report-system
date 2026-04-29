"use client";

interface TopBarProps {
  userName?: string;
  userRole?: string;
}

export function TopBar({ userName, userRole }: TopBarProps) {
  return (
    <div className="flex justify-between items-center px-4 md:px-6 py-2 md:py-3 bg-ui-card/50 backdrop-blur-md rounded-xl md:rounded-2xl border border-ui-border mb-4">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-primary/10 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg shrink-0">👤</div>
        <div className="min-w-0">
          <p className="hidden md:block text-[10px] font-black text-ui-muted uppercase tracking-widest leading-none mb-1">ยินดีต้อนรับ</p>
          <p className="text-xs md:text-sm font-black text-ui-text truncate max-w-[150px] md:max-w-none">{userName || "User"}</p>
        </div>
        <span className="px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary text-[8px] md:text-[9px] font-black rounded md:rounded-lg uppercase tracking-tighter shrink-0">
          {userRole || "USER"}
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase text-ui-muted tracking-widest">System Online</span>
      </div>
    </div>
  );
}
