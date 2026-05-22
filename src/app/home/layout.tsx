"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, UserPlus, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/context/language-context';

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
    { href: '/my', icon: User, label: 'Profile' },
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-0 overflow-hidden">
      <div className="relative flex h-screen w-full flex-col bg-[#F5F7FB] md:h-[844px] md:max-w-[390px] md:rounded-[2.5rem] md:shadow-2xl md:my-4 overflow-hidden border border-slate-200/50">
        <main className={cn(
          "flex-1 overflow-y-auto no-scrollbar",
          showNavBar ? "pb-16" : ""
        )}>
          {children}
        </main>

        {showNavBar && (
          <footer className="fixed bottom-0 z-50 w-full md:absolute border-t border-slate-100 bg-white/80 backdrop-blur-lg px-2 shadow-2xl">
            <nav className="flex h-16 items-center justify-around">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 transition-all duration-300',
                      isActive
                        ? 'text-primary scale-105'
                        : 'text-slate-400'
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", isActive ? "fill-primary/10" : "")} />
                    <span className={cn("text-[10px] font-bold tracking-tight uppercase", isActive ? "text-primary" : "text-slate-400")}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </footer>
        )}
      </div>
    </div>
  );
}