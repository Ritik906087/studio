'use client';

import { Card, CardContent } from '@/components/ui/card';
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
  BadgeCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={cn('border bg-white shadow-sm rounded-2xl overflow-hidden', className)}>
    {children}
  </Card>
);

export default function MyPage() {
  const { user, profile, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currency, setCurrency] = useState<'FP' | 'INR'>('FP');
  const { setLanguage, translations } = useLanguage();

  const actionItems = [
    { icon: Wallet, label: translations.collection, href: "/my/collection" },
    { icon: Lock, label: translations.paymentPassword, href: "/my/change-password" },
    { icon: ScrollText, label: translations.transaction, href: "/my/transactions" },
    { icon: Settings, label: translations.settings, href: "/my/settings" },
  ];

  const listItems = [
      { icon: HelpCircle, label: translations.helpCenter, href: "/help" },
      { icon: PlaySquare, label: "Tutorial", href: "/my/tutorial" },
      { icon: Globe, label: translations.language },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'UID Copied!' });
    });
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: 'Logged out successfully' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen text-foreground pb-24 bg-slate-50">
      <header className="flex items-center justify-between bg-white p-4 border-b sticky top-0 z-50">
        <div className="w-8"></div>
        <Logo className="text-xl" />
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary">
          <Link href="/download">
            <Download className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      <main className="space-y-4 p-4">
        <Link href="/my/settings" className="block">
          <GlassCard className="border-none shadow-md">
            <CardContent className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                      <AvatarImage src={defaultAvatarUrl} />
                      <AvatarFallback className="bg-primary text-white font-bold">
                        {loading ? <Skeleton className="h-16 w-16 rounded-full" /> : (profile?.displayName?.charAt(0) || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <BadgeCheck className="h-5 w-5 text-blue-500 fill-blue-50" />
                    </div>
                 </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{loading ? <Skeleton className="h-6 w-32" /> : (profile?.displayName || 'Flex User')}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-100 cursor-pointer" onClick={(e) => {e.preventDefault(); profile && copyToClipboard(profile.numericId)}}>
                    {loading ? <Skeleton className="h-4 w-20" /> : <><span>ID: {profile?.numericId || '...'}</span><Copy className="h-3 w-3" /></>}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </CardContent>
          </GlassCard>
        </Link>
        
        <Card className="border-none bg-primary text-white shadow-xl shadow-blue-200 rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-white/70 text-sm font-bold uppercase tracking-wider">{translations.totalBalance}</p>
                  <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">VERIFIED</div>
                </div>
                 {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : 
                 <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black">{profile?.balance?.toFixed(2) || '0.00'}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-1 p-1 h-auto text-lg font-black text-white hover:bg-white/10 hover:text-white">
                          <span>{currency}</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-24 bg-white text-primary border-none shadow-xl font-bold">
                        <DropdownMenuItem onSelect={() => setCurrency('FP')}>FP</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setCurrency('INR')}>INR</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
                 }
                <div className="flex justify-between text-xs text-white/60 font-bold border-t border-white/10 pt-4">
                    <span className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        <span>HOLD: {loading ? "..." : (profile?.holdBalance || 0).toFixed(2)}</span>
                    </span>
                    <span>1 FP = ₹1.00</span>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
            <Link href="/rewards" className="block">
              <GlassCard className="border-blue-100 hover:border-primary transition-colors">
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-4">
                      <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center shadow-inner">
                        <Award className="h-6 w-6 text-yellow-600"/>
                      </div>
                      <span className="font-bold text-sm text-slate-700">{translations.rewards}</span>
                  </CardContent>
              </GlassCard>
            </Link>
            <Link href="/my/team" className="block">
              <GlassCard className="border-blue-100 hover:border-primary transition-colors">
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-4">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center shadow-inner">
                        <Users className="h-6 w-6 text-primary"/>
                      </div>
                      <span className="font-bold text-sm text-slate-700">{translations.team}</span>
                  </CardContent>
              </GlassCard>
            </Link>
        </div>

        <GlassCard>
            <CardContent className="grid grid-cols-4 gap-y-6 gap-x-2 p-6 text-center">
                {actionItems.map(item => (
                  <Link href={item.href} key={item.label} className="flex flex-col items-center gap-3 group">
                      <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                        <item.icon className="h-6 w-6 text-slate-600 group-hover:text-white" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 group-hover:text-primary">{item.label}</span>
                  </Link>
                ))}
            </CardContent>
        </GlassCard>
        
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Services</h3>
          <GlassCard className="p-1">
              <CardContent className="p-0">
                  <Sheet>
                    <SheetTrigger asChild>
                      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Gift className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-bold text-slate-700 text-sm">{translations.newUserReward}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300" />
                      </div>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-3xl border-none shadow-2xl">
                        <SheetHeader className="text-center pb-6">
                            <SheetTitle className="text-xl font-black text-slate-800">{translations.newUserReward}</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-3 pb-8">
                            <Link href="/my/new-user-rewards" className="block bg-slate-50 p-5 rounded-2xl hover:bg-blue-50 transition-colors border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                          <Gift className="h-6 w-6 text-primary" />
                                        </div>
                                        <span className="font-bold text-slate-700">Newbie Rewards</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300" />
                                </div>
                            </Link>
                            <Link href="/my/newbie-friend-rewards" className="block bg-slate-50 p-5 rounded-2xl hover:bg-blue-50 transition-colors border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                          <Users className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <span className="font-bold text-slate-700">Friend Referral</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300" />
                                </div>
                            </Link>
                        </div>
                    </SheetContent>
                  </Sheet>

                  <Sheet>
                    <SheetTrigger asChild>
                      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Flag className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-bold text-slate-700 text-sm">{translations.report}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300" />
                      </div>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-3xl border-none shadow-2xl">
                      <SheetHeader className="text-center pb-6">
                        <SheetTitle className="text-xl font-black text-slate-800">{translations.reportCenter}</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-3 pb-8">
                        <Link href="/my/report-problem" className="block bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <FileQuestion className="h-6 w-6 text-primary" />
                              <span className="font-bold text-slate-700">{translations.reportingAProblem}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300" />
                          </div>
                        </Link>
                        <Link href="/my/report-status" className="block bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <FileClock className="h-6 w-6 text-primary" />
                              <span className="font-bold text-slate-700">{translations.checkReportStatus}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300" />
                          </div>
                        </Link>
                        <Link href="/my/feedback" className="block bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <MessageSquareText className="h-6 w-6 text-primary" />
                              <span className="font-bold text-slate-700">{translations.feedback}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300" />
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
                              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <item.icon className="h-5 w-5 text-primary" />
                                  </div>
                                  <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300" />
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl font-bold">
                              <DropdownMenuItem onSelect={() => setLanguage('en')}>English</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setLanguage('hi')}>हिंदी</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setLanguage('ur')}>اردو</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      }

                      return (
                          <Link href={item.href || "#"} key={item.label}>
                              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <item.icon className="h-5 w-5 text-primary" />
                                      </div>
                                      <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-slate-300" />
                              </div>
                          </Link>
                      );
                  })}
              </CardContent>
          </GlassCard>
        </div>

        <Button onClick={handleLogout} variant="outline" className="w-full h-14 border-red-100 text-red-500 font-black text-base hover:bg-red-50 rounded-2xl shadow-sm mt-4">
            <LogOut className="h-5 w-5 mr-2"/>
            {translations.logout}
        </Button>
        <p className="text-center text-[10px] text-slate-400 font-bold tracking-widest pt-4">PLATFORM SECURED BY FLEX GUARD</p>
      </main>
    </div>
  );
}