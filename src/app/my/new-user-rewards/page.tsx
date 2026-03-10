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
import { doc, runTransaction, collection, addDoc, serverTimestamp, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import Image from 'next/image';

const TelegramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-sky-500">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
    </svg>
);


const NewbieTaskItem = ({ icon, title, isCompleted, isClaimed, onClaim, onAction, actionText, isClaiming }: { icon: React.ReactNode, title: string, isCompleted: boolean, isClaimed: boolean, onClaim: () => void, onAction: () => void, actionText: string, isClaiming: boolean }) => {
    
    const renderButton = () => {
        if (isClaimed) {
            return <Button size="sm" className="font-semibold h-8 text-xs px-5 bg-green-500 hover:bg-green-500 cursor-default" disabled>Done</Button>;
        }
        if (isCompleted) {
            return (
                <Button size="sm" onClick={onClaim} className="font-semibold h-8 text-xs px-5 btn-gradient" disabled={isClaiming}>
                    {isClaiming ? <Loader size="xs" /> : 'Claim'}
                </Button>
            );
        }
        return <Button size="sm" onClick={onAction} className="font-semibold h-8 text-xs px-5">{actionText}</Button>;
    };

    return (
        <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                {icon}
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{title}</p>
            </div>
            <div className="flex-shrink-0">
                {renderButton()}
            </div>
        </div>
    );
};

