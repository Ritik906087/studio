
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "font-headline font-black tracking-tighter italic flex items-center gap-2",
        className
      )}
    >
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-br from-primary to-accent rounded-xl blur-[2px] opacity-30 animate-pulse"></div>
        <div className="relative bg-gradient-to-br from-primary to-accent p-2 rounded-xl shadow-lg shadow-primary/20">
          <span className="text-white text-base leading-none font-black drop-shadow-sm">F</span>
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-slate-800 drop-shadow-sm text-xl tracking-tight font-black">
          FLEX <span className="text-primary font-light not-italic">PAY</span>
        </span>
        <span className="text-[7px] font-bold text-primary tracking-[0.3em] uppercase pl-1 opacity-70">Digital Wallet</span>
      </div>
    </div>
  );
}
