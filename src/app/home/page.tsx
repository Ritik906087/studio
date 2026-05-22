
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { History, Zap, ArrowUpRight, ArrowDownLeft, BadgeCheck, Bell, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

export default function HomePage() {
  const plugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));
  const { profile } = useUser();

  return (
    <div className="flex flex-col text-foreground bg-[#F5F7FB] min-h-full pb-4">
      {/* COMPACT TOP STRIP */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm italic">F</span>
          </div>
          <span className="font-black text-base tracking-tighter uppercase text-slate-800">Flex<span className="text-primary font-light not-italic">Pay</span></span>
        </div>
        <div className="flex items-center gap-3">
           <button className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
              <Bell className="h-4 w-4" />
           </button>
           <Link href="/my" className="h-8 w-8 rounded-full bg-white overflow-hidden border border-slate-100 shadow-sm">
              <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec" width={32} height={32} alt="Profile" />
           </Link>
        </div>
      </div>

      <main className="px-3 space-y-3">
        {/* COMPACT BALANCE CARD */}
        <Card className="border-none balance-gradient text-white rounded-[24px] shadow-lg shadow-teal-500/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <Zap className="h-16 w-16" />
          </div>
          <CardContent className="p-4 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]">Total Balance</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <p className="text-2xl font-black tabular-nums tracking-tighter">
                    ₹{profile?.balance?.toFixed(2) || '0.00'}
                  </p>
                  <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">FP</span>
                </div>
              </div>
              <div className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-white/10 flex items-center gap-1">
                <BadgeCheck className="h-2.5 w-2.5" />
                Verified
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/buy" className="flex items-center justify-center gap-1.5 bg-white text-teal-600 font-black text-[11px] py-2.5 rounded-xl active:scale-95 transition-transform shadow-sm">
                <ArrowUpRight className="h-3.5 w-3.5" />
                RECHARGE
              </Link>
              <Link href="/sell" className="flex items-center justify-center gap-1.5 bg-white/10 backdrop-blur-md text-white font-black text-[11px] py-2.5 rounded-xl border border-white/10 active:scale-95 transition-transform">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                WITHDRAW
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* MINI BANNER */}
        <Carousel className="w-full" plugins={[plugin.current]}>
          <CarouselContent>
            {[1, 2, 3].map((i) => (
              <CarouselItem key={i}>
                <Card className="overflow-hidden rounded-2xl border-none shadow-sm ring-1 ring-slate-100">
                  <Image src={`https://picsum.photos/seed/${i+60}/600/180`} alt="Banner" width={600} height={180} className="w-full object-cover h-16" data-ai-hint="payment banner" />
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* QUICK SERVICES GRID */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100/50">
          <div className="grid grid-cols-4 gap-2 text-center">
             {[
               { label: 'Buy', icon: ArrowUpRight, color: 'bg-blue-50 text-blue-600', href: '/buy' },
               { label: 'Sell', icon: ArrowDownLeft, color: 'bg-teal-50 text-teal-600', href: '/sell' },
               { label: 'History', icon: History, color: 'bg-indigo-50 text-indigo-600', href: '/order' },
               { label: 'Rewards', icon: Zap, color: 'bg-orange-50 text-orange-600', href: '/rewards' },
             ].map((item, idx) => (
               <Link key={idx} href={item.href} className="flex flex-col items-center gap-1.5 group">
                 <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border border-white shadow-sm transition-all active:scale-90", item.color)}>
                    <item.icon className="h-5 w-5" />
                 </div>
                 <span className="text-[9px] font-bold text-slate-600 tracking-tight">{item.label}</span>
               </Link>
             ))}
          </div>
        </div>

        {/* ANNOUNCEMENT */}
        <Card className="border-none bg-white rounded-xl shadow-sm border border-slate-100 p-3">
           <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                 <ShieldCheck className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                 <h4 className="font-bold text-[11px] text-slate-800 leading-none">P2P Security Active</h4>
                 <p className="text-[9px] text-slate-400 mt-1 truncate font-medium">Auto-rotation engine protecting your trades.</p>
              </div>
              <ArrowUpRight className="h-3 w-3 text-slate-300 ml-auto" />
           </div>
        </Card>
      </main>
    </div>
  );
}
