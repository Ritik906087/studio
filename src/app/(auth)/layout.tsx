"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import Image from 'next/image';
import { LanguageProvider } from '@/context/language-context';
import { useState, useEffect } from 'react';

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

  return (
    <LanguageProvider>
      <div className="md:bg-gray-200">
        <div className="auth-layout relative mx-auto flex min-h-screen w-full flex-col items-center justify-start p-4 pt-24 pb-12 md:max-w-md md:shadow-lg">
          <header className="absolute top-0 flex w-full max-w-md items-center justify-between p-6">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/InShot_20260110_205628399.png?alt=media&token=5d466aa9-095b-495f-92e8-95f3b59b4367"
              width={60}
              height={60}
              alt="Decorative corner image"
              className="opacity-80"
            />
            {!isHelpPage && <LanguageSwitcher />}
          </header>
          <main className="flex w-full max-w-md flex-col items-center">
            {!isHelpPage && <Logo className="mb-6 text-2xl font-bold" />}
            {children}
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
