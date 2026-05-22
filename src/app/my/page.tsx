'use client';

import React from 'react';
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
  BadgeCheck,
  CreditCard,
  Trophy,
  Flag,
  PlayCircle,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

const ServiceTile = ({ icon: Icon, title, subtitle, href, iconColor }: any) => (
  <Link href={href || "#"}>
    <div className="flex items-center justify-between p-4 group active:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 leading-none">{title}</h4>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </div>
  </Link>
);

export default function MyPage() {
  const { profile, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: 'Logged out' });
      router.push('/login');
    } catch (error) {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-full bg-[#F5F7FB] pb-10">
      <header className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <Logo className="scale-75 origin-left" />
        <div className="flex items-center gap-3">
          <Link href="/my/settings" className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="px-5 pt-2 space-y-5">
        {/* PROFILE COMPACT */}
        <Card className="border-none bg-white shadow-sm rounded-[24px] overflow-hidden border border-slate-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-teal-50">
                  <AvatarImage src={defaultAvatarUrl} />
                  <AvatarFallback className="bg-teal-500 text-white">F</AvatarFallback>
                </Avatar>
                <BadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 text-teal-500 fill-teal-50" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 tracking-tight">
                  Hi, {profile?.displayName || 'Flex User'}
                </h2>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>ID: {profile?.numericId || '00000000'}</span>
                  <Copy className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-200" />
          </CardContent>
        </Card>

        {/* BALANCE CARD */}
        <Card className="border-none balance-gradient text-white rounded-[24px] shadow-lg shadow-teal-500/10 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-[9px] font-black uppercase tracking-widest">Total Wallet</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black tabular-nums tracking-tighter">
                    ₹{profile?.balance?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-[10px] font-bold opacity-60">FP</span>
                </div>
              </div>
              <Wallet className="h-6 w-6 text-white/40" />
            </div>

            <div className="mt-6 flex justify-between items-center border-t border-white/10 pt-4">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-white/50" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">HOLD: ₹{profile?.holdBalance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">VERIFIED</div>
            </div>
          </CardContent>
        </Card>

        {/* ACTION GRID */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/rewards" className="bg-white p-4 rounded-[20px] shadow-sm flex flex-col gap-2 active:scale-95 transition-transform border border-slate-50">
            <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center"><Gift className="h-4 w-4 text-orange-500" /></div>
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Rewards</p>
              <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">Claim extra FP</p>
            </div>
          </Link>
          <Link href="/my/team" className="bg-white p-4 rounded-[20px] shadow-sm flex flex-col gap-2 active:scale-95 transition-transform border border-slate-50">
            <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="h-4 w-4 text-blue-500" /></div>
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">My Team</p>
              <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">Grow network</p>
            </div>
          </Link>
        </div>

        {/* QUICK SERVICES */}
        <Card className="border-none bg-white shadow-sm rounded-[24px] overflow-hidden border border-slate-100">
          <CardContent className="p-0 divide-y divide-slate-50">
            <ServiceTile icon={CreditCard} title="Payments" subtitle="Manage UPI & Bank IDs" href="/my/collection" iconColor="bg-teal-50 text-teal-500" />
            <ServiceTile icon={Lock} title="Security" subtitle="Change passwords" href="/my/change-password" iconColor="bg-blue-50 text-blue-500" />
            <ServiceTile icon={Trophy} title="Daily Tasks" subtitle="Exclusive rewards" href="/rewards" iconColor="bg-orange-50 text-orange-500" />
            <ServiceTile icon={Flag} title="Report" subtitle="Issue support center" href="/my/report-problem" iconColor="bg-red-50 text-red-500" />
            <ServiceTile icon={Globe} title="History" subtitle="View all transactions" href="/my/transactions" iconColor="bg-sky-50 text-sky-500" />
          </CardContent>
        </Card>

        {/* LOGOUT */}
        <div className="py-4 space-y-4">
          <Button onClick={handleLogout} variant="outline" className="w-full h-12 border-red-100 text-red-500 font-bold text-sm rounded-[18px] flex items-center justify-center gap-2 active:bg-red-50">
            <LogOut className="h-4 w-4" />
            Logout Account
          </Button>
          <div className="text-center">
            <p className="text-[9px] text-slate-300 font-black tracking-widest uppercase">Secured by Flex Shield v4.0</p>
          </div>
        </div>
      </main>
    </div>
  );
}