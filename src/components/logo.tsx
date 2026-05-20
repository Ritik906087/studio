import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "font-headline font-black tracking-tighter italic flex items-center gap-1",
        className
      )}
    >
      <div className="bg-primary p-1 rounded-sm">
        <span className="text-white">F</span>
      </div>
      <span className="text-gradient drop-shadow-sm">
        LEX PAY
      </span>
    </div>
  );
}