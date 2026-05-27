'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShieldCheck, Gift, TrendingUp, ChevronRight, ChevronLeft, X, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AnnouncementPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Only show on Home page
    if (pathname !== '/home') return;

    // Show popup once per session
    const hasSeen = sessionStorage.getItem('flex-announcement-seen');
    if (!hasSeen) {
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('flex-announcement-seen', 'true');
  };

  const nextStep = () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1);
    else handleClose();
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (pathname !== '/home') return null;

  const steps = [
    {
      title: "Security Tips",
      icon: <ShieldCheck className="h-4 w-4 text-white" />,
      content: (
        <div className="space-y-3 text-[10px] leading-tight">
          <div className="space-y-1">
            <p className="font-black text-slate-800 uppercase border-b border-slate-100 pb-1">For Buyers:</p>
            <ol className="list-decimal pl-4 space-y-0.5 font-bold text-slate-600">
              <li>Pay the <span className="text-red-500">exact amount</span>.</li>
              <li>Use linked <span className="text-blue-600">Verified Wallet</span>.</li>
              <li>Enter <span className="text-slate-900 underline">UTR immediately</span>.</li>
            </ol>
          </div>
          <div className="space-y-1">
            <p className="font-black text-slate-800 uppercase border-b border-slate-100 pb-1">For Sellers:</p>
            <ol className="list-decimal pl-4 space-y-0.5 font-bold text-slate-600">
              <li>UPI must be <span className="text-teal-600 font-black">Unlimited</span>.</li>
              <li>Fake reports = <span className="text-red-600 underline">Permanent Ban</span>.</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: "Mission Rewards",
      icon: <Gift className="h-4 w-4 text-white" />,
      content: (
        <div className="space-y-4 text-[10px] leading-tight">
          <div className="bg-blue-600 rounded-xl p-3 text-white relative overflow-hidden">
             <p className="text-[8px] font-black uppercase opacity-70">Newbie Gift</p>
             <h3 className="text-xl font-black mt-0.5">₹300.00 <span className="text-[10px] opacity-60">FREE</span></h3>
             <p className="text-[8px] font-bold mt-1">Join Telegram & trade ₹1500 to unlock.</p>
          </div>
          <p className="font-bold text-slate-500 text-center">Invite (L1) and get <span className="text-teal-600">₹100 Cash</span> on their mission completion.</p>
        </div>
      )
    },
    {
      title: "Trading Profit",
      icon: <TrendingUp className="h-4 w-4 text-white" />,
      content: (
        <div className="space-y-3 text-[10px] leading-tight">
          <div className="p-3 bg-slate-900 rounded-xl text-white">
             <div className="flex justify-between items-center border-b border-white/10 pb-1">
                <span className="font-black uppercase text-[8px] text-blue-400">Buy Reward</span>
                <span className="font-black text-blue-400">5%</span>
             </div>
             <p className="font-bold text-[9px] text-slate-400 mt-1">Get bonus on every purchase injected instantly.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-white border border-slate-100 rounded-lg">
                  <p className="text-[7px] font-black text-slate-400 uppercase">L1 (A)</p>
                  <p className="text-sm font-black text-slate-800">1.0%</p>
              </div>
              <div className="p-2 bg-white border border-slate-100 rounded-lg">
                  <p className="text-[7px] font-black text-slate-400 uppercase">L2 (B)</p>
                  <p className="text-sm font-black text-slate-800">0.8%</p>
              </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[300px] w-[85%] rounded-[24px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-0">
          <div className="bg-blue-600 p-4 text-center relative">
            <button onClick={handleClose} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-white/80"><X className="h-3 w-3" /></button>
            <div className="flex flex-col items-center gap-1.5">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">{steps[currentStep].icon}</div>
                <DialogTitle className="text-sm font-black text-white uppercase tracking-tight">{steps[currentStep].title}</DialogTitle>
                <div className="flex gap-1 mt-1">
                    {steps.map((_, i) => (
                        <div key={i} className={cn("h-1 rounded-full transition-all", currentStep === i ? "w-4 bg-white" : "w-1 bg-white/30")} />
                    ))}
                </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 bg-white min-h-[180px]">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} transition={{ duration: 0.2 }}>
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-3 bg-slate-50 flex gap-2 border-t">
            {currentStep > 0 && <Button variant="outline" className="flex-1 h-10 rounded-lg font-black text-[9px] uppercase border-slate-200" onClick={prevStep}>Back</Button>}
            <Button onClick={nextStep} className="flex-[2] h-10 btn-gradient rounded-lg font-black text-[9px] uppercase shadow-blue-500/20">
                {currentStep === 2 ? "START" : "NEXT"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
