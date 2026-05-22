'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { 
  ChevronRight, 
  Copy, 
  Lock, 
  Settings, 
  LogOut, 
  Users, 
  Gift, 
  Wallet, 
  BadgeCheck,
  CreditCard,
  Trophy,
  Flag,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

const ServiceTile = ({ icon: Icon, title, subtitle, href, iconColor }: any) => (
  <Link href={href || "#"}>
    <div className="flex items-center justify-between p-3 group active:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-[12px] font-bold text-slate-800 leading-none">{title}</h4>
          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
    </div>
  </Link>
);

export default function MyPage() {
  const { profile } = useUser();
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'UID Copied!' });
    });
  };

  return (
    <div className="min-h-full bg-[#F5F7FB] pb-6">
      <main className="px-3 pt-4 space-y-3">
        {/* PROFILE STRIP */}
        <div className="flex items-center justify-between bg-white p-3 rounded-[20px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-teal-50">
                <AvatarImage src={defaultAvatarUrl} />
                <AvatarFallback className="bg-teal-500 text-white">F</AvatarFallback>
              </Avatar>
              <BadgeCheck className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-teal-500 fill-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 leading-tight">
                {profile?.displayName || 'Flex User'}
              </h2>
              <div 
                className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer active:opacity-50"
                onClick={() => copyToClipboard(profile?.numericId || '')}
              >
                <span>ID: {profile?.numericId || '00000000'}</span>
                <Copy className="h-2 w-2" />
              </div>
            </div>
          </div>
          <Link href="/my/settings" className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:bg-slate-100">
             <Settings className="h-4 w-4" />
          </Link>
        </div>

        {/* BALANCE CARD COMPACT */}
        <Card className="border-none balance-gradient text-white rounded-[20px] shadow-md shadow-teal-500/10 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">Total Assets</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black tabular-nums tracking-tighter">
                    ₹{profile?.balance?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-[9px] font-bold opacity-60">FP</span>
                </div>
              </div>
              <Wallet className="h-5 w-5 text-white/30" />
            </div>

            <div className="mt-3 flex justify-between items-center border-t border-white/10 pt-3">
                <div className="flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5 text-white/50" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">HOLD: ₹{profile?.holdBalance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="bg-white/10 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border border-white/5">Secured</div>
            </div>
          </CardContent>
        </Card>

        {/* MINI ACTION GRID */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/rewards" className="bg-white p-3 rounded-[16px] shadow-sm flex items-center gap-2.5 active:scale-95 transition-transform border border-slate-50">
            <div className="h-7 w-7 bg-orange-50 rounded-lg flex items-center justify-center shrink-0"><Gift className="h-3.5 w-3.5 text-orange-500" /></div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Rewards</p>
          </Link>
          <Link href="/my/team" className="bg-white p-3 rounded-[16px] shadow-sm flex items-center gap-2.5 active:scale-95 transition-transform border border-slate-50">
            <div className="h-7 w-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Users className="h-3.5 w-3.5 text-blue-500" /></div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">My Team</p>
          </Link>
        </div>

        {/* COMPACT SERVICES LIST */}
        <div className="bg-white shadow-sm rounded-[20px] overflow-hidden border border-slate-100 divide-y divide-slate-50">
          <ServiceTile icon={CreditCard} title="Payments" subtitle="UPI & Bank IDs" href="/my/collection" iconColor="bg-teal-50 text-teal-500" />
          <ServiceTile icon={Lock} title="Security" subtitle="Account access" href="/my/change-password" iconColor="bg-blue-50 text-blue-500" />
          <ServiceTile icon={Trophy} title="Newbie Rewards" subtitle="Starter bonuses" href="/my/new-user-rewards" iconColor="bg-orange-50 text-orange-500" />
          <ServiceTile icon={Flag} title="Support" subtitle="Report problem" href="/my/report-problem" iconColor="bg-red-50 text-red-500" />
          <ServiceTile icon={Globe} title="History" subtitle="All transactions" href="/my/transactions" iconColor="bg-sky-50 text-sky-500" />
        </div>

        {/* LOGOUT BUTTON COMPACT */}
        <div className="pt-2 pb-10 space-y-3">
          <Button onClick={handleLogout} variant="outline" className="w-full h-10 border-red-50 text-red-500 font-bold text-[11px] rounded-[16px] flex items-center justify-center gap-2 active:bg-red-50 uppercase tracking-wide">
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
          <div className="text-center">
            <p className="text-[8px] text-slate-300 font-black tracking-widest uppercase">Encrypted by Flex Shield v4.0</p>
          </div>
        </div>
      </main>
    </div>
  );
}
