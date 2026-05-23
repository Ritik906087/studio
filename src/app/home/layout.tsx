"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, UserPlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/context/language-context';
import { motion } from 'framer-motion';
import { IntelligenceTracker } from '@/components/intelligence-tracker';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { translations } = useLanguage();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/order', icon: History, label: 'History' },
    { href: '/invite', icon: UserPlus, label: 'Invite' },
    { href: '/my', icon: User, label: 'Mine' },
  ];

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader size="md" />
      </div>
    );
  }

  const hideNavOn = ['/confirm', '/report-problem', '/key', '/login', '/register'];
  const showNavBar = !hideNavOn.some(route => pathname.includes(route));

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-0 overflow-hidden font-body">
      <IntelligenceTracker />
      
      <div className="relative flex h-screen w-full flex-col bg-[#F5F7FB] md:h-[844px] md:max-w-[390px] md:rounded-[3rem] md:shadow-2xl md:my-4 overflow-hidden border border-white/50 ring-1 ring-black/5">
        <main className={cn(
          "flex-1 overflow-y-auto no-scrollbar",
          showNavBar ? "pb-16" : ""
        )}>
          {children}
        </main>

        {showNavBar && (
          <div className="fixed bottom-0 left-0 w-full md:absolute z-50">
            <nav className="relative flex h-16 items-center justify-around bg-white border-t border-slate-100 px-2 shadow-[0_-5px_25px_rgba(0,0,0,0.05)] overflow-hidden">
                {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-0.5 p-1 transition-all duration-300 w-14 h-14',
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    )}
                  >
                    {isActive && (
                        <motion.div 
                            layoutId="activeGlow"
                            className="absolute top-0 w-10 h-0.5 bg-blue-600 rounded-b-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                        />
                    )}
                    <div className={cn(
                        "transition-all duration-300",
                        isActive ? "scale-105" : ""
                    )}>
                        <item.icon className={cn("h-4 w-4", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                    </div>
                    <span className={cn(
                        "text-[8px] font-black tracking-tighter uppercase",
                        isActive ? "text-blue-600" : "text-slate-400"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}