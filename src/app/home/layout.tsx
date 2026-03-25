

"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, History, UserPlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/context/language-context';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';


export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { translations } = useLanguage();
  const { user, session } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<{sessionId?: string} | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        const { data } = await supabase.from('users').select('sessionId').eq('uid', user.id).single();
        setUserProfile(data);
      }
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    // Session validation logic
    if (userProfile && userProfile.sessionId && session) {
      // Custom session handling might be needed if you want single-device login
    }
  }, [userProfile, session, router, toast]);

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
