
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Gift, PlaySquare, CircleDollarSign } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, getDocs, query, collection, where, arrayUnion, runTransaction, serverTimestamp, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
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
    { id: 'nb_telegram', title: 'Subscribe to Official Channel', icon: <TelegramIcon />, action: "go", href: "https://t.me/+-W0tnyDk3jBiYjQ1" },
    { id: 'nb_tutorial', title: 'Watch Beginner Tutorial', icon: <PlaySquare className="h-6 w-6 text-blue-500" />, action: "go", href: "/my/tutorial" },
    { id: 'nb_upi', title: 'Link Mobikwik/Freecharge', icon: <UpiIcons />, action: "go", href: "/my/collection/add" },
    { id: 'nb_purchase', title: 'Purchase 1000 LG', icon: <CircleDollarSign className="h-6 w-6 text-yellow-500" />, action: 'go', href: '/buy', goal: 1000 },
];

const FINAL_REWARD_ID = 'nb_final_reward';
const FINAL_REWARD_AMOUNT = 300;

const NewbieTaskItem = ({ icon, title, isCompleted, onAction, progress, goal }: { icon: React.ReactNode, title: string, isCompleted: boolean, onAction: () => void, progress?: number, goal?: number }) => {
    const renderButton = () => {
        if (isCompleted) {
            return <Button size="sm" className="font-semibold h-8 text-xs px-6 bg-green-500 hover:bg-green-500 shadow-[0_4px_14px_0_rgb(0,200,83,38%)] cursor-default" disabled>Done</Button>;
        }
        return <Button size="sm" onClick={onAction} className="font-semibold h-8 text-xs px-6 bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-transform">Go</Button>;
    };
    
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
                {renderButton()}
            </div>
        </div>
    );
};

export default function NewbieRewardsPage() {
    const { user, profile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [isClaimingFinal, setIsClaimingFinal] = useState(false);
    const [taskStatus, setTaskStatus] = useState<Record<string, boolean>>({});
    const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    const checkTaskCompletion = useCallback(async () => {
        if (!user || !profile || !firestore) return;
        
        const claimed = new Set(profile.claimedUserRewards || []);
        const status: Record<string, boolean> = {};
        const progress: Record<string, number> = {};

        // 1. Check UPI Link
        const isUpiLinked = profile.paymentMethods?.some((pm: any) => ['MobiKwik', 'Freecharge'].includes(pm.name)) || false;
        if (isUpiLinked && !claimed.has('nb_upi')) {
            updateDoc(doc(firestore, 'users', user.uid), { 
                claimedUserRewards: arrayUnion('nb_upi') 
            }).catch(console.error);
        }
        status['nb_upi'] = isUpiLinked;
        
        // 2. Check Purchase Progress
        const ordersQuery = query(
            collection(firestore, 'users', user.uid, 'orders'),
            where('status', '==', 'completed')
        );
        const ordersSnap = await getDocs(ordersQuery);
        const totalPurchaseAmount = ordersSnap.docs.reduce((sum, d) => sum + (d.data().baseAmount || d.data().amount || 0), 0);
        
        const hasPurchased = totalPurchaseAmount >= 1000;
        if (hasPurchased && !claimed.has('nb_purchase')) {
            updateDoc(doc(firestore, 'users', user.uid), { 
                claimedUserRewards: arrayUnion('nb_purchase') 
            }).catch(console.error);
        }
        status['nb_purchase'] = hasPurchased;
        progress['nb_purchase'] = totalPurchaseAmount;

        // 3. Manual Tasks
        status['nb_telegram'] = claimed.has('nb_telegram');
        status['nb_tutorial'] = claimed.has('nb_tutorial');
        status[FINAL_REWARD_ID] = claimed.has(FINAL_REWARD_ID);

        setTaskStatus(status);
        setTaskProgress(progress);
    }, [user, profile, firestore]);

    useEffect(() => {
        if (mounted && profile) {
            checkTaskCompletion();
        }
    }, [mounted, profile, checkTaskCompletion]);

    const handleSimpleTask = async (taskId: string, href: string) => {
        if (!user || !firestore) return;

        try {
            await updateDoc(doc(firestore, 'users', user.uid), {
                claimedUserRewards: arrayUnion(taskId)
            });
            
            if (href.startsWith('http')) {
                window.open(href, '_blank');
            } else if (href && href !== '#') {
                router.push(href);
            }
        } catch (e) {
            console.error(e);
        }
    };
    
    const handleFinalClaim = async () => {
        if (!user || !firestore) return;
        setIsClaimingFinal(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.uid);
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) throw new Error("User profile not found");
                
                const data = userSnap.data();
                const claimed = data.claimedUserRewards || [];
                
                if (claimed.includes(FINAL_REWARD_ID)) {
                    throw new Error("Reward already claimed");
                }
                
                const currentBalance = data.balance || 0;
                transaction.update(userRef, {
                    balance: currentBalance + FINAL_REWARD_AMOUNT,
                    claimedUserRewards: arrayUnion(FINAL_REWARD_ID)
                });

                const txRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
                transaction.set(txRef, {
                    userId: user.uid,
                    amount: FINAL_REWARD_AMOUNT,
                    type: 'new_user_reward',
                    description: 'Final Newbie Reward Claimed',
                    createdAt: serverTimestamp(),
                    orderId: `FNR${Date.now()}`
                });
            });
            
            toast({ title: "Reward Claimed!", description: `₹${FINAL_REWARD_AMOUNT} added to your balance.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Claim Failed', description: error.message });
        } finally {
            setIsClaimingFinal(false);
        }
    };
    
    if (!mounted || userLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-secondary">
                <Loader size="md" />
            </div>
        );
    }

    const allTasksCompleted = newbieTasksList.every(task => taskStatus[task.id]);
    const isFinalRewardClaimed = taskStatus[FINAL_REWARD_ID];

    return (
        <div className="flex min-h-screen flex-col bg-secondary">
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
            <Card className="border-none bg-gradient-to-br from-primary via-blue-600 to-accent text-white shadow-lg">
                <CardContent className="p-5 flex justify-between items-center">
                    <div>
                        <p className="text-sm opacity-90">Reward Amount</p>
                        <p className="text-4xl font-black mt-1">₹{FINAL_REWARD_AMOUNT}</p>
                    </div>
                     {allTasksCompleted ? (
                        isFinalRewardClaimed ? (
                            <div className="bg-green-500 px-4 py-2 rounded-lg font-bold text-sm shadow-inner">Claimed</div>
                        ) : (
                            <Button
                                className="bg-white text-primary font-black rounded-lg px-6 h-10 text-sm hover:bg-white/90 animate-pulse"
                                disabled={isClaimingFinal}
                                onClick={handleFinalClaim}
                            >
                                {isClaimingFinal ? <Loader size="xs" /> : 'Claim'}
                            </Button>
                        )
                    ) : (
                        <div className="bg-black/10 text-white/80 font-bold rounded-lg px-4 py-2 text-sm border border-white/10">
                            Undone
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <div className="space-y-3">
                {newbieTasksList.map(task => {
                    const isCompleted = taskStatus[task.id] || false;
                    const currentProgress = taskProgress[task.id] || 0;
                    
                    let onAction = () => {};
                    if (task.id === 'nb_telegram' || task.id === 'nb_tutorial') {
                        onAction = () => handleSimpleTask(task.id, task.href);
                    } else {
                        onAction = () => router.push(task.href);
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
