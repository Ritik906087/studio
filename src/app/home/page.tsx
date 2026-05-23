
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { ArrowUpToLine, ArrowDownToLine, BadgeCheck, TrendingUp, Wallet, ArrowRight, Zap, Target } from 'lucide-react';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export default function HomePage() {
  const plugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));
  const { user, profile } = useUser();
  const firestore = useFirestore();

  const [stats, setStats] = useState({ todayBuy: 0, todaySell: 0, totalIncome: 0 });

  useEffect(() => {
    if (!user || !firestore) return;

    async function fetchStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        // Today Buy
        const buyQ = query(collection(firestore, 'users', user.uid, 'orders'), where('createdAt', '>=', todayTimestamp), where('status', '==', 'completed'));
        const buySnap = await getDocs(buyQ);
        const todayBuy = buySnap.docs.reduce((acc, d) => acc + (d.data().baseAmount || 0), 0);

        // Today Sell
        const sellQ = query(collection(firestore, 'users', user.uid, 'sellOrders'), where('createdAt', '>=', todayTimestamp), where('status', '==', 'completed'));
        const sellSnap = await getDocs(sellQ);
        const todaySell = sellSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);

        // Total Income (Rewards + Bonuses)
        const incomeQ = query(collection(firestore, 'users', user.uid, 'transactions'), where('type', 'in', ['team_bonus', 'daily_task', 'new_user_reward']));
        const incomeSnap = await getDocs(incomeQ);
        const totalIncome = incomeSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);

        setStats({ todayBuy, todaySell, totalIncome });
    }

    fetchStats();
  }, [user, firestore]);

  const banners = PlaceHolderImages.filter(img => img.id.startsWith('banner-'));

  return (
    <div className="flex flex-col text-foreground bg-[#F5F7FB] min-h-full pb-10">
      <main className="px-3 pt-3 space-y-4">
        {/* COMPACT BALANCE CARD */}
        <Card className="border-none balance-gradient text-white rounded-[24px] shadow-xl shadow-blue-500/10 overflow-hidden relative">
          <CardContent className="p-5 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]">Total Liquidity</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-3xl font-black tabular-nums tracking-tighter">
                    ₹{profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">FP</span>
                </div>
              </div>
              <div className="bg-white/10 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border border-white/10 flex items-center gap-1.5 backdrop-blur-md">
                <BadgeCheck className="h-3 w-3 text-blue-300" />
                Verified
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PROMO BANNERS CAROUSEL */}
        <Carousel className="w-full" plugins={[plugin.current]}>
          <CarouselContent>
            {banners.map((banner) => (
              <CarouselItem key={banner.id}>
                <Card className="overflow-hidden rounded-[20px] border-none shadow-sm relative w-full aspect-[1280/719] bg-white ring-1 ring-slate-100">
                  {banner.imageUrl && (
                    <Image 
                      src={banner.imageUrl} 
                      alt={banner.description} 
                      fill
                      className="object-cover" 
                      data-ai-hint={banner.imageHint}
                      priority
                    />
                  )}
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* PERFORMANCE CONSOLE (Today Stats) */}
        <div className="bg-white rounded-[24px] p-4 shadow-sm ring-1 ring-slate-100 grid grid-cols-3 gap-3">
             <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><TrendingUp className="h-2 w-2" /> Today Buy</p>
                <p className="text-sm font-black text-slate-800 tabular-nums">₹{stats.todayBuy.toLocaleString()}</p>
             </div>
             <div className="space-y-1 border-x px-3">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><TrendingUp className="h-2 w-2 rotate-180 text-red-400" /> Today Sell</p>
                <p className="text-sm font-black text-slate-800 tabular-nums">₹{stats.todaySell.toLocaleString()}</p>
             </div>
             <div className="space-y-1 text-right">
                <p className="text-[8px] font-black text-teal-500 uppercase tracking-widest flex items-center gap-1 justify-end"><Zap className="h-2 w-2 fill-teal-500" /> Income</p>
                <p className="text-sm font-black text-teal-600 tabular-nums">₹{stats.totalIncome.toLocaleString()}</p>
             </div>
        </div>

        {/* LARGE ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
            <Link href="/buy" className="group">
                <div className="h-20 rounded-[24px] bg-white border border-blue-100 shadow-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all active:bg-blue-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5"><ArrowUpToLine className="h-10 w-10" /></div>
                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <ArrowUpToLine className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Recharge</span>
                </div>
            </Link>
            <Link href="/sell" className="group">
                <div className="h-20 rounded-[24px] bg-white border border-emerald-100 shadow-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all active:bg-emerald-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5"><ArrowDownToLine className="h-10 w-10" /></div>
                    <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                        <ArrowDownToLine className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Withdraw</span>
                </div>
            </Link>
        </div>

        {/* TOTAL INCOME HIGHLIGHT */}
        <Card className="border-none bg-slate-900 text-white rounded-[24px] overflow-hidden relative shadow-lg shadow-slate-900/10">
            <div className="absolute top-0 right-0 p-5 opacity-5"><Target className="h-24 w-24" /></div>
            <CardContent className="p-5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                        <Wallet className="h-6 w-6 text-teal-400" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Commission Vault</p>
                        <p className="text-xl font-black text-white tabular-nums mt-0.5">₹{stats.totalIncome.toFixed(2)}</p>
                    </div>
                </div>
                <Button asChild size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 text-white">
                    <Link href="/my/transactions"><ArrowRight className="h-5 w-5" /></Link>
                </Button>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
