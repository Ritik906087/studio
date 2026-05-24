
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Gift,
  Trophy,
  Target,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { doc, collection, query, where, Timestamp, runTransaction, getDocs, arrayUnion, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const orderCountTasks = [
    { id: 'oc1', title: 'Mini Milestone', desc: 'Complete 1 order', reward: 2, goal: 1 },
    { id: 'oc2', title: 'Bronze Starter', desc: 'Complete 5 orders', reward: 10, goal: 5 },
    { id: 'oc3', title: 'Silver Member', desc: 'Complete 10 orders', reward: 20, goal: 10 },
    { id: 'oc4', title: 'Gold Champion', desc: 'Complete 20 orders', reward: 60, goal: 20 },
];
  
const orderAmountTasks = [
    { id: 'oa1', title: 'Level 1 Value', desc: 'Single order: ₹500', reward: 10, goal: 500 },
    { id: 'oa2', title: 'Level 2 Value', desc: 'Single order: ₹1,000', reward: 25, goal: 1000 },
    { id: 'oa3', title: 'Level 3 Value', desc: 'Single order: ₹2,000', reward: 50, goal: 2000 },
    { id: 'oa4', title: 'Premium Tier', desc: 'Single order: ₹3,000', reward: 70, goal: 3000 },
    { id: 'oa5', title: 'Elite Tier', desc: 'Single order: ₹5,000', reward: 100, goal: 5000 },
    { id: 'oa6', title: 'Master Tier', desc: 'Single order: ₹10,000', reward: 200, goal: 10000 },
];

const TaskItem = ({ title, desc, reward, progress, goal, buttonState = 'default', onClaim, isClaiming }: any) => {
    const isCompleted = progress >= goal;
    const isClaimed = buttonState === 'claimed';
    const isClaimable = buttonState === 'claimable';

    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm relative overflow-hidden group active:bg-slate-50/50 transition-colors">
            {isClaimed && <div className="absolute top-0 right-0 p-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /></div>}
            
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        isClaimed ? "bg-slate-50 text-slate-300" : "bg-blue-50 text-blue-600"
                    )}>
                        {isClaimed ? <Lock className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                    </div>
                    <div>
                        <h4 className={cn("text-[13px] font-black uppercase tracking-tight", isClaimed ? "text-slate-400" : "text-slate-800")}>{title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">{desc}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={cn("text-sm font-black tabular-nums", isClaimed ? "text-slate-300" : "text-blue-600")}>+₹{reward}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bonus</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Progress value={Math.min((progress / goal) * 100, 100)} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-mono font-black text-slate-400 shrink-0">{Math.min(progress, goal)}/{goal}</span>
                </div>
                
                {isClaimed ? (
                    <div className="w-full h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest border border-dashed">
                        Injected into Balance
                    </div>
                ) : isClaimable ? (
                    <Button 
                        onClick={onClaim} 
                        disabled={isClaiming}
                        className="w-full h-9 btn-gradient rounded-xl font-black text-[10px] uppercase tracking-widest shadow-blue-500/20"
                    >
                        {isClaiming ? <Loader size="xs" /> : "Claim Cash Reward"}
                    </Button>
                ) : (
                    <Button asChild variant="outline" className="w-full h-9 border-blue-100 bg-blue-50/20 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50">
                        <Link href="/buy">Perform Buy <ArrowRight className="ml-2 h-3 w-3" /></Link>
                    </Button>
                )}
            </div>
        </div>
    );
};

export default function RewardsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ count: 0, maxAmount: 0 });
    const [claimedTaskIds, setClaimedTaskIds] = useState<string[]>([]);
    const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

    const getTodayDateString = useCallback(() => new Date().toISOString().split('T')[0], []);

    const fetchData = useCallback(async () => {
        if (!user || !firestore) {
            setLoading(false);
            return;
        };
        setLoading(true);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        try {
            const ordersQuery = query(
                collection(firestore, 'users', user.uid, 'orders'),
                where('createdAt', '>=', todayTimestamp),
                where('status', '==', 'completed')
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            let orderCount = 0;
            let maxAmount = 0;
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                orderCount++;
                if (order.baseAmount > maxAmount) maxAmount = order.baseAmount;
                else if (order.amount > maxAmount) maxAmount = order.amount;
            });
            setStats({ count: orderCount, maxAmount });

            const rewardDocRef = doc(firestore, 'users', user.uid, 'dailyRewards', getTodayDateString());
            const rewardDoc = await getDoc(rewardDocRef);
            if (rewardDoc.exists()) {
                setClaimedTaskIds(rewardDoc.data().claimedTaskIds || []);
            } else {
                setClaimedTaskIds([]);
            }
        } catch (error) {
            console.error("Error fetching daily tasks:", error);
        } finally {
            setLoading(false);
        }
    }, [user, firestore, getTodayDateString]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleClaim = async (taskId: string, reward: number, taskTitle: string) => {
        if (!user || !firestore) return;
        setClaimingTaskId(taskId);

        const userRef = doc(firestore, 'users', user.uid);
        const rewardDocRef = doc(firestore, 'users', user.uid, 'dailyRewards', getTodayDateString());

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User missing");

                const rewardDoc = await getDoc(rewardDocRef); 
                const alreadyClaimed = rewardDoc.exists() && (rewardDoc.data().claimedTaskIds || []).includes(taskId);
                if (alreadyClaimed) throw new Error("Already claimed");

                transaction.update(userRef, { balance: (userDoc.data().balance || 0) + reward });

                if (rewardDoc.exists()) {
                    transaction.update(rewardDocRef, { claimedTaskIds: arrayUnion(taskId) });
                } else {
                    transaction.set(rewardDocRef, { claimedTaskIds: [taskId], date: getTodayDateString() });
                }

                const txRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
                transaction.set(txRef, {
                    userId: user.uid,
                    amount: reward,
                    description: `Daily Task: ${taskTitle}`,
                    createdAt: serverTimestamp(),
                    type: 'daily_task',
                    orderId: `DTASK${Date.now()}`
                });
            });

            toast({ title: "₹" + reward + " Received!" });
            await fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Claim Failed" });
        } finally {
            setClaimingTaskId(null);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#F5F7FB]"><Loader size="md" /></div>;

    const totalPotential = [...orderCountTasks, ...orderAmountTasks].reduce((acc, t) => acc + t.reward, 0);

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB] pb-24">
            <header className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2 rounded-full">
                    <Link href="/my"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
                </Button>
                <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Mission Hub</h1>
            </header>

            <main className="p-3 space-y-4">
                <Card className="border-none balance-gradient text-white rounded-[28px] shadow-xl shadow-blue-500/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><Trophy className="h-32 w-32" /></div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Daily Potential</p>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-black tabular-nums tracking-tighter">₹{totalPotential}</span>
                                    <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">Pool</span>
                                </div>
                            </div>
                            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                                <Target className="h-5 w-5 text-blue-200" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                            <p className="text-[9px] font-bold uppercase tracking-widest">Tasks Reset: 00:00 AM</p>
                            <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                                <Zap className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" /> Live
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <section className="space-y-2.5">
                        <h3 className="px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             Activity Rewards
                        </h3>
                        <div className="grid gap-2.5">
                            {orderCountTasks.map(task => {
                                const isClaimed = claimedTaskIds.includes(task.id);
                                const isCompleted = stats.count >= task.goal;
                                const buttonState = isClaimed ? 'claimed' : (isCompleted ? 'claimable' : 'default');
                                
                                return (
                                    <TaskItem
                                        key={task.id}
                                        {...task}
                                        progress={stats.count}
                                        buttonState={buttonState}
                                        onClaim={() => handleClaim(task.id, task.reward, task.title)}
                                        isClaiming={claimingTaskId === task.id}
                                    />
                                );
                            })}
                        </div>
                    </section>

                    <section className="space-y-2.5">
                        <h3 className="px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             Transaction Value Tier
                        </h3>
                        <div className="grid gap-2.5">
                            {orderAmountTasks.map(task => {
                                const isClaimed = claimedTaskIds.includes(task.id);
                                const isCompleted = stats.maxAmount >= task.goal;
                                const buttonState = isClaimed ? 'claimed' : (isCompleted ? 'claimable' : 'default');
                                
                                return (
                                    <TaskItem
                                        key={task.id}
                                        {...task}
                                        progress={stats.maxAmount}
                                        buttonState={buttonState}
                                        onClaim={() => handleClaim(task.id, task.reward, task.title)}
                                        isClaiming={claimingTaskId === task.id}
                                    />
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="p-6 text-center opacity-30">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">Network Rewards Verified</p>
                </div>
            </main>
        </div>
    );
}
