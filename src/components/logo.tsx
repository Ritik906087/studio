import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "font-headline font-black tracking-tighter italic flex items-center gap-2.5",
        className
      )}
    >
      <div className="relative h-10 w-10">
        <Image 
          src="https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Banner/IMG_20260525_122039_723.jpg" 
          alt="Flex Pay Logo" 
          fill 
          className="rounded-[12px] object-cover shadow-lg shadow-teal-500/20"
          unoptimized
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-slate-800 drop-shadow-sm text-[22px] tracking-tight font-black uppercase">
          FLEX<span className="text-teal-600 font-light not-italic">PAY</span>
        </span>
        <span className="text-[8px] font-black text-teal-600 tracking-[0.4em] uppercase pl-1 opacity-60">Digital Network</span>
      </div>
    </div>
  );
}
