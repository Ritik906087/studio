'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { History, Zap, ArrowUpToLine, ArrowDownToLine, BadgeCheck, ShieldCheck, Trophy, Clock } from 'lucide-react';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function HomePage() {
  const plugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));
  const { profile } = useUser();

  // Get banners from asset registry
  const banners = PlaceHolderImages.filter(img => img.id.startsWith('banner-'));

  return (
    <div className="flex flex-col text-foreground bg-[#F0F7FF] min-h-full pb-6">
      {/* NO HEADER - START CONTENT IMMEDIATELY */}
      <main className="px-3 pt-2 space-y-3">
        {/* ULTRA-COMPACT BALANCE CARD - BUTTONS REMOVED */}
        <Card className="border-none balance-gradient text-white rounded-[20px] shadow-lg shadow-blue-500/20 overflow-hidden relative">
          <CardContent className="p-4 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-[9px] font-black uppercase tracking-widest">Total Assets</p>
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
          </CardContent>
        </Card>

        {/* PROMO BANNERS CAROUSEL - 1280x719 ASPECT RATIO */}
        <Carousel className="w-full" plugins={[plugin.current]}>
          <CarouselContent>
            {banners.length > 0 ? banners.map((banner) => (
              <CarouselItem key={banner.id}>
                <Card className="overflow-hidden rounded-2xl border-none shadow-sm relative w-full aspect-[1280/719]">
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
            )) : (
              // Fallback if registry fails
              [1, 2, 3, 4].map((i) => (
                <CarouselItem key={i}>
                  <Card className="overflow-hidden rounded-2xl border-none shadow-sm w-full aspect-[1280/719] bg-slate-200 animate-pulse" />
                </CarouselItem>
              ))
            )}
          </CarouselContent>
        </Carousel>

        {/* QUICK SERVICES GRID - UPDATED ICONS */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-blue-50">
          <div className="grid grid-cols-4 gap-1 text-center">
             {[
               { label: 'Buy', icon: ArrowUpToLine, color: 'bg-blue-50 text-blue-600', href: '/buy' },
               { label: 'Sell', icon: ArrowDownToLine, color: 'bg-sky-50 text-sky-600', href: '/sell' },
               { label: 'History', icon: Clock, color: 'bg-indigo-50 text-indigo-600', href: '/order' },
               { label: 'Rewards', icon: Trophy, color: 'bg-orange-50 text-orange-600', href: '/rewards' },
             ].map((item, idx) => (
               <Link key={idx} href={item.href} className="flex flex-col items-center gap-1 group">
                 <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border border-white shadow-sm transition-all active:scale-90", item.color)}>
                    <item.icon className="h-5 w-5" />
                 </div>
                 <span className="text-[9px] font-bold text-slate-600 tracking-tight">{item.label}</span>
               </Link>
             ))}
          </div>
        </div>
      </main>
    </div>
  );
}
