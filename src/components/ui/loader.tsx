
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import "./loader.css";
import { motion, AnimatePresence } from "framer-motion";

interface LoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
}

const standardMessages = [
  "Securing Login...",
  "Verifying Session...",
  "Loading Flex Pay...",
  "Syncing Dashboard..."
];

const failSafeMessages = [
  "Optimizing Connection...",
  "Slow Network Detected...",
  "Restoring Session...",
  "Please Wait..."
];

/**
 * Performance-optimized premium loader with anti-stuck intelligence.
 */
export const Loader = ({
  size = "md",
  fullscreen = true,
  className,
}: LoaderProps) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!fullscreen) return;

    // Detect slow loading after 4.5 seconds
    const slowDetector = setTimeout(() => {
      if (isMounted.current) setIsSlow(true);
    }, 4500);

    const interval = setInterval(() => {
      if (isMounted.current) {
        setMessageIndex((prev) => (prev + 1) % 4);
      }
    }, 2000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      clearTimeout(slowDetector);
    };
  }, [fullscreen]);

  const currentMessages = isSlow ? failSafeMessages : standardMessages;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center select-none">
        {/* Lighter Background for low-end device performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[80px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-teal-500/5 blur-[80px] rounded-full" />
        </div>

        <div className="relative mb-10">
          <div className="relative">
             {/* GPU Accelerated Breathing Effect */}
             <div className="absolute -inset-4 bg-gradient-to-br from-teal-500 to-blue-500 rounded-[24px] blur-xl opacity-20 animate-pulse-glow" />
             <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 w-20 h-20 rounded-[22px] shadow-2xl flex items-center justify-center border border-white/20 animate-breathing">
                <span className="text-white text-3xl font-black italic tracking-tighter drop-shadow-md">F</span>
             </div>
          </div>
          
          {/* Hardware Accelerated Scanner */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-[22px] pointer-events-none">
            <div className="w-full h-1 bg-white/40 shadow-[0_0_12px_rgba(255,255,255,0.6)] absolute top-0 left-0 animate-scanner" />
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
              FLEX<span className="text-teal-600 font-light">PAY</span>
            </h2>
            <div className="h-0.5 w-6 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-blue-600 animate-progress-line" />
            </div>
          </div>

          <div className="h-5 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={`${isSlow}-${messageIndex}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.15em]",
                  isSlow ? "text-orange-400" : "text-slate-400"
                )}
              >
                {currentMessages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-10 flex flex-col items-center gap-1">
          <div className={cn(
            "h-1 w-1 rounded-full animate-pulse",
            isSlow ? "bg-orange-300" : "bg-blue-400"
          )} />
          <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Flex Shield v4.0.5
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
        <div className="relative bg-primary w-6 h-6 rounded-lg flex items-center justify-center animate-breathing">
            <span className="text-white text-[10px] font-black italic">F</span>
        </div>
    </div>
  );
};
