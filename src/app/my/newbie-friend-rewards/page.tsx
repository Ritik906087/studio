'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Gift, CircleDollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { doc, runTransaction, collection, query, where, arrayUnion, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Skeleton } from '@/components/ui/skeleton';

const FRIEND_REWARD_AMOUNT = 50;

type FriendProfile = {
    id: string;
    uid: string;
    numericId: string;
    claimedUserRewards?: string[];
}

type UserProfile = {
    balance: number;
    claimedNewbieFriendRewards?: string[];
}

const FriendItem = ({ friend, status }: { friend: FriendProfile, status: 'Done' | 'Undone' | 'Received' }) => {
    
    const statusConfig = {
        Done: { text: "Done", className: "bg-green-100 text-green-800" },
        Undone: { text: "Undone", className: "bg-gray-100 text-gray-800" },
        Received: { text: "Received", className: "bg-yellow-100 text-yellow-800" },
    };

    const currentStatus = statusConfig[status];
    
    return (
        <div className="flex items-center gap-4 p-3 border-b last:border-0">
            <CircleDollarSign className="h-6 w-6 text-yellow-500" />
            <div className="flex-1">
                <p className="font-semibold text-sm">Invited Friend</p>
                <p className="font-mono text-xs text-muted-foreground">{friend.numericId}</p>
            </div>
            <div className={cn("px-3 py-1 text-xs font-bold rounded-full", currentStatus.className)}>
                {currentStatus.text}
            </div>
        </div>
    )
}

export default function NewbieFriendRewardsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isClaiming, setIsClaiming] = useState(false);
    
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);
    
    const invitedUsersQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users'), where('inviterUid', '==', user.uid));
    }, [user, firestore]);

    const { data: invitedFriends, loading: friendsLoading } = useCollection<FriendProfile>(invitedUsersQuery);
    
    const friendStats = useMemo(() => {
        if (!invitedFriends) return { done: [], undone: [], received: [] };

        const claimedFriendUids = new Set(userProfile?.claimedNewbieFriendRewards || []);
        
        const done: FriendProfile[] = [];
        const undone: FriendProfile[] = [];
        const received: FriendProfile[] = [];

        invitedFriends.forEach(friend => {
            const hasCompletedTask = friend.claimedUserRewards?.includes('nb_final_reward') || false;
            if (hasCompletedTask) {
                if (claimedFriendUids.has(friend.id)) {
                    received.push(friend);
                } else {
                    done.push(friend);
                }
            } else {
                undone.push(friend);
            }
        });
        
        return { done, undone, received };

    }, [invitedFriends, userProfile]);

    const totalBonus = friendStats.done.length * FRIEND_REWARD_AMOUNT;
    const receivedBonus = friendStats.received.length * FRIEND_REWARD_AMOUNT;
    const allFriendsCount = invitedFriends?.length || 0;
    const doneFriendsCount = friendStats.done.length + friendStats.received.length;

    const handleReceiveRewards = async () => {
        if (!user || !firestore || !userProfileRef || friendStats.done.length === 0) return;
        
        setIsClaiming(true);
        const claimableFriends = friendStats.done;
        const totalRewardToClaim = claimableFriends.length * FRIEND_REWARD_AMOUNT;
        const friendUidsToClaim = claimableFriends.map(f => f.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userProfileRef);
                if (!userDoc.exists()) throw new Error("User not found");

                const currentData = userDoc.data() as UserProfile;
                const newBalance = (currentData.balance || 0) + totalRewardToClaim;
                const newClaimedFriends = arrayUnion(...friendUidsToClaim);

                transaction.update(userProfileRef, {
                    balance: newBalance,
                    claimedNewbieFriendRewards: newClaimedFriends,
                });
            });

            await addDoc(collection(firestore, 'users', user.uid, 'transactions'), {
                userId: user.uid,
                amount: totalRewardToClaim,
                description: `Newbie friend bonus for ${claimableFriends.length} friends.`,
                createdAt: serverTimestamp(),
                type: 'new_user_reward',
                orderId: `LGPAYNF${Date.now()}`
            });

            toast({ title: "Rewards Claimed!", description: `₹${totalRewardToClaim} has been added to your balance.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Claim Failed", description: error.message });
        } finally {
            setIsClaiming(false);
        }
    };
    
    const loading = userLoading || profileLoading || friendsLoading;

    return (
        <div className="flex min-h-screen flex-col bg-secondary font-body">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link href="/my">
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Link>
                </Button>
                <h1 className="text-xl font-bold">Invite Friends Rewards</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-grow space-y-4 p-4">
                <Card className="bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/30">
                    <CardContent className="grid grid-cols-3 divide-x divide-primary-foreground/30 p-4 text-center">
                        <div className="space-y-1 pr-2">
                            <p className="text-xs opacity-80">Total bonus</p>
                            <div className="font-bold text-xl">₹{loading ? <Skeleton className="h-6 w-10 mx-auto bg-primary-foreground/20" /> : totalBonus}</div>
                        </div>
                        <div className="space-y-1 px-2">
                            <p className="text-xs opacity-80">Done / All Friends</p>
                            <div className="font-bold text-xl">{loading ? <Skeleton className="h-6 w-10 mx-auto bg-primary-foreground/20" /> : `${doneFriendsCount} / ${allFriendsCount}`}</div>
                        </div>
                        <div className="space-y-1 pl-2">
                            <p className="text-xs opacity-80">Received bonus</p>
                            <div className="font-bold text-xl">₹{loading ? <Skeleton className="h-6 w-10 mx-auto bg-primary-foreground/20" /> : receivedBonus}</div>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-sm text-destructive text-center bg-red-100 p-2 rounded-lg">
                    Warning: You need to remind your friends to complete the newbie tasks to receive rewards
                </p>
                
                <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                    <AccordionItem value="item-1" className="bg-white rounded-lg border shadow-sm">
                        <AccordionTrigger className="px-4 font-bold text-base hover:no-underline">
                           Show Your Friends
                        </AccordionTrigger>
                        <AccordionContent className="px-1 pt-0 pb-2">
                             {loading ? (
                                <div className="p-4"><Loader size="sm" /></div>
                             ) : allFriendsCount > 0 ? (
                                [...friendStats.done, ...friendStats.undone, ...friendStats.received].map(friend => {
                                    const status = friendStats.done.includes(friend) ? 'Done' : friendStats.received.includes(friend) ? 'Received' : 'Undone';
                                    return <FriendItem key={friend.id} friend={friend} status={status} />
                                })
                             ) : (
                                <p className="text-center text-sm text-muted-foreground p-4">You haven't invited any friends yet.</p>
                             )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </main>

            <footer className="p-4 bg-white border-t sticky bottom-0">
                 <Button className="w-full h-12 text-lg font-bold" onClick={handleReceiveRewards} disabled={isClaiming || totalBonus === 0}>
                    {isClaiming ? <Loader size="xs" /> : `Receive Rewards (₹${totalBonus})`}
                </Button>
            </footer>
        </div>
    );
}
