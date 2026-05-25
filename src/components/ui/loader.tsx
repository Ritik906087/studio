'use client';

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import "./loader.css";
import { motion, AnimatePresence } from "framer-motion";

interface LoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
}

const loadingMessages = [
  "Checking System...",
  "Securing Login...",
  "Connecting Wallet...",
  "Verifying Session...",
  "Loading Flex Pay...",
  "Syncing Transactions...",
  "Preparing Dashboard...",
  "Checking Security...",
  "Initializing Services..."
];

export const Loader = ({
  size = "md",
  fullscreen = true,
  className,
}: LoaderProps) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!fullscreen) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [fullscreen]);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-400/5 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-teal-400/5 blur-[120px] rounded-full" />
        </div>

        <div className="relative mb-12">
          {/* Logo Breathing Effect */}
          <div className="relative">
             <div className="absolute -inset-4 bg-gradient-to-br from-teal-500 to-blue-500 rounded-[24px] blur-2xl opacity-20 animate-pulse-glow" />
             <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 w-24 h-24 rounded-[22px] shadow-2xl flex items-center justify-center border border-white/20 animate-breathing">
                <span className="text-white text-4xl font-black italic tracking-tighter drop-shadow-md">F</span>
             </div>
          </div>
          
          {/* Scanning Line Effect */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-[22px] pointer-events-none">
            <div className="w-full h-1 bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.8)] absolute top-0 left-0 animate-scanner" />
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              FLEX<span className="text-teal-600 font-light">PAY</span>
            </h2>
            <div className="h-0.5 w-8 bg-blue-100 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-blue-600 animate-progress-line" />
            </div>
          </div>

          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingMessages[messageIndex]}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"
              >
                {loadingMessages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-12 text-[8px] font-black text-slate-300 uppercase tracking-widest">
          Flex Shield Encrypted v4.0
        </div>
      </div>
    );
  }

  // Fallback for component level loading (minimal version)
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="relative bg-primary w-8 h-8 rounded-lg flex items-center justify-center animate-breathing">
            <span className="text-white text-xs font-black italic">F</span>
        </div>
    </div>
  );
};
