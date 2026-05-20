import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "font-headline font-black tracking-tighter italic",
        className
      )}
    >
      <span className="text-gradient drop-shadow-sm">
        FLEX PAY
      </span>
    </div>
  );
}
