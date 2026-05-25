
"use client";

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, ChevronLeft, ShieldCheck } from 'lucide-react';
import React from 'react';

export default function HelpPage() {
  const telegramLink = "https://t.me/+oC2LaqBPdrg0NGM1";

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F7FB] p-4 font-body">
      <Card className="w-full max-w-sm rounded-[32px] border-none shadow-2xl bg-white overflow-hidden text-center relative">
        <div className="absolute top-4 left-4">
             <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-50">
                <Link href="/home"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
             </Button>
        </div>
        
        <CardHeader className="pt-12 pb-6">
          <div className="flex justify-center mb-6">
             <div className="relative">
                <div className="absolute -inset-4 bg-sky-500/10 rounded-full blur-xl animate-pulse"></div>
                <div className="relative h-20 w-20 rounded-[28px] bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-xl shadow-sky-500/20 active:scale-95 transition-transform">
                    <Send className="h-10 w-10 text-white -ml-1 mt-1" />
                </div>
             </div>
          </div>
          <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Customer Service</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mt-2">
            24/7 Priority Support Node
          </CardDescription>
        </CardHeader>

        <div className="px-8 pb-10 space-y-6">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase">
                    Connect with our official telegram representative for payment audits, account verification, and technical assistance.
                </p>
            </div>

            <Button asChild className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-sky-500/20 active:scale-95 transition-all">
                <Link href={telegramLink} target="_blank">
                    Open Telegram Support
                </Link>
            </Button>
            
            <div className="flex items-center justify-center gap-2 opacity-30">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span className="text-[8px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
            </div>
        </div>
        
        <div className="bg-slate-50 py-3 border-t">
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Flex Pay Network Integrity</p>
        </div>
      </Card>
    </div>
  );
}
