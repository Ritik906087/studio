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
    Clock
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
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toFixed(2);
  };

  useEffect(() => {
    if (!user || !firestore) return;

    async function fetchStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();

        try {
            // 1. Fetch ALL completed Buy Orders
            const buyQ = query(collection(firestore, 'users', user.uid, 'orders'), where('status', '==', 'completed'));
            const buySnap = await getDocs(buyQ);
            
            // Filter today's orders for quantity and amount stats
            const todayBuyDocs = buySnap.docs
                .map(d => d.data())
                .filter(d => (d.createdAt?.toMillis ? d.createdAt.toMillis() : 0) >= todayMs);
            
            const buyQuantity = todayBuyDocs.length;
            const todayBuy = todayBuyDocs.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

            // 2. Fetch today's completed Sell Orders
            const sellQ = query(collection(firestore, 'users', user.uid, 'sellOrders'), where('status', '==', 'completed'));
            const sellSnap = await getDocs(sellQ);
            const todaySell = sellSnap.docs
                .map(d => d.data())
                .filter(d => (d.createdAt?.toMillis ? d.createdAt.toMillis() : 0) >= todayMs)
                .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

            // 3. Calculate TOTAL REVENUE (Profit ONLY: Amount Credited - Base Price Paid)
            const totalBuyProfit = buySnap.docs.reduce((acc, d) => {
                const data = d.data();
                const amountCredited = Number(data.amount) || 0;
                // Important: baseAmount is what user paid. If missing, assume 0 profit for that specific record.
                const basePaid = data.baseAmount !== undefined ? Number(data.baseAmount) : amountCredited;
                const profit = amountCredited - basePaid;
                return acc + (profit > 0 ? profit : 0);
            }, 0);

            // 4. Add all other income sources (Team Bonus, Rewards, System Adjustments)
            const incomeQ = query(
              collection(firestore, 'users', user.uid, 'transactions'), 
              where('type', 'in', ['team_bonus', 'daily_task', 'new_user_reward', 'system_adjustment'])
            );
            const incomeSnap = await getDocs(incomeQ);
            const totalRewards = incomeSnap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);

            setStats({ 
                buyQuantity, 
                todayBuy, 
                todaySell, 
                totalIncome: totalBuyProfit + totalRewards 
            });
        } catch (e) {
            console.error("Home stats calculation failed:", e);
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

        {/* PROMO BANNERS CAROUSEL */}
        <div className="w-full">
            <Carousel className="w-full" plugins={[plugin.current]}>
                <CarouselContent>
                    {banners.map((banner) => (
                    <CarouselItem key={banner.id}>
                        <div className="relative w-full aspect-[1536/664] rounded-[20px] overflow-hidden shadow-sm ring-1 ring-slate-100">
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

        {/* OPERATIONS CENTER */}
        <Card className="border-none bg-white rounded-[28px] shadow-lg shadow-blue-500/5 overflow-hidden ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="p-0">
                <div className="p-6 pb-4">
                    <div className="grid grid-cols-2 gap-y-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <ShoppingBag className="h-4 w-4" />
                                <span className="text-sm font-medium">Buy quantity</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.buyQuantity}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <DollarSign className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium">Buy Amount</span>
                            </div>
                            <p className="text-2xl font-black text-yellow-500 tabular-nums">{formatValue(stats.todayBuy)}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Repeat className="h-4 w-4" />
                                <span className="text-sm font-medium">Sell today</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 tabular-nums">{formatValue(stats.todaySell)}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Total revenue</span>
                            </div>
                            <p className="text-2xl font-black text-green-600 tabular-nums">{formatValue(stats.totalIncome)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-3 pb-6">
                    <Button asChild className="h-14 btn-gradient rounded-[18px] flex flex-col items-center justify-center gap-1 shadow-blue-500/20 active:scale-95 transition-all">
                        <Link href="/buy">
                            <ArrowUpToLine className="h-5 w-5" />
                            <span className="text-[11px] font-black uppercase tracking-tight">Buy</span>
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-14 border-2 border-emerald-100 bg-emerald-50/30 text-emerald-600 rounded-[18px] flex flex-col items-center justify-center gap-1 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 transition-all">
                        <Link href="/sell">
                            <ArrowDownToLine className="h-5 w-5" />
                            <span className="text-[11px] font-black uppercase tracking-tight">Sell</span>
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
