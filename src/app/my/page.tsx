"use client";

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  X,
  ChevronRight,
  Copy,
  ShieldCheck,
  Star,
  Lock,
  MessageSquareWarning,
  ScrollText,
  BookUser,
  Book,
  FileText,
  Settings,
  Megaphone,
  LifeBuoy,
  Globe,
  PartyPopper,
  LogOut,
  HelpCircle,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import React from 'react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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

const actionItems = [
    { icon: ShieldCheck, label: "Real-name" },
    { icon: Star, label: "Collection" },
    { icon: Lock, label: "Payment Password" },
    { icon: MessageSquareWarning, label: "My Appeal" },
    { icon: ScrollText, label: "Transaction" },
    { icon: BookUser, label: "User Guidelines" },
    { icon: Book, label: "Buying Tutorial" },
    { icon: FileText, label: "Selling Tutorial" },
    { icon: Settings, label: "Settings" },
]

const listItems = [
    { icon: Megaphone, label: "Announcement" },
    { icon: ShieldCheck, label: "Security Center" },
    { icon: HelpCircle, label: "Help Center" },
    { icon: Globe, label: "Language" },
    { icon: PartyPopper, label: "Activity" },
]


export default function MyPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{ displayName: string; photoURL?: string; balance: number; numericId: string }>(userProfileRef);

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // Remove the cookie on logout
      document.cookie = 'firebase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      toast({ title: 'Logged out successfully' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };


  return (
    <div className="min-h-screen text-foreground pb-24">
      {/* Header */}
      <header className="flex items-center justify-between bg-white p-4">
        <div className="w-8"></div>
        <Logo className="text-xl" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Link href="/home">
              <X className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="space-y-4 p-4">
        {/* User Info */}
        <Link href="/my/settings">
          <GlassCard>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                 <Avatar className="h-12 w-12 border-2 border-yellow-400">
                  <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName} />
                  <AvatarFallback className="bg-yellow-400 text-yellow-900 font-bold">
                    {userProfile?.displayName?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold">{userProfile?.displayName || '...'}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>UID:{userProfile?.numericId || '...'}</span>
                    <Copy className="h-3 w-3" />
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
                <p className="text-sm text-white/70">Total Asset Valuation</p>
                <p className="text-2xl font-bold">{userProfile?.balance?.toFixed(2) || '0.00'} LGB</p>
                <div className="flex justify-between text-sm text-white/70">
                    <span>≈ 0.00</span>
                    <span>0.00</span>
                </div>
            </CardContent>
        </Card>

        {/* Reward/Team Center */}
        <div className="grid grid-cols-2 gap-4">
            <GlassCard>
                <CardContent className="flex items-center justify-center gap-2 p-3">
                    <Star className="h-5 w-5 text-yellow-400"/>
                    <span className="font-semibold">Reward Card</span>
                </CardContent>
            </GlassCard>
            <GlassCard>
                <CardContent className="flex items-center justify-center gap-2 p-3">
                    <Users className="h-5 w-5 text-primary"/>
                    <span className="font-semibold">Team Center</span>
                </CardContent>
            </GlassCard>
        </div>

        {/* Actions Grid */}
        <GlassCard>
            <CardContent className="grid grid-cols-3 gap-y-6 gap-x-2 p-4 text-center">
                {actionItems.map(item => (
                    <div key={item.label} className="flex flex-col items-center gap-2">
                        <item.icon className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                ))}
            </CardContent>
        </GlassCard>

        {/* List Items */}
        <GlassCard>
            <CardContent className="p-2">
                {listItems.map(item => (
                     <div key={item.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary">
                        <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                ))}
            </CardContent>
        </GlassCard>

        {/* Logout Button */}
        <Button onClick={handleLogout} className="w-full h-12 bg-yellow-400 text-yellow-900 font-bold text-base hover:bg-yellow-500 rounded-lg">
            <LogOut className="h-5 w-5 mr-2"/>
            Logout
        </Button>
      </main>
    </div>
  );
}
