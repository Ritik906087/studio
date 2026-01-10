import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start p-4 pt-24 pb-12">
      <header className="absolute top-0 flex w-full max-w-md items-center justify-between p-6">
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/InShot_20260110_205628399.png?alt=media&token=5d466aa9-095b-495f-92e8-95f3b59b4367"
          width={40}
          height={40}
          alt="Decorative corner image"
          className="opacity-80"
        />
        <LanguageSwitcher />
      </header>
      <main className="flex w-full max-w-md flex-col items-center">
        <Logo className="mb-6 text-2xl font-bold" />
        {children}
      </main>
    </div>
  );
}
