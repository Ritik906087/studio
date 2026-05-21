
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, CircleDollarSign } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FRIEND_REWARD_AMOUNT = 200;
const FRIEND_PURCHASE_GOAL = 1000;

type FriendProfile = {
    id: string;
    uid: string;
    numericId: string;
    claimedUserRewards?: string[];
}

const FriendItem = ({ friend, status, progress, goal }: { friend: FriendProfile, status: 'Done' | 'Undone' | 'Received', progress: number, goal: number }) => {
    const statusConfig = {
        Done: { text: "Done", className: "bg-green-100 text-green-800" },
        Undone: { text: "Undone", className: "bg-slate-100 text-slate-800" },
        Received: { text: "Received", className: "bg-blue-100 text-blue-800" },
    };

    const currentStatus = statusConfig[status];
    
    return (
        <div className="flex items-center gap-4 p-3 border-b last:border-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CircleDollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">UID: {friend.numericId}</p>
                 {status !== 'Received' && (
                    <div className="flex items-center gap-2 mt-1">
                        <Progress value={Math.min((progress / goal) * 100, 100)} className="h-1.5 w-20" />
                        <p className="text-[10px] text-muted-foreground font-mono">{Math.min(progress, goal)}/{goal}</p>
                    </div>
                )}
            </div>
            <div className={cn("px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md", currentStatus.className)}>
                {currentStatus.text}
            </div>
        </div>
    );
};

