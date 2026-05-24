
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, PlaySquare, CircleDollarSign, Trophy, Sparkles, Zap, BadgeCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, getDocs, query, collection, where, arrayUnion, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Progress } from '@/components/ui/progress';

const TelegramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
    </svg>
);

const MK_LOGO = "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png";

const newbieTasksList = [
    { id: 'nb_telegram', title: 'Subscribe Official', desc: 'Join telegram channel', icon: <TelegramIcon />, action: "go", href: "https://t.me/+LNEKI3SSaUU2NWE9" },
    { id: 'nb_tutorial', title: 'Beginner Guide', desc: 'Watch tutorial video', icon: <PlaySquare className="h-5 w-5 text-blue-500" />, action: "go", href: "/my/tutorial" },
    { id: 'nb_upi', title: 'Payment Binding', desc: 'Link MobiKwik wallet', icon: <div className="h-6 w-6 rounded-lg bg-white p-0.5 shadow-sm border border-slate-50 flex items-center justify-center overflow-hidden">{MK_LOGO && <Image src={MK_LOGO} alt="MK" width={22} height={22} />}</div>, action: "go", href: "/my/collection/add" },
    { id: 'nb_purchase', title: 'Trade Milestone', desc: 'Total trade reached 1000', icon: <CircleDollarSign className="h-5 w-5 text-orange-500" />, action: 'go', href: '/buy', goal: 1000 },
];

const FINAL_REWARD_ID = 'nb_final_reward';
const FINAL_REWARD_AMOUNT = 1500;

