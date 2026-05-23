"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, PlaySquare, CircleDollarSign, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
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
const FC_LOGO = "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(3).png";

const MobiKwikFreechargeIcon = () => (
    <div className="flex items-center -space-x-2.5">
        <div className="h-6 w-6 rounded-lg bg-white border border-slate-100 p-1 z-10 shadow-sm flex items-center justify-center overflow-hidden">
            {MK_LOGO && <Image src={MK_LOGO} alt="MK" width={16} height={16} className="object-contain" />}
        </div>
        <div className="h-6 w-6 rounded-lg bg-white border border-slate-100 p-1 z-0 shadow-sm flex items-center justify-center overflow-hidden">
            {FC_LOGO && <Image src={FC_LOGO} alt="FC" width={16} height={16} className="object-contain" />}
        </div>
    </div>
);

const newbieTasksList = [
    { id: 'nb_telegram', title: 'Official Channel', icon: <TelegramIcon />, action: "go", href: "https://t.me/+-W0tnyDk3jBiYjQ1" },
    { id: 'nb_tutorial', title: 'Beginner Guide', icon: <PlaySquare className="h-5 w-5 text-blue-500" />, action: "go", href: "/my/tutorial" },
    { id: 'nb_upi', title: 'Link MobiKwik / Freecharge', icon: <MobiKwikFreechargeIcon />, action: "go", href: "/my/collection/add" },
    { id: 'nb_purchase', title: 'Asset Milestone', icon: <CircleDollarSign className="h-5 w-5 text-orange-500" />, action: 'go', href: '/buy', goal: 1000 },
];

const FINAL_REWARD_ID = 'nb_final_reward';
const FINAL_REWARD_AMOUNT = 200;

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

        const isUpiLinked = profile.paymentMethods?.length > 0;
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
                    description: 'Mission Reward', createdAt: serverTimestamp(), orderId: `MISSION${Date.now()}`
                });
            });
            toast({ title: "₹200 Credited" });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Claim Failed' });
        } finally { setIsClaimingFinal(false); }
    };
    
    if (userLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader size="md" /></div>;

    const allTasksCompleted = newbieTasksList.every(task => taskStatus[task.id]);
    const isFinalRewardClaimed = taskStatus[FINAL_REWARD_ID];

    return (
        <div className="flex min-h-screen flex-col bg-[#F5F7FB]">
          <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-white border-b">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
              <Link href="/my"><ChevronLeft className="h-5 w-5" /></Link>
            </Button>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Mission Center</h1>
          </header>

          <main className="p-3 space-y-4">
            <Card className="border-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[24px] shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="h-24 w-24" /></div>
                <CardContent className="p-5 flex justify-between items-center relative z-10">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Starter Bonus</p>
                        <p className="text-3xl font-black mt-0.5">₹{FINAL_REWARD_AMOUNT}</p>
                    </div>
                     {allTasksCompleted ? (
                        isFinalRewardClaimed ? (
                            <div className="bg-white/10 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase border border-white/20">Received</div>
                        ) : (
                            <Button onClick={handleFinalClaim} disabled={isClaimingFinal} className="bg-white text-blue-600 hover:bg-white/90 font-black text-[10px] uppercase h-8 px-4 rounded-lg animate-pulse shadow-lg">Claim Bonus</Button>
                        )
                    ) : (
                        <div className="bg-black/20 text-white/60 font-black text-[9px] px-3 py-1.5 rounded-lg border border-white/5 uppercase tracking-wider">Locked</div>
                    )}
                </CardContent>
            </Card>
            
            <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Training Missions</p>
                {newbieTasksList.map(task => {
                    const isDone = taskStatus[task.id];
                    return (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-[20px] shadow-sm ring-1 ring-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                                    {task.icon}
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-800 leading-none">{task.title}</p>
                                    {task.goal && (
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Progress value={Math.min(((taskProgress[task.id] || 0) / task.goal) * 100, 100)} className="h-1 w-12" />
                                            <span className="text-[8px] font-bold text-slate-400">₹{taskProgress[task.id] || 0}/{task.goal}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant={isDone ? "ghost" : "secondary"}
                                onClick={() => isDone ? null : (task.goal ? router.push(task.href) : handleSimpleTask(task.id, task.href))}
                                className={cn("h-7 px-4 rounded-lg font-black text-[9px] uppercase", isDone ? "text-teal-600 bg-teal-50" : "bg-slate-100 text-slate-600")}
                            >
                                {isDone ? "Done" : "Go"}
                            </Button>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-orange-50 rounded-[20px] border border-orange-100 flex gap-3">
                <Sparkles className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-orange-800 uppercase leading-relaxed tracking-tight">Complete all 4 missions to unlock the starter liquidity bonus. Verification is instant.</p>
            </div>
          </main>
        </div>
    );
}
