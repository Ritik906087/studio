
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { 
    ArrowUpToLine, 
    ArrowDownToLine, 
    BadgeCheck, 
    ShoppingBag, 
    DollarSign, 
    Repeat, 
    TrendingUp, 
    ChevronRight 
} from 'lucide-react';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function HomePage() {
  const plugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));
  const { user, profile } = useUser();
  const firestore = useFirestore();

  const [stats, setStats] = useState({ 
    buyQuantity: 0, 
    todayBuy: 0, 
    todaySell: 0, 
    totalIncome: 0 
  });

  const formatValue = (val: number) => {
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toFixed(1);
  };

  useEffect(() => {
    if (!user || !firestore) return;

    async function fetchStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();

        try {
            // Fetch completed Buy Orders
            const buyQ = query(collection(firestore, 'users', user.uid, 'orders'), where('status', '==', 'completed'));
            const buySnap = await getDocs(buyQ);
            const todayBuyDocs = buySnap.docs
                .map(d => d.data())
                .filter(d => (d.createdAt?.toMillis ? d.createdAt.toMillis() : 0) >= todayMs);
            
            const buyQuantity = todayBuyDocs.length;
            const todayBuy = todayBuyDocs.reduce((acc, d) => acc + (d.baseAmount || 0), 0);

            // Fetch completed Sell Orders
            const sellQ = query(collection(firestore, 'users', user.uid, 'sellOrders'), where('status', '==', 'completed'));
            const sellSnap = await getDocs(sellQ);
            const todaySell = sellSnap.docs
                .map(d => d.data())
                .filter(d => (d.createdAt?.toMillis ? d.createdAt.toMillis() : 0) >= todayMs)
                .reduce((acc, d) => acc + (d.amount || 0), 0);

            // Total Income (Rewards + Bonuses)
            const incomeQ = query(collection(firestore, 'users', user.uid, 'transactions'), where('type', 'in', ['team_bonus', 'daily_task', 'new_user_reward']));
            const incomeSnap = await getDocs(incomeQ);
            const totalIncome = incomeSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);

            setStats({ buyQuantity, todayBuy, todaySell, totalIncome });
        } catch (e) {
            console.warn("Stats calculation fell back due to index restriction.");
        }
    }

    fetchStats();
  }, [user, firestore]);

  const banners = PlaceHolderImages.filter(img => img.id.startsWith('banner-'));

  return (
    <div className="flex flex-col text-foreground bg-[#F5F7FB] min-h-full pb-20">
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

        {/* PROMO BANNERS CAROUSEL - ASPECT RATIO 1280:719 */}
        <div className="w-full">
            <Carousel className="w-full" plugins={[plugin.current]}>
                <CarouselContent>
                    {banners.map((banner) => (
                    <CarouselItem key={banner.id}>
                        <div className="relative w-full aspect-[1280/719] rounded-[20px] overflow-hidden shadow-sm ring-1 ring-slate-100">
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
                        </div>
                    </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>

        {/* UNIFIED OPERATIONS CENTER (Image-style Stats + Actions) */}
        <Card className="border-none bg-white rounded-[28px] shadow-lg shadow-blue-500/5 overflow-hidden ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="p-0">
                {/* 1. Dashboard Grid (Matching Request Image) */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-y-6">
                        {/* Buy Quantity */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <ShoppingBag className="h-4 w-4" />
                                <span className="text-sm font-medium">Buy quantity</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.buyQuantity}</p>
                        </div>
                        {/* Buy Amount */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <DollarSign className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium">Buy Amount</span>
                            </div>
                            <p className="text-2xl font-black text-yellow-500 tabular-nums">{formatValue(stats.todayBuy)}</p>
                        </div>
                        {/* Sell Today */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Repeat className="h-4 w-4" />
                                <span className="text-sm font-medium">Sell today</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 tabular-nums">{formatValue(stats.todaySell)}</p>
                        </div>
                        {/* Total Revenue */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Total revenue</span>
                            </div>
                            <p className="text-2xl font-black text-green-600 tabular-nums">{formatValue(stats.totalIncome)}</p>
                        </div>
                    </div>

                    {/* More Link */}
                    <Link href="/order" className="flex items-center justify-center gap-1 text-slate-400 font-medium text-sm pt-2 hover:text-primary transition-colors">
                        More <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* 2. Large Action Buttons */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-3 pb-6">
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
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

