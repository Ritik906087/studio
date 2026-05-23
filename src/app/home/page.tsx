'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
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

        {/* UNIFIED OPERATIONS CENTER (Stats + Actions + Income Detail) */}
        <Card className="border-none bg-white rounded-[28px] shadow-lg shadow-blue-500/5 overflow-hidden ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="p-0">
                {/* 1. Quick Stats Grid */}
                <div className="grid grid-cols-3 p-4 bg-slate-50/40 border-b border-slate-100">
                    <div className="text-center space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Today Buy</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">₹{stats.todayBuy.toLocaleString()}</p>
                    </div>
                    <div className="text-center space-y-0.5 border-x border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Today Sell</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">₹{stats.todaySell.toLocaleString()}</p>
                    </div>
                    <div className="text-center space-y-0.5">
                        <p className="text-[8px] font-black text-teal-500 uppercase tracking-widest">Net Income</p>
                        <p className="text-sm font-black text-teal-600 tabular-nums">₹{stats.totalIncome.toLocaleString()}</p>
                    </div>
                </div>

                {/* 2. Large Action Buttons */}
                <div className="p-4 grid grid-cols-2 gap-3">
                    <Button asChild className="h-20 btn-gradient rounded-[22px] flex flex-col items-center justify-center gap-1.5 shadow-blue-500/30 active:scale-95 transition-all">
                        <Link href="/buy">
                            <ArrowUpToLine className="h-6 w-6" />
                            <span className="text-[12px] font-black uppercase tracking-tight">Recharge</span>
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-20 border-2 border-emerald-100 bg-emerald-50/30 text-emerald-600 rounded-[22px] flex flex-col items-center justify-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 transition-all">
                        <Link href="/sell">
                            <ArrowDownToLine className="h-6 w-6" />
                            <span className="text-[12px] font-black uppercase tracking-tight">Withdraw</span>
                        </Link>
                    </Button>
                </div>

                {/* 3. Total Income Detail Bar (Vault Summary) */}
                <Link href="/my/transactions" className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white active:bg-slate-950 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <Zap className="h-4 w-4 text-teal-400 fill-teal-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Profits Vault</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <p className="text-base font-black text-white tabular-nums">₹{stats.totalIncome.toFixed(2)}</p>
                                <span className="text-[7px] font-bold text-teal-500 uppercase">Available</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="text-[8px] font-black uppercase tracking-widest">History</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                </Link>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}