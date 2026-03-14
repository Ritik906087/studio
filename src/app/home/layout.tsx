
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, History, UserPlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/context/language-context';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';


export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { translations } = useLanguage();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{ sessionId?: string }>(userProfileRef);

  useEffect(() => {
    // Session validation logic
    if (userProfile && userProfile.sessionId) {
      const localSessionId = localStorage.getItem('user-session-id');
      // If there's a local session ID and it doesn't match the one from the database,
      // it means a new login has occurred on another device.
      if (localSessionId && localSessionId !== userProfile.sessionId) {
        const auth = getAuth();
        signOut(auth).then(() => {
          localStorage.removeItem('user-session-id');
          document.cookie = 'firebase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          toast({
            variant: 'destructive',
            title: 'Session Expired',
            description: 'You have logged in on another device.',
          });
          // Use window.location to force a full refresh to clear all state
          window.location.href = '/login';
        });
      }
    }
  }, [userProfile, router, toast]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems = [
    { href: '/home', icon: Home, label: translations.navHome },
    { href: '/order', icon: History, label: translations.navOrderHistory },
    { href: '/invite', icon: UserPlus, label: translations.navInvite },
    { href: '/my', icon: User, label: translations.navMy },
  ];

  if (!isMounted) {
    return (
      <div className="home-layout md:bg-gray-200">
        <div className="relative mx-auto flex min-h-screen w-full flex-col items-center justify-center bg-background md:max-w-md md:shadow-lg">
          <Loader size="md" />
        </div>
      </div>
    );
  }

  const noNavRoutes = [
    '/buy',
    '/sell',
    '/my/team',
    '/my/report-problem',
    '/my/report-status',
    '/my/feedback',
    '/my/collection',
    '/my/change-password',
    '/my/transactions',
    '/my/settings',
    '/my/new-user-rewards',
    '/my/newbie-friend-rewards',
    '/my/tutorial',
  ];

  const showNavBar = !noNavRoutes.some(route => pathname.startsWith(route));

  return (
    <div className="home-layout md:bg-gray-200">
      <div className="relative mx-auto flex min-h-screen w-full flex-col bg-background md:max-w-md md:shadow-lg">
        <main className={cn("flex-grow", showNavBar ? "pb-14" : "")}>{children}</main>
        {showNavBar && (
          <footer className="fixed bottom-0 z-50 w-full border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:absolute md:max-w-md">
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
        )}
      </div>
    </div>
  );
}
