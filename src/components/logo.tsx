import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "font-headline font-black tracking-tighter italic flex items-center gap-1.5",
        className
      )}
    >
      <div className="bg-gradient-to-br from-primary to-accent p-1.5 rounded-xl shadow-lg shadow-primary/30">
        <span className="text-white text-base leading-none">F</span>
      </div>
      <span className="text-white drop-shadow-md text-xl tracking-tight">
        FLEX <span className="text-accent font-light not-italic">PAY</span>
      </span>
    </div>
  );
}