export default function NewbieFriendRewardsPage() {
    const { user, profile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [mounted, setMounted] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [friendPurchaseStats, setFriendPurchaseStats] = useState<Record<string, number>>({});
    const [invitedFriends, setInvitedFriends] = useState<FriendProfile[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchFriendsAndStats = useCallback(async () => {
        if (!user || !firestore) return;
        
        setFriendsLoading(true);
        try {
            // 1. Fetch Invited Friends
            const friendsQuery = query(collection(firestore, 'users'), where('inviterUid', '==', user.uid));
            const friendsSnap = await getDocs(friendsQuery);
            const friends = friendsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FriendProfile));
            setInvitedFriends(friends);

            // 2. Fetch Stats for each friend
            const stats: Record<string, number> = {};
            for (const friend of friends) {
                const oQuery = query(collection(firestore, 'users', friend.id, 'orders'), where('status', '==', 'completed'));
                const oSnap = await getDocs(oQuery);
                const total = oSnap.docs.reduce((sum, d) => sum + (d.data().baseAmount || d.data().amount || 0), 0);
                stats[friend.id] = total;
            }
            setFriendPurchaseStats(stats);
        } catch (e) {
            console.error(e);
        } finally {
            setFriendsLoading(false);
        }
    }, [user, firestore]);

    useEffect(() => {
        if (mounted && user) {
            fetchFriendsAndStats();
        }
    }, [mounted, user, fetchFriendsAndStats]);

    const friendStats = useMemo(() => {
        const claimedSet = new Set(profile?.claimedNewbieFriendRewards || []);
        const done: FriendProfile[] = [];
        const undone: FriendProfile[] = [];
        const received: FriendProfile[] = [];

        invitedFriends.forEach(friend => {
            const progress = friendPurchaseStats[friend.id] || 0;
            const isGoalMet = progress >= FRIEND_PURCHASE_GOAL;
            
            if (isGoalMet) {
                if (claimedSet.has(friend.id)) received.push(friend);
                else done.push(friend);
            } else {
                undone.push(friend);
            }
        });
        
        return { done, undone, received };
    }, [invitedFriends, profile, friendPurchaseStats]);

    const totalClaimable = friendStats.done.length * FRIEND_REWARD_AMOUNT;
    const receivedBonus = friendStats.received.length * FRIEND_REWARD_AMOUNT;

    const handleReceiveRewards = async () => {
        if (!user || !firestore || friendStats.done.length === 0) return;
        
        setIsClaiming(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.uid);
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) throw new Error("Profile not found");
                
                const currentBalance = userSnap.data().balance || 0;
                const claimableFriendIds = friendStats.done.map(f => f.id);
                
                transaction.update(userRef, {
                    balance: currentBalance + totalClaimable,
                    claimedNewbieFriendRewards: arrayUnion(...claimableFriendIds)
                });

                const txRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
                transaction.set(txRef, {
                    userId: user.uid,
                    amount: totalClaimable,
                    type: 'team_bonus',
                    description: `Friend Referral Bonus (${friendStats.done.length} friends)`,
                    createdAt: serverTimestamp(),
                    orderId: `FRB${Date.now()}`
                });
            });

            toast({ title: "Rewards Claimed!", description: `₹${totalClaimable} added to balance.` });
            await fetchFriendsAndStats();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Claim Failed", description: e.message });
        } finally {
            setIsClaiming(false);
        }
    };
    
    if (!mounted || userLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-secondary">
                <Loader size="md" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-secondary">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link href="/my">
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Link>
                </Button>
                <h1 className="text-xl font-bold">Friend Rewards</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-grow space-y-4 p-4">
                <Card className="bg-primary text-white rounded-2xl shadow-xl shadow-blue-100 overflow-hidden">
                    <CardContent className="grid grid-cols-3 divide-x divide-white/20 p-5 text-center">
                        <div className="space-y-1 pr-2">
                            <p className="text-[10px] font-bold uppercase opacity-70">Claimable</p>
                            <div className="font-black text-xl">₹{totalClaimable}</div>
                        </div>
                        <div className="space-y-1 px-2">
                            <p className="text-[10px] font-bold uppercase opacity-70">Verified</p>
                            <div className="font-black text-xl">{friendStats.done.length + friendStats.received.length}</div>
                        </div>
                        <div className="space-y-1 pl-2">
                            <p className="text-[10px] font-bold uppercase opacity-70">Received</p>
                            <div className="font-black text-xl">₹{receivedBonus}</div>
                        </div>
                    </CardContent>
                </Card>

                <Button className="w-full h-14 text-lg font-black btn-gradient rounded-2xl" onClick={handleReceiveRewards} disabled={isClaiming || totalClaimable === 0}>
                    {isClaiming ? <Loader size="xs" /> : `Receive Rewards (₹${totalClaimable})`}
                </Button>
                
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-3">
                   <CircleDollarSign className="h-5 w-5 text-primary mt-0.5" />
                   <p className="text-xs text-blue-700 font-medium leading-relaxed">
                      You will receive <b>₹200</b> reward when your invited friend completes a purchase of at least <b>₹1,000</b>.
                   </p>
                </div>
                
                <Accordion type="single" collapsible defaultValue="friends-list" className="w-full">
                    <AccordionItem value="friends-list" className="bg-white rounded-2xl border-none shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-5 font-bold text-slate-700 hover:no-underline">
                           Invitation Data ({invitedFriends.length})
                        </AccordionTrigger>
                        <AccordionContent className="px-2 pt-0 pb-2">
                             {friendsLoading ? (
                                <div className="p-8 space-y-4">
                                    <Skeleton className="h-12 w-full rounded-xl" />
                                    <Skeleton className="h-12 w-full rounded-xl" />
                                </div>
                             ) : invitedFriends.length > 0 ? (
                                <div className="max-h-80 overflow-y-auto">
                                    {[...friendStats.done, ...friendStats.undone, ...friendStats.received].map(friend => {
                                        const status = friendStats.done.includes(friend) ? 'Done' : friendStats.received.includes(friend) ? 'Received' : 'Undone';
                                        const progress = friendPurchaseStats[friend.id] || 0;
                                        return <FriendItem key={friend.id} friend={friend} status={status} progress={progress} goal={FRIEND_PURCHASE_GOAL} />
                                    })}
                                </div>
                             ) : (
                                <div className="text-center py-10">
                                    <p className="text-sm text-muted-foreground font-medium">No friends invited yet.</p>
                                    <Button asChild variant="link" className="mt-2 text-primary font-bold">
                                        <Link href="/invite">Invite Now</Link>
                                    </Button>
                                </div>
                             )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </main>
        </div>
    );
}
