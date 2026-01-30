
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Award,
  Users,
  Gift,
  BadgeHelp,
  Clipboard,
  Trophy,
  Inbox,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { doc, collection, query, where, Timestamp, runTransaction, getDocs, arrayUnion, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';


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

const LevelIcon = ({
  level,
  isActive,
  isLocked,
}: {
  level: string;
  isActive?: boolean;
  isLocked?: boolean;
}) => (
  <div className="flex flex-col items-center gap-2">
    <div
      className={cn(
        'relative flex h-14 w-14 items-center justify-center rounded-full bg-secondary',
        isActive && 'bg-yellow-400',
        isLocked && 'opacity-50'
      )}
    >
      <Trophy
        className={cn(
          'h-8 w-8',
          isActive ? 'text-yellow-900' : 'text-muted-foreground'
        )}
      />
    </div>
    <span
      className={cn(
        'text-xs font-semibold',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {level}
    </span>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Inbox className="h-12 w-12 opacity-50" />
        <p className="mt-4 text-base">{message}</p>
    </div>
)


const TaskItem = ({ title, reward, progress, goal, buttonState = 'default', onClaim, isClaiming }: { title: string, reward: number, progress: number, goal: number, buttonState?: 'default' | 'claimed' | 'claimable', onClaim: () => void, isClaiming: boolean }) => {

    const renderButton = () => {
        if (buttonState === 'default') {
            return (
                <Button asChild size="sm" className="font-bold h-7 text-xs px-4">
                    <Link href="/buy">Buy</Link>
                </Button>
            );
        }

        return (
            <Button
                size="sm"
                className={cn("font-bold h-7 text-xs px-4", buttonState === 'claimable' && 'btn-gradient')}
                disabled={buttonState !== 'claimable' || isClaiming}
                onClick={onClaim}
            >
                {isClaiming ? <Loader size="xs" /> : (buttonState === 'claimed' ? 'Claimed' : 'Claim')}
            </Button>
        );
    };
    
    return (
        <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <div className="shrink-0 p-2 bg-primary/10 rounded-full mt-0.5">
                <Gift className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{title}</p>
                <div className="flex items-center gap-2 mt-1">
                    <Progress value={Math.min((progress / goal) * 100, 100)} className="h-1.5 w-20" />
                    <p className="text-xs text-muted-foreground font-mono">{Math.min(progress, goal)}/{goal}</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="font-bold text-base text-green-600 whitespace-nowrap">₹ {reward}</p>
                {renderButton()}
            </div>
        </div>
    );
};


const orderCountTasks = [
    { id: 'oc1', title: 'Complete 1 order', reward: 2, goal: 1 },
    { id: 'oc2', title: 'Complete 5 orders', reward: 10, goal: 5 },
    { id: 'oc3', title: 'Complete 10 orders', reward: 20, goal: 10 },
    { id: 'oc4', title: 'Complete 20 orders', reward: 60, goal: 20 },
];
  
const orderAmountTasks = [
    { id: 'oa1', title: 'Single order: ₹500', reward: 10, goal: 500 },
    { id: 'oa2', title: 'Single order: ₹1,000', reward: 25, goal: 1000 },
    { id: 'oa3', title: 'Single order: ₹2,000', reward: 50, goal: 2000 },
    { id: 'oa4', title: 'Single order: ₹3,000', reward: 70, goal: 3000 },
    { id: 'oa5', title: 'Single order: ₹5,000', reward: 100, goal: 5000 },
    { id: 'oa6', title: 'Single order: ₹10,000', reward: 200, goal: 10000 },
];

const DailyTasksSection = () => {
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
                where('createdAt', '>=', todayTimestamp)
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            let orderCount = 0;
            let maxAmount = 0;
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                if (order.status === 'completed') {
                    orderCount++;
                    if (order.amount > maxAmount) {
                        maxAmount = order.amount;
                    }
                }
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
            console.error("Error fetching daily tasks data:", error);
            toast({ variant: 'destructive', title: "Could not load tasks" });
        } finally {
            setLoading(false);
        }
    }, [user, firestore, getTodayDateString, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleClaim = async (taskId: string, reward: number, taskTitle: string) => {
        if (!user || !firestore) return;
        setClaimingTaskId(taskId);

        const userRef = doc(firestore, 'users', user.uid);
        const rewardDocRef = doc(firestore, 'users', user.uid, 'dailyRewards', getTodayDateString());
        const transactionsRef = collection(firestore, 'users', user.uid, 'transactions');

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User not found");

                const rewardDoc = await getDoc(rewardDocRef); 
                const alreadyClaimed = rewardDoc.exists() && (rewardDoc.data().claimedTaskIds || []).includes(taskId);
                if (alreadyClaimed) {
                    throw new Error("Reward already claimed.");
                }

                const newBalance = (userDoc.data().balance || 0) + reward;
                transaction.update(userRef, { balance: newBalance });

                if (rewardDoc.exists()) {
                    transaction.update(rewardDocRef, { claimedTaskIds: arrayUnion(taskId) });
                } else {
                    transaction.set(rewardDocRef, { claimedTaskIds: [taskId], date: getTodayDateString() });
                }
            });

            await addDoc(transactionsRef, {
                userId: user.uid,
                amount: reward,
                description: `Daily Task: ${taskTitle}`,
                createdAt: serverTimestamp()
            });

            toast({ title: "Reward Claimed!", description: `₹${reward} has been added to your balance.` });
            await fetchData();
        } catch (error: any) {
            console.error("Claim reward error:", error);
            toast({ variant: 'destructive', title: error.message || 'Failed to claim reward.' });
        } finally {
            setClaimingTaskId(null);
        }
    };

    const renderTasks = (tasks: typeof orderCountTasks, progress: number) => (
        tasks.map(task => {
            const isClaimed = claimedTaskIds.includes(task.id);
            const isCompleted = progress >= task.goal;
            const buttonState = isClaimed ? 'claimed' : (isCompleted ? 'claimable' : 'default');
            
            return (
                <TaskItem
                    key={task.id}
                    {...task}
                    progress={progress}
                    buttonState={buttonState}
                    onClaim={() => handleClaim(task.id, task.reward, task.title)}
                    isClaiming={claimingTaskId === task.id}
                />
            );
        })
    );
    
    if (loading) {
        return (
             <div className="flex items-center justify-center p-8">
                <Loader size="md" />
            </div>
        )
    }

    return (
        <>
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Daily Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-muted-foreground mb-2 text-sm">Based on number of orders</h3>
                        <div className="space-y-2">
                           {renderTasks(orderCountTasks, stats.count)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-muted-foreground mb-2 text-sm">Based on order amount</h3>
                        <div className="space-y-2">
                           {renderTasks(orderAmountTasks, stats.maxAmount)}
                        </div>
                    </div>
                </CardContent>
            </GlassCard>
        </>
    );
}

