'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Show popup once per session on home screen
    const hasSeen = sessionStorage.getItem('flex-announcement-seen');
    if (!hasSeen) {
      // Trigger after short delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

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

  const steps = [
    {
      title: "Flex Pay Security Tips",
      icon: <ShieldCheck className="h-5 w-5 text-white" />,
      content: (
        <div className="space-y-4 text-[11px] leading-relaxed">
          <div className="space-y-2">
            <p className="font-black text-slate-800 uppercase border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> For Buyers:
            </p>
            <ol className="list-decimal pl-4 space-y-1 font-bold text-slate-600">
              <li>Pay the <span className="text-red-500">exact order amount</span> including decimals.</li>
              <li>Only use your linked <span className="text-blue-600">Verified Wallet</span> (MobiKwik/Freecharge).</li>
              <li>After payment, enter <span className="text-slate-900 underline">UTR immediately</span> and upload real screenshot.</li>
              <li>Complete the transfer before the <span className="text-red-500">30-min timer</span> expires.</li>
            </ol>
          </div>
          <div className="space-y-2">
            <p className="font-black text-slate-800 uppercase border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> For Sellers:
            </p>
            <ol className="list-decimal pl-4 space-y-1 font-bold text-slate-600">
              <li>Ensure your UPI is active and can receive <span className="text-teal-600 font-black">Unlimited Payments</span>.</li>
              <li>Check your bank limits daily to avoid transaction failures.</li>
              <li>Multiple violations or fake reports may lead to <span className="text-red-600 underline">Permanent Ban</span>.</li>
            </ol>
          </div>
          <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100">
             <p className="text-[10px] font-bold text-orange-800">
                Facing issues? Contact official support via <span className="underline">Live Chat</span> immediately. Do not share OTP with anyone!
             </p>
          </div>
        </div>
      )
    },
    {
      title: "Mission Rewards",
      icon: <Gift className="h-5 w-5 text-white" />,
      content: (
        <div className="space-y-5 text-[11px] leading-relaxed">
          <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
             <Zap className="absolute top-0 right-0 h-16 w-16 opacity-10 -mr-4 -mt-4" />
             <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Newbie Gift</p>
             <h3 className="text-2xl font-black tracking-tight mt-1">₹300.00 <span className="text-xs opacity-60">FREE</span></h3>
             <p className="text-[9px] font-bold mt-2 leading-tight">Complete Telegram, Tutorial, and ₹1500 Trade milestone to unlock instantly.</p>
          </div>
          
          <div className="space-y-3">
             <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                    <p className="font-black text-slate-800 uppercase tracking-tight">Referral Incentive</p>
                    <p className="font-bold text-slate-500 mt-0.5">Invite a friend (L1) and get <span className="text-teal-600">₹100 Cash</span> when they complete missions.</p>
                </div>
             </div>
             <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                    <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                    <p className="font-black text-slate-800 uppercase tracking-tight">Instant Credit</p>
                    <p className="font-bold text-slate-500 mt-0.5">Bonus is injected directly into your main balance. No waiting, no hassle.</p>
                </div>
             </div>
          </div>
          <p className="text-[9px] font-black text-center text-slate-400 uppercase tracking-widest pt-2">Check 'My Family' for tracking</p>
        </div>
      )
    },
    {
      title: "Trading Earnings",
      icon: <TrendingUp className="h-5 w-5 text-white" />,
      content: (
        <div className="space-y-4 text-[11px] leading-relaxed">
          <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3">
             <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="font-black uppercase tracking-widest text-[9px] text-blue-400">Buy Reward</span>
                <span className="font-black text-blue-400">6% + ₹5</span>
             </div>
             <p className="font-bold text-[10px] text-slate-400 leading-snug">
                Every time you purchase FP, our rotation engine adds <span className="text-white">6% bonus plus a flat ₹5 extra</span> to your assets.
             </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Level 1 (A)</p>
                  <p className="text-base font-black text-slate-800 mt-1">1.0% <span className="text-[8px] opacity-40">COMM</span></p>
                  <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase">From direct friends</p>
              </div>
              <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Level 2 (B)</p>
                  <p className="text-base font-black text-slate-800 mt-1">0.8% <span className="text-[8px] opacity-40">COMM</span></p>
                  <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase">From indirect nodes</p>
              </div>
          </div>

          <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-teal-600 shrink-0" />
              <p className="text-[9px] font-bold text-teal-800 uppercase leading-tight">
                 Build your network and earn passive liquidity daily. The more they trade, the more you earn!
              </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[340px] w-[90%] rounded-[28px] p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-300">
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 p-5 pt-7 text-center relative">
            <button 
                onClick={handleClose}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/30">
                    {steps[currentStep].icon}
                </div>
                <DialogTitle className="text-lg font-black text-white tracking-tight uppercase">
                    {steps[currentStep].title}
                </DialogTitle>
                <div className="flex gap-1.5 mt-1">
                    {steps.map((_, i) => (
                        <div key={i} className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            currentStep === i ? "w-6 bg-white" : "w-1.5 bg-white/30"
                        )} />
                    ))}
                </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-white min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
            {currentStep > 0 && (
                <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase border-slate-200 text-slate-500" 
                    onClick={prevStep}
                >
                    <ChevronLeft className="mr-1 h-3 w-3" /> Back
                </Button>
            )}
            <Button 
                onClick={nextStep} 
                className="flex-[2] h-12 btn-gradient rounded-xl font-black text-[10px] uppercase tracking-widest shadow-blue-500/20"
            >
                {currentStep === 2 ? "START TRADING" : "NEXT STEP"} <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
