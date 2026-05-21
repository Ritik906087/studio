import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "font-headline font-black tracking-tighter italic flex items-center gap-2.5",
        className
      )}
    >
      <div className="relative">
        <div className="absolute -inset-1.5 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-[14px] blur-[3px] opacity-25"></div>
        <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-500 p-2.5 rounded-[12px] shadow-lg shadow-teal-500/20">
          <span className="text-white text-[18px] leading-none font-black drop-shadow-sm">F</span>
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-slate-800 drop-shadow-sm text-[22px] tracking-tight font-black uppercase">
          FLEX<span className="text-teal-600 font-light not-italic">PAY</span>
        </span>
        <span className="text-[8px] font-black text-teal-600 tracking-[0.4em] uppercase pl-1 opacity-60">Digital Wallet</span>
      </div>
    </div>
  );
}