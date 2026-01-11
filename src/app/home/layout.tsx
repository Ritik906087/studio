"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListOrdered, Award, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/order', icon: ListOrdered, label: 'Order' },
    { href: '/rewards', icon: Award, label: 'Rewards' },
    { href: '/my', icon: User, label: 'My' },
  ];

  return (
    <div className="relative min-h-screen w-full font-body text-foreground">
      <main className="pb-16">{children}</main>
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/20 bg-white/10 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] backdrop-blur-lg">
        <nav className="flex h-14 items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 text-xs transition-colors',
                  isActive
                    ? 'font-bold text-primary'
                    : 'text-white/80 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </footer>
    </div>
  );
}
