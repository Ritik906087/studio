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
  Globe,
  KeyRound
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
          <p className="text-[9px] text-slate-400 mt-1 font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
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
    <div className="min-h-full bg-[#F0F7FF] pb-24 no-scrollbar">
      <main className="px-3 pt-2 space-y-3">
        <div className="flex items-center justify-between bg-white p-3 rounded-[20px] border border-blue-50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-blue-100 shadow-sm">
                <AvatarImage src={defaultAvatarUrl} />
                <AvatarFallback className="bg-blue-500 text-white">F</AvatarFallback>
              </Avatar>
              <BadgeCheck className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-blue-500 fill-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-black text-slate-800 leading-tight">
                {profile?.displayName || 'Flex User'}
              </h2>
              <div 
                className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider cursor-pointer active:opacity-50 mt-0.5"
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

        <Card className="border-none balance-gradient text-white rounded-[20px] shadow-lg shadow-blue-500/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-[9px] font-black uppercase tracking-widest">Total Assets</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black tabular-nums tracking-tighter">
                    ₹{profile?.balance?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-[10px] font-bold opacity-60">FP</span>
                </div>
              </div>
              <Wallet className="h-6 w-6 text-white/30" />
            </div>

            <div className="mt-3 flex justify-between items-center border-t border-white/10 pt-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-white/50" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">HOLD: ₹{profile?.holdBalance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">Secured</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/rewards" className="bg-white p-3 rounded-[16px] shadow-sm flex items-center gap-2 active:scale-95 transition-transform border border-blue-50">
            <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0"><Gift className="h-4 w-4 text-orange-500" /></div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Rewards</p>
          </Link>
          <Link href="/my/team" className="bg-white p-3 rounded-[16px] shadow-sm flex items-center gap-2 active:scale-95 transition-transform border border-blue-50">
            <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Users className="h-4 w-4 text-blue-500" /></div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">My Team</p>
          </Link>
        </div>

        <div className="bg-white shadow-sm rounded-[20px] overflow-hidden border border-blue-50 divide-y divide-slate-50">
          <ServiceTile icon={CreditCard} title="Account" subtitle="Linked Payment IDs" href="/my/collection" iconColor="bg-blue-50 text-blue-500" />
          <ServiceTile icon={KeyRound} title="Security" subtitle="Update Login Password" href="/my/change-password" iconColor="bg-sky-50 text-sky-600" />
          <ServiceTile icon={Lock} title="Reset Access" subtitle="Forgot Login Password" href="/forgot-password" iconColor="bg-indigo-50 text-indigo-500" />
          <ServiceTile icon={Trophy} title="Missions" subtitle="Newbie starter rewards" href="/my/new-user-rewards" iconColor="bg-orange-50 text-orange-500" />
          <ServiceTile icon={Flag} title="Audit Support" subtitle="Report a payment problem" href="/my/report-problem" iconColor="bg-red-50 text-red-500" />
          <ServiceTile icon={Globe} title="History" subtitle="Ledger & Activity logs" href="/my/transactions" iconColor="bg-indigo-50 text-indigo-500" />
        </div>

        <div className="pt-4 pb-12">
          <Button onClick={handleLogout} variant="outline" className="w-full h-11 border-red-50 text-red-500 font-bold text-[11px] rounded-[16px] flex items-center justify-center gap-2 active:bg-red-50 uppercase tracking-wide">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
          <div className="text-center mt-4">
            <p className="text-[8px] text-slate-300 font-black tracking-widest uppercase">Flex Pay Network Integrity v4.0</p>
          </div>
        </div>
      </main>
    </div>
  );
}
