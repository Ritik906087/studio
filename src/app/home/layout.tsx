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
    <div className="home-layout relative min-h-screen w-full font-body text-foreground">
      <main className="pb-14">{children}</main>
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
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
                    : 'text-gray-500 hover:text-primary'
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
