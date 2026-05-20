"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHelpPage = pathname === '/help';

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (isHelpPage) {
    return <>{children}</>;
  }

  return (
      <div className="md:bg-slate-100 flex min-h-screen items-center justify-center">
        <div className={cn(
          "relative mx-auto flex min-h-screen w-full flex-col items-center justify-start md:min-h-[850px] md:max-w-md md:rounded-[2.5rem] md:shadow-2xl md:overflow-hidden",
          "auth-layout transition-all duration-500"
        )}>
          <header className="z-20 flex w-full items-center justify-between p-6 bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0">
            <Logo className="text-xl" />
            <LanguageSwitcher />
          </header>
          
          <main className="flex w-full flex-1 flex-col items-center px-6 pt-10 pb-12 z-10 overflow-y-auto">
            {children}
          </main>

          <footer className="w-full p-6 text-center z-10 bg-black/20 backdrop-blur-sm border-t border-white/5">
             <p className="text-[10px] text-white/40 font-bold tracking-[0.2em] uppercase">Secured by Flex Shield v4.0</p>
          </footer>
        </div>
      </div>
  );
}