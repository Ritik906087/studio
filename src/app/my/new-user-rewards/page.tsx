"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, PlaySquare, CircleDollarSign, Trophy, Sparkles, Zap, BadgeCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, getDocs, query, collection, where, arrayUnion, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { motion, AnimatePresence } from 'framer-motion';

const TelegramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
    </svg>
);

const MK_LOGO = "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png";

const newbieTasksList = [
    { id: 'nb_telegram', title: 'Subscribe Official', desc: 'Join telegram channel', icon: <TelegramIcon />, action: "go", href: "https://t.me/+LNEKI3SSaUU2NWE9" },
    { id: 'nb_tutorial', title: 'Beginner Guide', desc: 'Watch tutorial video', icon: <PlaySquare className="h-5 w-5 text-blue-500" />, action: "go", href: "/my/tutorial" },
    { id: 'nb_upi', title: 'Payment Binding', desc: 'Link verified wallet', icon: <div className="h-6 w-6 rounded-lg bg-white p-0.5 shadow-sm border border-slate-50 flex items-center justify-center overflow-hidden">{MK_LOGO && <Image src={MK_LOGO} alt="MK" width={22} height={22} />}</div>, action: "go", href: "/my/collection/add" },
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
        <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden font-body">
          <header className="shrink-0 flex items-center gap-2 px-4 py-4 bg-white border-b sticky top-0 z-50 shadow-sm">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2 rounded-full bg-slate-50">
              <Link href="/my"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
            </Button>
            <div className="flex flex-col">
                <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mission Center</h1>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Digital Incentive Registry</p>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4">
            {/* NEW PREMIUM VOUCHER CARD */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
            >
                <Card className="border-none balance-gradient text-white rounded-[28px] shadow-2xl shadow-blue-500/20 overflow-hidden relative min-h-[220px]">
                    {/* Decorative cut-outs for voucher look */}
                    <div className="absolute top-1/2 -left-3 h-6 w-6 rounded-full bg-[#F8FAFC] -translate-y-1/2 z-20 shadow-inner" />
                    <div className="absolute top-1/2 -right-3 h-6 w-6 rounded-full bg-[#F8FAFC] -translate-y-1/2 z-20 shadow-inner" />
                    <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-white/20 -translate-y-1/2 z-10" />

                    <CardContent className="p-6 h-full flex flex-col justify-between relative z-0">
                        {/* Voucher Top */}
                        <div className="flex justify-between items-start">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/10">
                                 <Sparkles className="h-5 w-5 text-yellow-300" />
                            </div>
                            <div className="text-right">
                                 <p className="text-[8px] font-black uppercase tracking-[0.25em] text-blue-100/70">Reward Voucher</p>
                                 <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white">Active</span>
                                 </div>
                            </div>
                        </div>

                        {/* Voucher Middle (Amount) */}
                        <div className="text-center py-4">
                            <div className="flex flex-col items-center">
                                <h2 className="text-6xl font-black tracking-tighter flex items-baseline gap-1 drop-shadow-lg">
                                    {FINAL_REWARD_AMOUNT}<span className="text-base font-black opacity-60">FP</span>
                                </h2>
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-100/60 mt-1">Unlock Starter Liquidity</p>
                            </div>
                        </div>

                        {/* Voucher Bottom */}
                        <div className="flex items-center justify-between mt-2 pt-2">
                             <div className="space-y-1">
                                <p className="text-[7px] font-black uppercase tracking-widest text-blue-200">System Progress</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-20 bg-black/20 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-white transition-all duration-700" style={{ width: `${(completedCount / newbieTasksList.length) * 100}%` }} />
                                    </div>
                                    <span className="text-[9px] font-black">{completedCount}/{newbieTasksList.length}</span>
                                </div>
                             </div>
                             
                             {allTasksCompleted ? (
                                isFinalRewardClaimed ? (
                                    <div className="bg-white/10 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase border border-white/20 flex items-center gap-1.5">
                                        <BadgeCheck className="h-3 w-3" /> Received
                                    </div>
                                ) : (
                                    <Button onClick={handleFinalClaim} disabled={isClaimingFinal} className="bg-white text-blue-600 hover:bg-white/90 font-black text-[10px] uppercase h-9 px-4 rounded-xl animate-bounce shadow-xl border-none">
                                        Claim {FINAL_REWARD_AMOUNT} FP
                                    </Button>
                                )
                            ) : (
                                <div className="bg-black/30 backdrop-blur-md text-white/50 font-black text-[8px] px-3 py-1.5 rounded-lg border border-white/5 uppercase tracking-widest flex items-center gap-1.5">
                                    <Zap className="h-2.5 w-2.5" /> Locked
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
            
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incentive Registry</h3>
                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="h-2.5 w-2.5 text-blue-600" />
                        <span className="text-[8px] font-black text-blue-600 uppercase">Verified</span>
                    </div>
                </div>

                <div className="grid gap-2.5">
                    {newbieTasksList.map((task, idx) => {
                        const isDone = taskStatus[task.id];
                        return (
                            <motion.div 
                                key={task.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative overflow-hidden bg-white rounded-[20px] p-3.5 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3.5">
                                        <div className={cn(
                                            "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300",
                                            isDone ? "bg-teal-50 border-teal-100 shadow-inner" : "bg-slate-50 border-slate-50"
                                        )}>
                                            {task.icon}
                                        </div>
                                        <div>
                                            <p className={cn("text-[12px] font-black uppercase tracking-tight", isDone ? "text-teal-700" : "text-slate-800")}>{task.title}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{task.desc}</p>
                                            
                                            {task.goal && !isDone && (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="h-1 w-14 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(((taskProgress[task.id] || 0) / task.goal) * 100, 100)}%` }} />
                                                    </div>
                                                    <span className="text-[7px] font-black text-slate-400 uppercase">Goal: ₹{task.goal}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => isDone ? null : (task.goal ? router.push(task.href) : handleSimpleTask(task.id, task.href))}
                                        className={cn(
                                            "h-8 px-4 rounded-xl font-black text-[9px] uppercase shadow-sm border transition-all",
                                            isDone 
                                                ? "bg-teal-500 text-white border-none shadow-teal-500/20" 
                                                : "bg-white text-blue-600 border-blue-50 hover:bg-blue-50 active:bg-blue-100"
                                        )}
                                    >
                                        {isDone ? <BadgeCheck className="h-3.5 w-3.5" /> : "Go"}
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <div className="p-4 bg-orange-50/50 rounded-[24px] border border-orange-100 flex gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5"><Sparkles className="h-10 w-10 text-orange-500" /></div>
                <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200 shadow-sm">
                    <Info className="h-4 w-4 text-orange-600" />
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-orange-800 uppercase tracking-widest">Protocol Rules</p>
                    <p className="text-[8px] font-bold text-orange-700/70 uppercase leading-relaxed tracking-tight">
                        Rewards are processed automatically via Flex Shield v4.0. Complete all nodes to trigger the 1500 FP pool injection.
                    </p>
                </div>
            </div>
            
            <div className="text-center pb-10 opacity-20 mt-4">
                <Zap className="h-4 w-4 mx-auto mb-1.5" />
                <p className="text-[7px] font-black uppercase tracking-[0.4em]">Node-to-Node Encrypted Mission Data</p>
            </div>
          </main>
        </div>
    );
}

function Info(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}
