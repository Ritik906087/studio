
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Gift, PlaySquare, CircleDollarSign } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { doc, runTransaction, collection, query, where, getDocs, arrayUnion, Timestamp, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';

const TelegramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-sky-500">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
    </svg>
);

const UpiIcons = () => (
    <div className="flex -space-x-3 items-center justify-center">
        <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7" width={28} height={28} alt="MobiKwik" className="rounded-full bg-white border-2 border-white" />
        <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4" width={28} height={28} alt="Freecharge" className="rounded-full bg-white border-2 border-white" />
    </div>
);

const newbieTasksList = [
    { id: 'nb_telegram', title: 'Subscribe to Official Channel', icon: <TelegramIcon />, action: "go", href: "https://t.me/LGB_PAY" },
    { id: 'nb_tutorial', title: 'Watch Beginner Tutorial', icon: <PlaySquare className="h-6 w-6 text-blue-500" />, action: "go", href: "#" },
    { id: 'nb_upi', title: 'Link Mobikwik/Freecharge', icon: <UpiIcons />, action: "go", href: "/my/collection/add" },
    { id: 'nb_purchase', title: 'Purchase 1000 LG', icon: <CircleDollarSign className="h-6 w-6 text-yellow-500" />, action: 'go', href: '/buy', goal: 1000 },
];

const FINAL_REWARD_ID = 'nb_final_reward';
const FINAL_REWARD_AMOUNT = 300;

const NewbieTaskItem = ({ icon, title, isCompleted, onAction, progress, goal }: { icon: React.ReactNode, title: string, isCompleted: boolean, onAction: () => void, progress?: number, goal?: number }) => {
    return (
        <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm transition-all hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary shadow-inner">
                {icon}
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{title}</p>
                 {progress !== undefined && goal !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                        <Progress value={Math.min((progress / goal) * 100, 100)} className="h-1.5 w-20" />
                        <p className="text-xs text-muted-foreground font-mono">{Math.min(progress, goal)}/{goal}</p>
                    </div>
                )}
            </div>
            <div className="flex-shrink-0">
                {isCompleted ? (
                    <Button size="sm" className="font-semibold h-8 text-xs px-6 bg-green-500 hover:bg-green-600 shadow-[0_4px_14px_0_rgb(0,200,83,38%)] cursor-default" disabled>Done</Button>
                ) : (
                    <Button size="sm" onClick={onAction} className="font-semibold h-8 text-xs px-6 bg-gray-300 text-gray-700 hover:bg-gray-400 active:scale-95 transition-transform">Go</Button>
                )}
            </div>
        </div>
    );
};

