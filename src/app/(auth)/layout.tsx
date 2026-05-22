"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHelpPage = pathname === '/help';
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;
  if (isHelpPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white md:bg-slate-100 p-0">
      <div className={cn(
        "relative flex h-screen w-full flex-col items-center justify-start md:h-[844px] md:max-w-[390px] md:rounded-[3rem] md:shadow-2xl overflow-hidden bg-white auth-layout",
      )}>
        <header className="z-20 flex w-full items-center justify-between p-5 bg-white/40 backdrop-blur-sm">
          <Logo className="scale-75 origin-left" />
          <LanguageSwitcher />
        </header>
        
        <main className="flex w-full flex-1 flex-col items-center px-6 py-4 z-10 overflow-y-auto no-scrollbar">
          {children}
        </main>

        <footer className="w-full p-4 text-center z-10 border-t bg-white/20">
          <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Secured by Flex Shield v4.0</p>
        </footer>
      </div>
    </div>
  );
}