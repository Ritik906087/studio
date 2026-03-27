
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Gift, CircleDollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';


const FRIEND_REWARD_AMOUNT = 200;
const FRIEND_PURCHASE_GOAL = 1000;

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

const FriendItem = ({ friend, status, progress, goal }: { friend: FriendProfile, status: 'Done' | 'Undone' | 'Received', progress: number, goal: number }) => {
    
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
                 {status !== 'Received' && ( // Don't show progress for already claimed
                    <div className="flex items-center gap-2 mt-1">
                        <Progress value={Math.min((progress / goal) * 100, 100)} className="h-1.5 w-20" />
                        <p className="text-xs text-muted-foreground font-mono">{Math.min(progress, goal)}/{goal}</p>
                    </div>
                )}
            </div>
            <div className={cn("px-3 py-1 text-xs font-bold rounded-full", currentStatus.className)}>
                {currentStatus.text}
            </div>
        </div>
    )
}

export default function NewbieFriendRewardsPage() {
    const { user, loading: userLoading } = useUser();
    const { toast } = useToast();

    const [isClaiming, setIsClaiming] = useState(false);
    const [friendPurchaseStats, setFriendPurchaseStats] = useState<Record<string, number>>({});
    const [loadingStats, setLoadingStats] = useState(true);
    
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const [invitedFriends, setInvitedFriends] = useState<FriendProfile[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            if(!user) {
                setProfileLoading(false);
                return;
            }
            const { data } = await supabase.from('users').select('balance, claimedNewbieFriendRewards').eq('id', user.id).single();
            setUserProfile(data as UserProfile);
            setProfileLoading(false);
        }
        fetchProfile();
    }, [user]);

    useEffect(() => {
        async function fetchInvitedFriends() {
            if(!user) {
                setFriendsLoading(false);
                return;
            }
            const { data } = await supabase.from('users').select('id, uid, numericId, claimedUserRewards').eq('inviterUid', user.uid);
            setInvitedFriends(data || []);
            setFriendsLoading(false);
        }
        fetchInvitedFriends();
    }, [user]);

    
    useEffect(() => {
        if (!invitedFriends || invitedFriends.length === 0) {
            setLoadingStats(false);
            return;
        }

        const fetchStats = async () => {
            setLoadingStats(true);
            const stats: Record<string, number> = {};
            for (const friend of invitedFriends) {
                const { data: ordersData, error } = await supabase
                    .from('orders')
                    .select('amount')
                    .eq('userId', friend.id)
                    .eq('status', 'completed');

                if (ordersData) {
                    const totalPurchase = ordersData.reduce((sum, doc) => sum + doc.amount, 0);
                    stats[friend.id] = totalPurchase;
                }
            }
            setFriendPurchaseStats(stats);
            setLoadingStats(false);
        };

        fetchStats();
    }, [invitedFriends]);
    
    const friendStats = useMemo(() => {
        if (!invitedFriends) return { done: [], undone: [], received: [] };

        const claimedFriendUids = new Set(userProfile?.claimedNewbieFriendRewards || []);
        
        const done: FriendProfile[] = [];
        const undone: FriendProfile[] = [];
        const received: FriendProfile[] = [];

        invitedFriends.forEach(friend => {
            const totalPurchase = friendPurchaseStats[friend.id] || 0;
            const hasCompletedTask = totalPurchase >= FRIEND_PURCHASE_GOAL;
            
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

    }, [invitedFriends, userProfile, friendPurchaseStats]);

    const totalBonus = friendStats.done.length * FRIEND_REWARD_AMOUNT;
    const receivedBonus = friendStats.received.length * FRIEND_REWARD_AMOUNT;
    const allFriendsCount = invitedFriends?.length || 0;
    const doneFriendsCount = friendStats.done.length + friendStats.received.length;

    const handleReceiveRewards = async () => {
        if (!user || friendStats.done.length === 0) return;
        
        setIsClaiming(true);
        const { error } = await supabase.rpc('claim_newbie_friend_rewards', {
            p_user_id: user.id,
            p_claimable_friends: friendStats.done.map(f => f.id),
            p_reward_amount: FRIEND_REWARD_AMOUNT
        });

        if (error) {
            toast({ variant: 'destructive', title: "Claim Failed", description: error.message });
        } else {
            const totalRewardToClaim = friendStats.done.length * FRIEND_REWARD_AMOUNT;
            toast({ title: "Rewards Claimed!", description: `₹${totalRewardToClaim} has been added to your balance.` });
        }
        setIsClaiming(false);
    };
    
    const loading = userLoading || profileLoading || friendsLoading || loadingStats;

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

                <Button className="w-full h-12 text-lg font-bold" onClick={handleReceiveRewards} disabled={isClaiming || totalBonus === 0}>
                    {isClaiming ? <Loader size="xs" /> : `Receive Rewards (₹${totalBonus})`}
                </Button>
                
                <p className="text-sm text-destructive text-center bg-red-100 p-2 rounded-lg">
                   Warning: You will receive ₹200 LG only when your referred user buys ₹1000 worth of LG.
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
                                    const progress = friendPurchaseStats[friend.id] || 0;
                                    return <FriendItem key={friend.id} friend={friend} status={status} progress={progress} goal={FRIEND_PURCHASE_GOAL} />
                                })
                             ) : (
                                <p className="text-center text-sm text-muted-foreground p-4">You haven't invited any friends yet.</p>
                             )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </main>
        </div>
    );
}
