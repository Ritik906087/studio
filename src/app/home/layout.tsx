"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListOrdered, Award, User, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/order', icon: ListOrdered, label: 'Order' },
    { href: '/scan', icon: QrCode, label: 'Scan', isCentral: true },
    { href: '/rewards', icon: Award, label: 'Rewards' },
    { href: '/my', icon: User, label: 'My' },
  ];

  return (
    <div className="relative min-h-screen w-full bg-background font-body">
      <main className="pb-20">{children}</main>
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
        <nav className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            if (item.isCentral) {
              return (
                <div key={item.href} className="-mt-8">
                  <Button
                    asChild
                    variant="default"
                    className="h-16 w-16 rounded-full btn-gradient shadow-lg shadow-primary/40"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-8 w-8" />
                    </Link>
                  </Button>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 text-sm transition-colors',
                  isActive
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground hover:text-primary'
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
