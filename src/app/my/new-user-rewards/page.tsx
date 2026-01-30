"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Gift } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { doc, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';


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

export default function NewUserRewardsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [claimedUserRewards, setClaimedUserRewards] = useState<string[]>([]);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    const newuserTasks = [
        { id: 'nu1', title: 'Registration reward', reward: 20, action: 'claim' },
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

    return (
        <div className="flex min-h-screen flex-col bg-secondary">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/my">
                <ChevronLeft className="h-6 w-6 text-muted-foreground" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">New User Rewards</h1>
            <div className="w-8"></div>
          </header>

          <main className="flex-grow space-y-4 p-4">
             {loading ? (
                <GlassCard>
                     <CardContent className="p-4 flex items-center justify-center min-h-[120px]">
                        <Loader size="md" />
                    </CardContent>
                </GlassCard>
            ) : (
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
                            let buttonDisabled = false;
                            let useLink = false;
                            let isClaimable = false;

                            if (isClaimed) {
                                buttonContent = 'Claimed';
                                buttonDisabled = true;
                            } else if (task.action === 'connect') {
                                if(isUpiConnected) {
                                    buttonContent = 'Claim';
                                    buttonAction = () => handleClaimNewUserReward(task.id, task.reward, task.title);
                                    buttonDisabled = claiming === task.id;
                                    isClaimable = true;
                                } else {
                                    buttonContent = 'Connect';
                                    useLink = true;
                                }
                            } else if (task.action === 'join') {
                                buttonContent = 'Join';
                                buttonAction = () => {
                                    window.open('https://t.me/LGB_PAY', '_blank');
                                    handleClaimNewUserReward(task.id, task.reward, task.title);
                                };
                                buttonDisabled = claiming === task.id;
                                isClaimable = true;
                            } else { // 'claim' for registration
                                buttonContent = 'Claim';
                                buttonAction = () => handleClaimNewUserReward(task.id, task.reward, task.title);
                                buttonDisabled = claiming === task.id;
                                isClaimable = true;
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
            )}
          </main>
        </div>
    );
}
