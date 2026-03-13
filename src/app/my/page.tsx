

'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ChevronRight,
  Copy,
  Star,
  Lock,
  ScrollText,
  Settings,
  LogOut,
  HelpCircle,
  Users,
  Globe,
  ChevronDown,
  Award,
  Gift,
  Wallet,
  Download,
  Flag,
  FileQuestion,
  FileClock,
  MessageSquareText,
  PlaySquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-context';


const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <Card
    className={cn(
      'border bg-white shadow-sm',
      className
    )}
  >
    {children}
  </Card>
);

export default function MyPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [currency, setCurrency] = useState<'LGB' | 'INR'>('LGB');
  const { language, setLanguage, translations } = useLanguage();

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: profileLoading } = useDoc<{ displayName: string; photoURL?: string; balance: number; holdBalance: number; numericId: string; claimedUserRewards?: string[] }>(userProfileRef);

  const actionItems = [
    { icon: Wallet, label: translations.collection, href: "/my/collection" },
    { icon: Lock, label: translations.paymentPassword },
    { icon: ScrollText, label: translations.transaction, href: "/my/transactions" },
    { icon: Settings, label: translations.settings, href: "/my/settings" },
  ]

  const listItems = [
      { icon: HelpCircle, label: translations.helpCenter, href: "/help" },
      { icon: PlaySquare, label: "Tutorial", href: "/my/tutorial" },
      { icon: Globe, label: translations.language },
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'UID Copied!' });
    });
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // Clear the auth token cookie
      document.cookie = 'firebase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      toast({ title: 'Logged out successfully' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  const showNewUserRewardButton = !profileLoading;


  return (
    <div className="min-h-screen text-foreground pb-24">
      {/* Header */}
      <header className="flex items-center justify-between bg-white p-4">
        <div className="w-8"></div>
        <Logo className="text-xl" />
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/download">
            <Download className="h-5 w-5 text-muted-foreground" />
          </Link>
        </Button>
      </header>

      <main className="space-y-4 p-4">
        {/* User Info */}
        <Link href="/my/settings">
          <GlassCard>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                 <Avatar className="h-12 w-12 border-2 border-yellow-400">
                  <AvatarImage src={defaultAvatarUrl} />
                  <AvatarFallback className="bg-yellow-400 text-yellow-900 font-bold">
                     {profileLoading ? <Skeleton className="h-12 w-12 rounded-full" /> : (userProfile?.displayName?.charAt(0) || 'A')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold">{profileLoading ? <Skeleton className="h-5 w-24" /> : (userProfile?.displayName || '...')}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer" onClick={(e) => {e.preventDefault(); userProfile && copyToClipboard(userProfile.numericId)}}>
                    {profileLoading ? <Skeleton className="h-4 w-20 mt-1" /> : <><span>UID:{userProfile?.numericId || '...'}</span><Copy className="h-3 w-3" /></>}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </GlassCard>
        </Link>
        
        {/* Asset Card */}
        <Card className="border-none bg-slate-800 text-white shadow-lg">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-end text-xs">
                    <span className="rounded-full bg-yellow-500/30 px-2 py-0.5 text-yellow-300">LV0</span>
                </div>
                <p className="text-sm text-white/70">{translations.totalBalance}</p>
                 {profileLoading ? <Skeleton className="h-8 w-32 bg-slate-700" /> : 
                 <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{userProfile?.balance?.toFixed(2) || '0.00'}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-1 p-1 h-auto text-lg font-medium text-white hover:bg-white/10 hover:text-white">
                          <span>{currency}</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-24 bg-slate-700 text-white border-slate-600">
                        <DropdownMenuItem onSelect={() => setCurrency('LGB')}>LGB</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setCurrency('INR')}>INR</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
                 }
                <div className="flex justify-between text-sm text-white/70 items-center">
                    <span className="flex items-baseline gap-1">
                        <span className="text-xs">{translations.hold}</span>
                        {profileLoading ? <Skeleton className="h-4 w-10 bg-slate-700"/> : <span>≈ {(userProfile?.holdBalance || 0).toFixed(2)}</span>}
                    </span>
                    <span className="text-xs">1LG≈ 1INR</span>
                </div>
            </CardContent>
        </Card>

        {/* Reward/Team Center */}
        <div className="grid grid-cols-2 gap-4">
            <Link href="/rewards" className="block">
              <GlassCard>
                  <CardContent className="flex items-center justify-center gap-2 p-3">
                      <Award className="h-5 w-5 text-yellow-400"/>
                      <span className="font-semibold">{translations.rewards}</span>
                  </CardContent>
              </GlassCard>
            </Link>
            <Link href="/my/team" className="block">
              <GlassCard>
                  <CardContent className="flex items-center justify-center gap-2 p-3">
                      <Users className="h-5 w-5 text-primary"/>
                      <span className="font-semibold">{translations.team}</span>
                  </CardContent>
              </GlassCard>
            </Link>
        </div>

        {/* Actions Grid */}
        <GlassCard>
            <CardContent className="grid grid-cols-4 gap-y-6 gap-x-2 p-4 text-center">
                {actionItems.map(item => {
                    const content = (
                      <div className="flex flex-col items-center gap-2">
                          <item.icon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                    );
                    
                    if (item.href) {
                      return <Link href={item.href} key={item.label}>{content}</Link>
                    }

                    return <div key={item.label} className="flex flex-col items-center gap-2 cursor-pointer">{content}</div>;
                })}
            </CardContent>
        </GlassCard>
        
        {/* List Items */}
        <GlassCard>
            <CardContent className="p-2">
                {showNewUserRewardButton && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Gift className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{translations.newUserReward}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl">
                        <SheetHeader className="text-center pb-4">
                            <SheetTitle>{translations.newUserReward}</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-3">
                            <Link href="/my/new-user-rewards" className="block">
                                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary cursor-pointer border">
                                <div className="flex items-center gap-4">
                                    <Gift className="h-6 w-6 text-primary" />
                                    <span className="font-semibold">Newbie Reward</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                            </Link>
                            <Link href="/my/newbie-friend-rewards" className="block">
                                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary cursor-pointer border">
                                <div className="flex items-center gap-4">
                                    <Users className="h-6 w-6 text-primary" />
                                    <span className="font-semibold">Newbie Friend Reward</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                            </Link>
                        </div>
                    </SheetContent>
                  </Sheet>
                )}

                <Sheet>
                  <SheetTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Flag className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{translations.report}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader className="text-center pb-4">
                      <SheetTitle>{translations.reportCenter}</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-3">
                      <Link href="/my/report-problem" className="block">
                        <div className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary cursor-pointer border">
                          <div className="flex items-center gap-4">
                            <FileQuestion className="h-6 w-6 text-primary" />
                            <span className="font-semibold">{translations.reportingAProblem}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </Link>
                      <Link href="/my/report-status" className="block">
                        <div className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary cursor-pointer border">
                          <div className="flex items-center gap-4">
                            <FileClock className="h-6 w-6 text-primary" />
                            <span className="font-semibold">{translations.checkReportStatus}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </Link>
                      <Link href="/my/feedback" className="block">
                        <div className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary cursor-pointer border">
                          <div className="flex items-center gap-4">
                            <MessageSquareText className="h-6 w-6 text-primary" />
                            <span className="font-semibold">{translations.feedback}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </Link>
                    </div>
                  </SheetContent>
                </Sheet>

                {listItems.map(item => {
                    if (item.label === translations.language) {
                      return (
                        <DropdownMenu key={item.label}>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer">
                              <div className="flex items-center gap-3">
                                <item.icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{item.label}</span>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setLanguage('en')}>English</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setLanguage('hi')}>हिंदी</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setLanguage('ur')}>اردو</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    }

                    const content = (
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer">
                            <div className="flex items-center gap-3">
                                <item.icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{item.label}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                    );

                    if (item.href) {
                        return <Link href={item.href} key={item.label}>{content}</Link>;
                    }

                    return <div key={item.label}>{content}</div>;
                })}
            </CardContent>
        </GlassCard>

        {/* Logout Button */}
        <Button onClick={handleLogout} className="w-full h-12 bg-yellow-400 text-yellow-900 font-bold text-base hover:bg-yellow-500 rounded-lg">
            <LogOut className="h-5 w-5 mr-2"/>
            {translations.logout}
        </Button>
      </main>
    </div>
  );
}