export default function RewardsPage() {
  return (
    <div className="min-h-screen text-foreground pb-32">
      {/* Header */}
      <header className="flex items-center justify-between bg-white p-4 sticky top-0 z-10 border-b">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <Link href="/home">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Rewards</h1>
        <div className="w-8"></div>
      </header>

      <main className="space-y-4 p-4">
        {/* Reward Claimed */}
        <GlassCard className="bg-yellow-50">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-yellow-500" />
              <p className="text-sm font-semibold">
                Reward Claimed <span className="font-bold text-yellow-600">0 LG</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-muted-foreground"
            >
              <BadgeHelp className="h-4 w-4" />
              Rules
            </Button>
          </CardContent>
        </GlassCard>

        {/* Current Level Card */}
        <GlassCard className="overflow-hidden bg-gradient-to-br from-yellow-100 to-yellow-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-yellow-800">
                Current Level
              </CardTitle>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/50">
                 <Trophy className="h-9 w-9 text-yellow-700" />
              </div>
            </div>
            <p className="text-4xl font-bold text-yellow-900">LV0</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Progress value={0} className="h-2 bg-black/10" />
              <div className="flex justify-between text-xs font-medium text-yellow-800">
                <span>LV0</span>
                <span>LV1</span>
              </div>
            </div>
            <div className="grid grid-cols-3 text-center">
              <div>
                <p className="font-bold text-yellow-900">0</p>
                <p className="text-xs text-yellow-800">Valid Trading Volume</p>
              </div>
              <div>
                <p className="font-bold text-yellow-900">0</p>
                <p className="text-xs text-yellow-800">Successful Buy Count</p>
              </div>
              <div>
                <p className="font-bold text-yellow-900">0</p>
                <p className="text-xs text-yellow-800">Successful Sell Count</p>
              </div>
            </div>
          </CardContent>
        </GlassCard>

        {/* Level Selector */}
        <div className="grid grid-cols-5 gap-2 px-2">
          <LevelIcon level="LV0" isActive />
          <LevelIcon level="LV1" isLocked />
          <LevelIcon level="LV2" isLocked />
          <LevelIcon level="LV3" isLocked />
          <LevelIcon level="LV4" isLocked />
        </div>
        
        <div className="space-y-4">
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-lg font-bold">VIP Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmptyState message="No VIP tasks available right now." />
                </CardContent>
            </GlassCard>
            <DailyTasksSection />
             <GlassCard>
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Reward getting member</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmptyState message="No recent rewards." />
                </CardContent>
            </GlassCard>
          </div>
      </main>
    </div>
  );
}
