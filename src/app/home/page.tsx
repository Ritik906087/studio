'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import {
  History,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Bell
} from 'lucide-react';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Logo } from '@/components/logo';

export default function HomePage() {
  const plugin = React.useRef(Autoplay({ delay: 3500, stopOnInteraction: false }));
  const { profile } = useUser();

  return (
    <div className="flex flex-col text-foreground bg-[#F5F7FB] min-h-full">
      {/* APP HEADER */}
      <header className="flex items-center justify-between px-5 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <Logo className="scale-75 origin-left" />
        <div className="flex items-center gap-2">
           <button className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
              <Bell className="h-4 w-4" />
           </button>
           <Link href="/my" className="h-9 w-9 rounded-full bg-teal-50 flex items-center justify-center text-primary border border-teal-100">
              <TrendingUp className="h-4 w-4" />
           </Link>
        </div>
      </header>

      <main className="p-4 space-y-5">
        {/* COMPACT BALANCE CARD */}
        <Card className="border-none balance-gradient text-white rounded-[24px] shadow-lg shadow-teal-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Zap className="h-24 w-24" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Flex Points</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-3xl font-black tabular-nums">{profile?.balance?.toFixed(2) || '0.00'}</p>
                  <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">FP</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/buy" className="flex items-center justify-center gap-2 bg-white text-primary font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform">
                <ArrowUpRight className="h-3.5 w-3.5" />
                ADD FUNDS
              </Link>
              <Link href="/sell" className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white font-bold text-xs py-2.5 rounded-xl border border-white/10 active:scale-95 transition-transform">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                WITHDRAW
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* COMPACT BANNER */}
        <Carousel className="w-full" plugins={[plugin.current]}>
          <CarouselContent>
            {[1, 2, 3].map((i) => (
              <CarouselItem key={i}>
                <Card className="overflow-hidden rounded-2xl border-none shadow-sm ring-1 ring-slate-100">
                  <Image src={`https://picsum.photos/seed/${i+50}/600/200`} alt="Banner" width={600} height={200} className="w-full object-cover h-24" data-ai-hint="fintech banner" />
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* QUICK SERVICES GRID */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quick Access</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
             {[
               { label: 'Buy FP', icon: ArrowUpRight, color: 'bg-teal-50 text-teal-600', href: '/buy' },
               { label: 'Sell FP', icon: ArrowDownLeft, color: 'bg-emerald-50 text-emerald-600', href: '/sell' },
               { label: 'History', icon: History, color: 'bg-blue-50 text-blue-600', href: '/order' },
               { label: 'Rewards', icon: Zap, color: 'bg-amber-50 text-amber-600', href: '/rewards' },
             ].map((item, idx) => (
               <Link key={idx} href={item.href} className="flex flex-col items-center gap-2">
                 <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border border-white shadow-sm transition-all active:scale-90", item.color)}>
                    <item.icon className="h-5 w-5" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-600 tracking-tight">{item.label}</span>
               </Link>
             ))}
          </div>
        </div>

        {/* ANNOUNCEMENT CARD */}
        <Card className="border-none bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
           <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                 <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                 <h4 className="font-bold text-sm text-slate-800">FlexPay v4.0 is here!</h4>
                 <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Experience 3x faster withdrawals and 100% automated deposits with FlexShield Protection.</p>
              </div>
           </div>
        </Card>
      </main>
    </div>
  );
}