export default function NewbieRewardsPage() {
    const { user, profile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isClaimingFinal, setIsClaimingFinal] = useState(false);
    const [taskStatus, setTaskStatus] = useState<Record<string, boolean>>({});
    const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});

    const checkTaskCompletion = useCallback(async () => {
        if (!user || !profile || !firestore) return;
        
        const claimed = new Set(profile.claimedUserRewards || []);
        const status: Record<string, boolean> = {};
        const progress: Record<string, number> = {};

        const isUpiLinked = (profile.paymentMethods || []).length > 0;
        if (isUpiLinked && !claimed.has('nb_upi')) {
            updateDoc(doc(firestore, 'users', user.uid), { claimedUserRewards: arrayUnion('nb_upi') }).catch(() => {});
        }
        status['nb_upi'] = isUpiLinked;
        
        const ordersQuery = query(collection(firestore, 'users', user.uid, 'orders'), where('status', '==', 'completed'));
        const ordersSnap = await getDocs(ordersQuery);
        const totalPurchaseAmount = ordersSnap.docs.reduce((sum, d) => sum + (d.data().baseAmount || d.data().amount || 0), 0);
        
        const hasPurchased = totalPurchaseAmount >= 1000;
        if (hasPurchased && !claimed.has('nb_purchase')) {
            updateDoc(doc(firestore, 'users', user.uid), { claimedUserRewards: arrayUnion('nb_purchase') }).catch(() => {});
        }
        status['nb_purchase'] = hasPurchased;
        progress['nb_purchase'] = totalPurchaseAmount;

        status['nb_telegram'] = claimed.has('nb_telegram');
        status['nb_tutorial'] = claimed.has('nb_tutorial');
        status[FINAL_REWARD_ID] = claimed.has(FINAL_REWARD_ID);

        setTaskStatus(status);
        setTaskProgress(progress);
    }, [user, profile, firestore]);

    useEffect(() => {
        if (profile) checkTaskCompletion();
    }, [profile, checkTaskCompletion]);

    const handleSimpleTask = async (taskId: string, href: string) => {
        if (!user || !firestore) return;
        try {
            await updateDoc(doc(firestore, 'users', user.uid), { claimedUserRewards: arrayUnion(taskId) });
            if (href.startsWith('http')) window.open(href, '_blank');
            else if (href && href !== '#') router.push(href);
        } catch (e) {}
    };
    
    const handleFinalClaim = async () => {
        if (!user || !firestore || isClaimingFinal) return;
        setIsClaimingFinal(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.uid);
                const userSnap = await transaction.get(userRef);
                const data = userSnap.data();
                if (data?.claimedUserRewards?.includes(FINAL_REWARD_ID)) throw new Error("Claimed");
                
                transaction.update(userRef, {
                    balance: (data?.balance || 0) + FINAL_REWARD_AMOUNT,
                    claimedUserRewards: arrayUnion(FINAL_REWARD_ID)
                });
                const txRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
                transaction.set(txRef, {
                    userId: user.uid, amount: FINAL_REWARD_AMOUNT, type: 'new_user_reward',
                    description: 'Newbie Mission Reward', createdAt: serverTimestamp(), orderId: `MISSION${Date.now()}`
                });
            });
            toast({ title: `₹${FINAL_REWARD_AMOUNT} Credited!` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Claim Failed' });
        } finally { setIsClaimingFinal(false); }
    };
    
    if (userLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader size="md" /></div>;

    const allTasksCompleted = newbieTasksList.every(task => taskStatus[task.id]);
    const isFinalRewardClaimed = taskStatus[FINAL_REWARD_ID];
    const completedCount = Object.values(taskStatus).filter(Boolean).length;

    return (
        <div className="flex flex-col h-screen bg-[#F5F7FB] overflow-hidden">
          <header className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white border-b sticky top-0 z-50">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
              <Link href="/my"><ChevronLeft className="h-5 w-5" /></Link>
            </Button>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Mission Center</h1>
          </header>

          <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
            {/* HERO VOUCHER CARD */}
            <Card className="border-none balance-gradient text-white rounded-[32px] shadow-xl shadow-blue-500/20 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500"><Trophy className="h-32 w-32" /></div>
                <CardContent className="p-7 relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md border border-white/10">
                             <Sparkles className="h-6 w-6 text-yellow-300" />
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Starter Bonus</p>
                             <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Global Live</span>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-5xl font-black tracking-tighter flex items-baseline gap-2">
                            {FINAL_REWARD_AMOUNT}<span className="text-lg font-bold opacity-70">FP</span>
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100/60">Unlock premium beginner reward</p>
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-blue-200">Progress</p>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-700" style={{ width: `${(completedCount / newbieTasksList.length) * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-black">{completedCount}/{newbieTasksList.length}</span>
                            </div>
                         </div>
                         
                         {allTasksCompleted ? (
                            isFinalRewardClaimed ? (
                                <div className="bg-white/10 px-4 py-2 rounded-xl font-black text-[10px] uppercase border border-white/20 flex items-center gap-2">
                                    <BadgeCheck className="h-3.5 w-3.5" /> Received
                                </div>
                            ) : (
                                <Button onClick={handleFinalClaim} disabled={isClaimingFinal} className="bg-white text-blue-600 hover:bg-white/90 font-black text-[11px] uppercase h-10 px-6 rounded-xl animate-bounce shadow-xl">Claim 1500 FP</Button>
                            )
                        ) : (
                            <div className="bg-black/30 backdrop-blur-md text-white/50 font-black text-[9px] px-4 py-2 rounded-xl border border-white/5 uppercase tracking-widest flex items-center gap-2">
                                <Zap className="h-3 w-3" /> Locked
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Training Registry</h3>
                    <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md">Verified Missions</span>
                </div>

                <div className="grid gap-3">
                    {newbieTasksList.map((task, idx) => {
                        const isDone = taskStatus[task.id];
                        return (
                            <div key={task.id} className="group relative overflow-hidden bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.98]">
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-[18px] flex items-center justify-center shrink-0 border transition-colors",
                                            isDone ? "bg-teal-50 border-teal-100" : "bg-slate-50 border-slate-50"
                                        )}>
                                            {task.icon}
                                        </div>
                                        <div>
                                            <p className={cn("text-[13px] font-black uppercase tracking-tight", isDone ? "text-teal-700" : "text-slate-800")}>{task.title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{task.desc}</p>
                                            
                                            {task.goal && !isDone && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(((taskProgress[task.id] || 0) / task.goal) * 100, 100)}%` }} />
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400">₹{taskProgress[task.id] || 0}/{task.goal}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => isDone ? null : (task.goal ? router.push(task.href) : handleSimpleTask(task.id, task.href))}
                                        className={cn(
                                            "h-9 px-5 rounded-[14px] font-black text-[10px] uppercase shadow-sm border",
                                            isDone 
                                                ? "bg-teal-500 text-white border-none shadow-teal-500/20" 
                                                : "bg-white text-blue-600 border-blue-50 hover:bg-blue-50"
                                        )}
                                    >
                                        {isDone ? <BadgeCheck className="h-4 w-4" /> : "Go"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-5 bg-orange-50/50 rounded-[28px] border border-orange-100 flex gap-4">
                <div className="h-10 w-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-orange-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Important Info</p>
                    <p className="text-[9px] font-bold text-orange-700/70 uppercase leading-relaxed tracking-tight">
                        Rewards are processed via our secure network. Completed missions automatically unlock the final 1500 FP pool injection.
                    </p>
                </div>
            </div>
            
            <div className="text-center pb-8 opacity-20">
                <Zap className="h-5 w-5 mx-auto mb-2" />
                <p className="text-[8px] font-black uppercase tracking-[0.4em]">Encrypted Mission Data</p>
            </div>
          </main>
        </div>
    );
}