export default function NewbieRewardsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isClaimingFinal, setIsClaimingFinal] = useState(false);
    const [taskStatus, setTaskStatus] = useState<Record<string, boolean>>({});
    const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, loading: profileLoading } = useDoc<{ claimedUserRewards?: string[], paymentMethods?: { name: string }[] }>(userProfileRef);

    const checkTaskCompletion = useCallback(async () => {
        if (!user || !firestore || !userProfile || !userProfileRef) return;

        const claimed = new Set(userProfile.claimedUserRewards || []);
        const status: Record<string, boolean> = {};
        const progress: Record<string, number> = {};

        // Check UPI Link
        const isUpiLinked = userProfile.paymentMethods?.some(pm => ['MobiKwik', 'Freecharge'].includes(pm.name)) || false;
        if (isUpiLinked && !claimed.has('nb_upi')) {
            await updateDoc(userProfileRef, { claimedUserRewards: arrayUnion('nb_upi') });
            claimed.add('nb_upi'); 
        }
        status['nb_upi'] = isUpiLinked;
        
        // Check Purchase
        const purchaseQuery = query(
            collection(firestore, 'users', user.uid, 'orders'),
            where('status', '==', 'completed')
        );
        const purchaseSnapshot = await getDocs(purchaseQuery);
        let maxPurchaseAmount = 0;
        purchaseSnapshot.forEach(doc => {
            if (doc.data().amount > maxPurchaseAmount) {
                maxPurchaseAmount = doc.data().amount;
            }
        });
        
        const hasPurchased = maxPurchaseAmount >= 1000;
        if (hasPurchased && !claimed.has('nb_purchase')) {
            await updateDoc(userProfileRef, { claimedUserRewards: arrayUnion('nb_purchase') });
            claimed.add('nb_purchase');
        }
        status['nb_purchase'] = hasPurchased;
        progress['nb_purchase'] = maxPurchaseAmount;

        // Check manual tasks
        status['nb_telegram'] = claimed.has('nb_telegram');
        status['nb_tutorial'] = claimed.has('nb_tutorial');
        status[FINAL_REWARD_ID] = claimed.has(FINAL_REWARD_ID);

        setTaskStatus(status);
        setTaskProgress(progress);
    }, [user, firestore, userProfile, userProfileRef]);


    useEffect(() => {
        if (userProfile) {
            checkTaskCompletion();
        }
    }, [userProfile, checkTaskCompletion]);

    const handleSimpleTask = async (taskId: string, href: string) => {
        if (href === '#') {
            toast({ title: "Tutorial 'watched'!", description: "This task is now complete." });
        } else {
            window.open(href, '_blank');
        }

        if (userProfileRef) {
            await updateDoc(userProfileRef, { claimedUserRewards: arrayUnion(taskId) });
            // Re-fetch to update status from db
            checkTaskCompletion();
        }
    };
    
    const handleFinalClaim = async () => {
        if (!user || !firestore || !userProfileRef) return;
        setIsClaimingFinal(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userProfileRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const newBalance = (userDoc.data().balance || 0) + FINAL_REWARD_AMOUNT;
                transaction.update(userProfileRef, { 
                    balance: newBalance,
                    claimedUserRewards: arrayUnion(FINAL_REWARD_ID)
                });
            });
            toast({ title: "Reward Claimed!", description: `₹${FINAL_REWARD_AMOUNT} has been added to your balance.` });
            setTaskStatus(prev => ({ ...prev, [FINAL_REWARD_ID]: true }));
        } catch (error: any) {
             toast({ variant: 'destructive', title: error.message || 'Failed to claim reward.' });
        } finally {
            setIsClaimingFinal(false);
        }
    }
    
    const allTasksCompleted = newbieTasksList.every(task => taskStatus[task.id]);
    const isFinalRewardClaimed = taskStatus[FINAL_REWARD_ID];
    const loading = userLoading || profileLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-secondary">
                <Loader size="md" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-secondary font-body">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/my">
                <ChevronLeft className="h-6 w-6 text-muted-foreground" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Newbie Rewards</h1>
            <div className="w-8"></div>
          </header>

          <main className="flex-grow space-y-4 p-4">
            <Card className="border-none bg-gradient-to-br from-primary via-violet-500 to-accent text-white shadow-lg shadow-primary/30">
                <CardContent className="p-5 flex justify-between items-center">
                    <div>
                        <p className="text-sm opacity-90">Reward Amount</p>
                        <p className="text-4xl font-bold mt-1">₹{FINAL_REWARD_AMOUNT}</p>
                    </div>
                    {allTasksCompleted && !isFinalRewardClaimed ? (
                        <Button 
                            className="bg-white text-primary font-bold rounded-lg px-5 py-2 text-sm hover:bg-white/90 shadow-[0_4px_14px_0_rgb(0,0,0,10%)] transition-all active:scale-95 animate-pulse"
                            disabled={isClaimingFinal}
                            onClick={handleFinalClaim}
                        >
                            {isClaimingFinal ? <Loader size="xs" /> : 'Claim'}
                        </Button>
                    ) : (
                        <div className={cn("bg-black/20 text-white font-semibold rounded-lg px-4 py-2 text-sm", isFinalRewardClaimed && "bg-green-500")}>
                            {isFinalRewardClaimed ? 'Done' : 'Undone'}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <div className="space-y-3">
                {newbieTasksList.map(task => {
                    const isCompleted = taskStatus[task.id] || false;
                    const currentProgress = taskProgress[task.id] || 0;
                    
                    let onAction = () => router.push(task.href);
                    if (task.action === "go" && (task.href.startsWith('http') || task.href === '#')) {
                         onAction = () => handleSimpleTask(task.id, task.href);
                    }
                    
                    return (
                        <NewbieTaskItem
                            key={task.id}
                            icon={task.icon}
                            title={task.title}
                            isCompleted={isCompleted}
                            onAction={onAction}
                            progress={task.goal ? currentProgress : undefined}
                            goal={task.goal}
                        />
                    );
                })}
            </div>
          </main>
        </div>
    );
}
