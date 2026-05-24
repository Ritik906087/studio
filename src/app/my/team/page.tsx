'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, Users as UsersIcon, Wallet, TrendingUp, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  id: string;
  uid: string;
  numericId: string;
  photoURL?: string;
  displayName?: string;
  claimedUserRewards?: string[];
};

const AgentItem = ({ agent, inviterUid }: { agent: UserProfile, inviterUid: string }) => {
    const [earningsFromAgent, setEarningsFromAgent] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();

    const isMissionComplete = agent.claimedUserRewards?.includes('nb_final_reward');

    useEffect(() => {
        if (!firestore || !agent.id || !inviterUid) return;
        
        async function fetchAgentStats() {
            setLoading(true);
            try {
                // 1. Calculate Earnings from this specific agent (description matching agent numericId)
                const txQuery = query(
                    collection(firestore, 'users', inviterUid, 'transactions'), 
                    where('type', '==', 'team_bonus')
                );
                const txSnap = await getDocs(txQuery);
                let total = 0;
                txSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.description?.includes(agent.numericId)) {
                        total += (data.amount || 0);
                    }
                });
                setEarningsFromAgent(total);

                // 2. Fetch completed orders count for nodes display
                const ordersQuery = query(collection(firestore, 'users', agent.id, 'orders'), where('status', '==', 'completed'));
                const ordersSnap = await getDocs(ordersQuery);
                setTotalOrders(ordersSnap.size);
            } catch (e) {
                console.error("Error fetching agent stats:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchAgentStats();
    }, [agent.id, agent.numericId, inviterUid, firestore]);

    return (
        <div className="flex items-center gap-3 p-4 border-b border-slate-50 last:border-b-0 active:bg-slate-50/50 transition-colors">
            <Avatar className="h-11 w-11 border border-slate-100 shadow-sm shrink-0">
                <AvatarImage src={agent.photoURL} />
                <AvatarFallback className="bg-slate-50 text-slate-400 font-black text-xs uppercase">
                    {agent.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-black text-slate-800 text-[13px] truncate">UID: {agent.numericId}</p>
                    {isMissionComplete && (
                        <span className="flex items-center gap-0.5 bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border border-green-100">
                             Complete
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                    {loading ? (
                        <Skeleton className="h-3 w-24" />
                    ) : (
                        <>
                            <div className="flex flex-col">
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Your Earnings</p>
                                <p className="text-[11px] font-black text-teal-600 leading-none">₹{earningsFromAgent.toFixed(2)}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Trade Nodes</p>
                                <p className="text-[11px] font-black text-blue-600 leading-none">{totalOrders}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
             <div className="flex flex-col items-end gap-1.5">
                {isMissionComplete ? (
                     <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-200" />
                )}
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Verified</span>
            </div>
        </div>
    );
};

const MiniStat = ({ title, value, color, icon: Icon }: any) => (
    <div className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 mb-1 opacity-60">
            {Icon && <Icon className="h-3 w-3" />}
            <p className="text-[8px] font-black text-white uppercase tracking-widest leading-none">{title}</p>
        </div>
        <p className={cn("text-xl font-black tracking-tight", color)}>{value}</p>
    </div>
);

export default function TeamPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [l1Agents, setL1Agents] = useState<UserProfile[]>([]);
    const [l2Agents, setL2Agents] = useState<UserProfile[]>([]);
    const [selfIncome, setSelfIncome] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // 1. Fetch Level 1 Members
        const l1Query = query(collection(firestore, 'users'), where('inviterUid', '==', user.uid));
        const unsubscribeL1 = onSnapshot(l1Query, async (snap) => {
            const agents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            setL1Agents(agents);
            
            // 2. Fetch Level 2 Members if L1 exists
            if (agents.length > 0) {
                const l1Ids = agents.map(a => a.id);
                // Firestore 'in' limit is 30, for a prototype we'll take the first 30 L1 members' L2s
                const l2Query = query(collection(firestore, 'users'), where('inviterUid', 'in', l1Ids.slice(0, 30)));
                const l2Snap = await getDocs(l2Query);
                setL2Agents(l2Snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
            } else {
                setL2Agents([]);
            }
            setLoading(false);
        });

        // 3. Fetch Total Team Income (sum of team_bonus transactions)
        const incomeQuery = query(collection(firestore, 'users', user.uid, 'transactions'), where('type', '==', 'team_bonus'));
        const unsubscribeIncome = onSnapshot(incomeQuery, (snap) => {
            const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setSelfIncome(total);
        });

        return () => { unsubscribeL1(); unsubscribeIncome(); };
    }, [user, firestore]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <header className="sticky top-0 z-[60] flex items-center gap-2 px-4 py-3 border-b bg-white">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2 rounded-full hover:bg-slate-50">
          <Link href="/my"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
        </Button>
        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">My Family</h1>
      </header>

      <main className="flex-grow flex flex-col">
        {/* DASHBOARD HEADER */}
        <div className="p-5 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><ShieldCheck className="h-32 w-32" /></div>
            
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <MiniStat title="Total Net Bonus" value={loading ? '...' : `₹${selfIncome.toFixed(2)}`} color="text-teal-400" icon={Wallet} />
                <MiniStat title="Family Nodes" value={loading ? '...' : (l1Agents.length + l2Agents.length)} color="text-blue-400" icon={UsersIcon} />
                <MiniStat title="L1 Members" value={l1Agents.length} color="text-white" />
                <MiniStat title="L2 Members" value={l2Agents.length} color="text-white" />
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Commission Map Syncing</span>
                </div>
                <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-blue-100">Live Pool</span>
                </div>
            </div>
        </div>

        {/* FAMILY LIST TABS */}
        <Tabs defaultValue="lv1" className="w-full flex-1 flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b sticky top-[57px] z-50">
              <TabsList className="flex w-full bg-slate-200/50 rounded-xl p-1 h-10 border border-slate-200/40 shadow-inner">
                <TabsTrigger value="lv1" className="flex-1 text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all">Direct (L1)</TabsTrigger>
                <TabsTrigger value="lv2" className="flex-1 text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all">Indirect (L2)</TabsTrigger>
              </TabsList>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
            <TabsContent value="lv1" className="m-0 focus-visible:ring-0">
                {loading ? (
                    <div className="flex justify-center p-16"><Loader size="sm" /></div>
                ) : l1Agents.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {l1Agents.map((agent) => <AgentItem key={agent.id} agent={agent} inviterUid={user?.uid || ''} />)}
                    </div>
                ) : (
                    <div className="text-center py-24 opacity-20 px-8">
                        <UsersIcon className="h-12 w-12 mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No direct family nodes detected in your network</p>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="lv2" className="m-0 focus-visible:ring-0">
                {loading ? (
                    <div className="flex justify-center p-16"><Loader size="sm" /></div>
                ) : l2Agents.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {l2Agents.map((agent) => <AgentItem key={agent.id} agent={agent} inviterUid={user?.uid || ''} />)}
                    </div>
                ) : (
                    <div className="text-center py-24 opacity-20 px-8">
                        <UsersIcon className="h-12 w-12 mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No indirect family nodes detected in your network</p>
                    </div>
                )}
            </TabsContent>
          </div>
        </Tabs>
      </main>
      
      <div className="fixed bottom-0 w-full md:max-w-[390px] bg-white/80 backdrop-blur-md p-4 text-center border-t z-50">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
               <Zap className="h-2.5 w-2.5" /> Node Network Integrity v4.0.2
           </p>
      </div>
    </div>
  );
}