export default function NewbieRewardsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [claiming, setClaiming] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [hasCompletedFirstOrder, setHasCompletedFirstOrder] = useState(false);
    
    const newbieTasks = useMemo(() => [
        { id: 'nb_telegram', title: 'Subscribe to Official Channel', reward: 20, icon: <TelegramIcon />, action: "join" },
        { id: 'nb_tutorial', title: 'Watch Beginner Tutorial', reward: 20, icon: <PlaySquare className="h-6 w-6 text-blue-500" />, action: "watch" },
        { id: 'nb_upi', title: 'Link Mobikwik/Freecharge', reward: 30, icon: <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7" width={28} height={28} alt="MobiKwik" />, action: "connect" },
        { id: 'nb_purchase', title: 'Purchase 1000 LG', reward: 130, icon: <CircleDollarSign className="h-6 w-6 text-yellow-500" />, action: 'buy' },
    ], []);

    const finalBonusTask = { id: 'nb_final', title: 'Claim Final Bonus', reward: 300 };

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, loading: profileLoading } = useDoc<{ claimedUserRewards?: string[], paymentMethods?: { name: string }[] }>(userProfileRef);
    
    const claimedRewards = useMemo(() => new Set(userProfile?.claimedUserRewards || []), [userProfile]);

    const fetchData = useCallback(async () => {
        if (!user || !firestore) {
            setDataLoading(false);
            return;
        }
        setDataLoading(true);
        try {
            // To avoid a composite index error, query only on 'status' and filter 'amount' on the client.
            const ordersQuery = query(
                collection(firestore, 'users', user.uid, 'orders'),
                where('status', '==', 'completed')
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            const hasSufficientOrder = ordersSnapshot.docs.some(doc => doc.data().amount >= 1000);
            setHasCompletedFirstOrder(hasSufficientOrder);
        } catch (error) {
            console.error("Error fetching task data:", error);
            toast({ variant: 'destructive', title: "Could not load task progress" });
        } finally {
            setDataLoading(false);
        }
    }, [user, firestore, toast]);

    useEffect(() => {
        if (!profileLoading) {
            fetchData();
        }
    }, [profileLoading, fetchData]);

    const handleClaim = async (taskId: string, reward: number, taskTitle: string) => {
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
                transaction.update(userProfileRef, { 
                    balance: newBalance,
                    claimedUserRewards: arrayUnion(taskId)
                });
            });

             await addDoc(collection(firestore, 'users', user.uid, 'transactions'), {
                userId: user.uid,
                amount: reward,
                description: `Newbie Reward: ${taskTitle}`,
                createdAt: serverTimestamp(),
                type: 'new_user_reward',
                orderId: `LGPAYN${Date.now()}`
            });
            toast({ title: "Reward Claimed!", description: `₹${reward} has been added to your balance.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: error.message || 'Failed to claim reward.' });
        } finally {
            setClaiming(null);
        }
    }
    
    const isUpiConnected = useMemo(() => !!userProfile?.paymentMethods?.some(pm => ['MobiKwik', 'Freecharge'].includes(pm.name)), [userProfile]);
    
    const allTasksCompleted = useMemo(() => newbieTasks.every(task => claimedRewards.has(task.id)), [newbieTasks, claimedRewards]);

    const totalBonus = useMemo(() => {
        let total = 0;
        newbieTasks.forEach(task => {
            if (claimedRewards.has(task.id)) {
                total += task.reward;
            }
        });
        if(claimedRewards.has(finalBonusTask.id)) {
            total += finalBonusTask.reward;
        }
        return total;
    }, [claimedRewards, newbieTasks, finalBonusTask]);
    
    const loading = userLoading || profileLoading || dataLoading;
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-secondary">
                <Loader size="md" />
            </div>
        )
    }

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
            <Card className="border-none bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-lg">
                <CardContent className="p-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm opacity-80">Total bonus</p>
                        <p className="text-3xl font-bold">₹ {totalBonus}</p>
                    </div>
                    <div className="bg-black/20 text-white font-semibold rounded-lg px-4 py-2 text-sm">
                        Received
                    </div>
                </CardContent>
            </Card>
            
            <div className="space-y-3">
                {newbieTasks.map(task => {
                    let isCompleted = false;
                    let actionText = "Go";
                    let onAction = () => {};

                    switch(task.action) {
                        case 'join':
                            isCompleted = true; // Auto-completed, just need to claim
                            actionText = "Join";
                            onAction = () => {
                                window.open('https://t.me/LGB_PAY', '_blank');
                                toast({ title: "Welcome to the Channel!", description: "You can now claim your reward." });
                            };
                            break;
                        case 'watch':
                            isCompleted = true;
                            actionText = "Watch";
                             onAction = () => {
                                toast({ title: "Tutorial 'watched'!", description: "You can now claim your reward." });
                            };
                            break;
                        case 'connect':
                            isCompleted = isUpiConnected;
                            actionText = "Link";
                            onAction = () => router.push('/my/collection/add');
                            break;
                        case 'buy':
                            isCompleted = hasCompletedFirstOrder;
                            actionText = "Buy";
                            onAction = () => router.push('/buy');
                            break;
                    }

                    return (
                        <NewbieTaskItem
                            key={task.id}
                            icon={task.icon}
                            title={task.title}
                            isCompleted={isCompleted}
                            isClaimed={claimedRewards.has(task.id)}
                            onClaim={() => handleClaim(task.id, task.reward, task.title)}
                            onAction={onAction}
                            actionText={actionText}
                            isClaiming={claiming === task.id}
                        />
                    );
                })}
            </div>
            
            {allTasksCompleted && (
                <Card className="border-yellow-400 border-2 bg-yellow-50 mt-6 animate-fade-in">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Gift className="h-8 w-8 text-yellow-500" />
                            <div>
                                <p className="font-bold text-yellow-900">All tasks completed!</p>
                                <p className="text-sm text-yellow-700">Claim your final bonus of ₹{finalBonusTask.reward}</p>
                            </div>
                        </div>
                        <Button 
                            size="lg"
                            className="btn-gradient font-bold"
                            disabled={claimedRewards.has(finalBonusTask.id) || claiming === finalBonusTask.id}
                            onClick={() => handleClaim(finalBonusTask.id, finalBonusTask.reward, finalBonusTask.title)}
                        >
                            {claiming === finalBonusTask.id ? <Loader size="xs" /> : (claimedRewards.has(finalBonusTask.id) ? 'Claimed' : 'Claim')}
                        </Button>
                    </CardContent>
                </Card>
            )}

          </main>
        </div>
    );
}
