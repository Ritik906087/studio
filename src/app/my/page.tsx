'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { 
  ChevronRight, 
  Copy, 
  Lock, 
  History, 
  Settings, 
  LogOut, 
  HelpCircle, 
  Users, 
  Gift, 
  Wallet, 
  Bell,
  BadgeCheck,
  CreditCard,
  Trophy,
  Flag,
  PlayCircle,
  Globe,
  CircleArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

const ServiceTile = ({ icon: Icon, title, subtitle, href, iconColor }: any) => (
  <Link href={href || "#"}>
    <div className="flex items-center justify-between p-4 group active:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-[15px] font-semibold text-slate-800 leading-none">{title}</h4>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
    </div>
  </Link>
);

export default function MyPage() {
  const { user, profile, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { translations } = useLanguage();

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
    <div className="min-h-screen bg-[#F5F7FB] pb-32">
      {/* TOP HEADER */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Logo className="scale-90 origin-left" />
        <div className="flex items-center gap-3">
          <button className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      <main className="px-5 pt-4 space-y-5">
        {/* PROFILE CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-none bg-white shadow-sm rounded-[24px] overflow-hidden">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-teal-50 shadow-sm">
                    <AvatarImage src={defaultAvatarUrl} />
                    <AvatarFallback className="bg-teal-500 text-white font-bold">
                      {profile?.displayName?.charAt(0) || 'F'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <BadgeCheck className="h-5 w-5 text-teal-500 fill-teal-50" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {loading ? <Skeleton className="h-6 w-24" /> : `Hi, ${profile?.displayName || 'Flex User'}`}
                  </h2>
                  <div 
                    className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-semibold cursor-pointer active:opacity-60 transition-opacity"
                    onClick={() => profile && copyToClipboard(profile.numericId)}
                  >
                    <span>ID: {profile?.numericId || '00000000'}</span>
                    <Copy className="h-3 w-3 text-slate-400" />
                  </div>
                </div>
              </div>
              <CircleArrowRight className="h-6 w-6 text-slate-200" />
            </CardContent>
          </Card>
        </motion.div>

        {/* BALANCE CARD */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none balance-gradient text-white rounded-[24px] shadow-xl shadow-teal-900/10 overflow-hidden relative">
            {/* Wave Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="h-full w-full" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,100 C150,200 250,0 400,100 L400,200 L0,200 Z" fill="white" />
              </svg>
            </div>
            
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Total Balance</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black tabular-nums tracking-tighter">
                      ₹{loading ? '---' : (profile?.balance || 0).toFixed(2)}
                    </span>
                    <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold">FP</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                  <Wallet className="h-7 w-7 text-white" />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <div className="flex justify-between items-center border-t border-white/10 pt-4">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <Lock className="h-3 w-3" />
                    <span className="text-[11px] font-bold">HOLD: ₹{(profile?.holdBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-emerald-400/20 px-2 py-0.5 rounded text-[9px] font-black border border-emerald-400/30 flex items-center gap-1">
                    <div className="h-1 w-1 bg-emerald-400 rounded-full animate-pulse"></div>
                    VERIFIED
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-white/50">
                   <p>CONVERSION: 1 FP = ₹1.00</p>
                   <p>SECURE WALLET</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ACTION CARDS */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/rewards">
            <Card className="border-none bg-white shadow-sm rounded-[24px] hover:shadow-md transition-all active:scale-95">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Gift className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Rewards</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Earn exciting rewards</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/my/team">
            <Card className="border-none bg-white shadow-sm rounded-[24px] hover:shadow-md transition-all active:scale-95">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Team</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Invite friends & grow</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* QUICK ACTION GRID */}
        <Card className="border-none bg-white shadow-sm rounded-[24px]">
          <CardContent className="p-0 grid grid-cols-4 divide-x divide-slate-50">
            {[
              { icon: CreditCard, label: "Payment", href: "/my/collection" },
              { icon: Lock, label: "Security", href: "/my/change-password" },
              { icon: History, label: "History", href: "/my/transactions" },
              { icon: Settings, label: "Settings", href: "/my/settings" },
            ].map((item, idx) => (
              <Link key={idx} href={item.href} className="flex flex-col items-center gap-2.5 py-6 group active:bg-slate-50 transition-colors">
                <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* SERVICES SECTION */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">Services</h3>
          <Card className="border-none bg-white shadow-sm rounded-[24px] overflow-hidden">
            <CardContent className="p-0 divide-y divide-slate-50">
              <ServiceTile 
                icon={Trophy} 
                title="Newbie Rewards" 
                subtitle="Exclusive tasks for new members" 
                href="/my/new-user-rewards"
                iconColor="bg-orange-50 text-orange-500"
              />
              <ServiceTile 
                icon={Flag} 
                title="Report" 
                subtitle="Reporting a problem or issue" 
                href="/my/report-problem"
                iconColor="bg-red-50 text-red-500"
              />
              <ServiceTile 
                icon={HelpCircle} 
                title="Help Center" 
                subtitle="Get instant 24/7 support" 
                href="/help"
                iconColor="bg-teal-50 text-teal-500"
              />
              <ServiceTile 
                icon={PlayCircle} 
                title="Tutorial" 
                subtitle="Learn how to use FlexPay" 
                href="/my/tutorial"
                iconColor="bg-indigo-50 text-indigo-500"
              />
              <ServiceTile 
                icon={Globe} 
                title="Language" 
                subtitle="Change your preferred language" 
                href="#"
                iconColor="bg-cyan-50 text-cyan-500"
              />
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM SECTION */}
        <div className="pt-4 pb-8 space-y-6">
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="w-full h-14 border-red-50 text-red-500 font-bold text-[15px] hover:bg-red-50 rounded-[18px] shadow-sm flex items-center justify-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Logout Account
          </Button>
          <div className="text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-black tracking-[0.3em] uppercase">Secured by Flex Guard v4.2</p>
            <p className="text-[9px] text-slate-300 font-medium">Licensed Financial Platform</p>
          </div>
        </div>
      </main>
    </div>
  );
}