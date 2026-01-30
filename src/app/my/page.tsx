
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader } from '@/components/ui/loader';


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
    { icon: Award, label: "Rewards", href: "/rewards" },
    { icon: Lock, label: "Payment Password" },
    { icon: ScrollText, label: "Transaction", href: "/order" },
    { icon: Settings, label: "Settings", href: "/my/settings" },
]

const listItems = [
    { icon: HelpCircle, label: "Help Center", href: "/help" },
    { icon: Globe, label: "Language" },
]

const NewUserTasksSection = () => {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [claimedUserRewards, setClaimedUserRewards] = useState<string[]>([]);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    const newuserTasks = [
        { id: 'nu1', title: 'Registration reward', reward: 20 },
        { id: 'nu2', title: 'Join Telegram', reward: 20, action: "join" },
        { id: 'nu3', title: 'Connect PhonePe', reward: 10, action: "connect" },
        { id: 'nu4', title: 'Connect Paytm', reward: 10, action: "connect" },
        { id: 'nu5', title: 'Connect MobiKwik', reward: 10, action: "connect" },
    ];

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, loading: profileLoading } = useDoc<{ balance: number, paymentMethods?: { name: string }[], claimedUserRewards?: string[] }>(userProfileRef);

    const fetchClaimedRewards = useCallback(() => {
        if (userProfile) {
            setClaimedUserRewards(userProfile.claimedUserRewards || []);
        }
        setDataLoading(false);
    }, [userProfile]);

    useEffect(() => {
        fetchClaimedRewards();
    }, [fetchClaimedRewards]);

    const handleClaimNewUserReward = async (taskId: string, reward: number, taskTitle: string) => {
        if (!user || !firestore || !userProfileRef) return;
        setClaiming(taskId);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userProfileRef);
                if (!userDoc.exists()) throw new Error("User not found");
                const userData = userDoc.data();
                
                const alreadyClaimed = (userData.claimedUserRewards || []).includes(taskId);
                if (alreadyClaimed) throw new Error("Reward already claimed.");

                const newBalance = (userData.balance || 0) + reward;
                const newClaimedRewards = [...(userData.claimedUserRewards || []), taskId];
                
                transaction.update(userProfileRef, { 
                    balance: newBalance,
                    claimedUserRewards: newClaimedRewards 
                });
            });

             await addDoc(collection(firestore, 'users', user.uid, 'transactions'), {
                userId: user.uid,
                amount: reward,
                description: `New User: ${taskTitle}`,
                createdAt: serverTimestamp()
            });

            toast({ title: "Reward Claimed!", description: `₹${reward} has been added to your balance.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: error.message || 'Failed to claim reward.' });
        } finally {
            setClaiming(null);
        }
    }

    const loading = userLoading || profileLoading || dataLoading;

     if (loading) {
        return (
            <GlassCard>
                 <CardContent className="p-4 flex items-center justify-center min-h-[120px]">
                    <Loader size="sm" />
                </CardContent>
            </GlassCard>
        )
    }

    return (
        <GlassCard>
            <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary"/>
                    New User Rewards
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
                {newuserTasks.map(task => {
                    const isClaimed = claimedUserRewards.includes(task.id);
                    const upiName = task.action === 'connect' ? task.title.split(' ')[1] : '';
                    const isUpiConnected = !!upiName && userProfile?.paymentMethods?.some(pm => pm.name === upiName);
                    
                    let buttonContent: string;
                    let buttonAction = () => {};
                    let buttonDisabled = true;
                    let useLink = false;
                    let isClaimable = false;

                    if (isClaimed) {
                        buttonContent = 'Claimed';
                    } else if (task.action === 'connect') {
                        if(isUpiConnected) {
                            buttonContent = 'Claim';
                            buttonAction = () => handleClaimNewUserReward(task.id, task.reward, task.title);
                            buttonDisabled = claiming === task.id;
                            isClaimable = true;
                        } else {
                            buttonContent = 'Connect';
                            buttonDisabled = false;
                            useLink = true;
                        }
                    } else { // Join or Registration
                        buttonContent = task.action === 'join' ? 'Join' : 'Claim';
                        buttonAction = () => handleClaimNewUserReward(task.id, task.reward, task.title);
                        buttonDisabled = claiming === task.id;
                        isClaimable = true;
                    }
                    
                    // The registration reward is a special case. It is claimed automatically on registration.
                    // For the UI, we'll assume it's claimable if not in the claimed list yet.
                    if (task.id === 'nu1' && isClaimed) {
                         buttonDisabled = true;
                    } else if (task.id === 'nu1' && !isClaimed) {
                         buttonDisabled = claiming === task.id;
                    }

                    const finalButton = (
                        <Button 
                            size="sm" 
                            className={cn("font-semibold h-7 text-xs px-4", isClaimable && !isClaimed && "btn-gradient")}
                            disabled={buttonDisabled}
                            onClick={buttonAction}
                        >
                            {claiming === task.id ? <Loader size="xs"/> : buttonContent}
                        </Button>
                    );

                    return (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                            <p className="flex-1 font-medium text-sm">{task.title}</p>
                            <p className="font-bold text-base text-green-600 mr-2">₹ {task.reward}</p>
                            {useLink ? (
                                <Link href={'/my/collection'} passHref>
                                   {finalButton}
                                </Link>
                            ) : finalButton}
                        </div>
                    )
                })}
            </CardContent>
        </GlassCard>
    );
};


export default function MyPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [currency, setCurrency] = useState<'LGB' | 'INR'>('LGB');

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: profileLoading } = useDoc<{ displayName: string; photoURL?: string; balance: number; holdBalance: number; numericId: string }>(userProfileRef);

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


  return (
    <div className="min-h-screen text-foreground pb-24">
      {/* Header */}
      <header className="flex items-center justify-between bg-white p-4">
        <div className="w-8"></div>
        <Logo className="text-xl" />
        <div className="w-8"></div>
      </header>

      <main className="space-y-4 p-4">
        {/* User Info */}
        <Link href="/my/settings">
          <GlassCard>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                 <Avatar className="h-12 w-12 border-2 border-yellow-400">
                  <AvatarImage src={userProfile?.photoURL} />
                  <AvatarFallback className="bg-yellow-400 text-yellow-900 font-bold">
                     {profileLoading ? <Skeleton className="h-12 w-12 rounded-full" /> : (userProfile?.displayName?.charAt(0) || 'A')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold">{profileLoading ? <Skeleton className="h-5 w-24" /> : (userProfile?.displayName || '...')}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer" onClick={() => userProfile && copyToClipboard(userProfile.numericId)}>
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
                <p className="text-sm text-white/70">Total Balance</p>
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
                        <span className="text-xs">hold</span>
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
                      <span className="font-semibold">Rewards</span>
                  </CardContent>
              </GlassCard>
            </Link>
            <Link href="/my/team" className="block">
              <GlassCard>
                  <CardContent className="flex items-center justify-center gap-2 p-3">
                      <Users className="h-5 w-5 text-primary"/>
                      <span className="font-semibold">Team</span>
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

        <NewUserTasksSection />

        {/* List Items */}
        <GlassCard>
            <CardContent className="p-2">
                {listItems.map(item => {
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
            Logout
        </Button>
      </main>
    </div>
  );
}
