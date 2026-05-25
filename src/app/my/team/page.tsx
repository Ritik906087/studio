
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, Users as UsersIcon, Wallet, TrendingUp, CheckCircle2, ShieldCheck, Zap, ArrowRight, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

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
        <div className="group relative overflow-hidden bg-white rounded-2xl p-4 mb-3 border border-slate-50 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-md transition-transform group-hover:scale-105">
                        <AvatarImage src={agent.photoURL} />
                        <AvatarFallback className="bg-slate-100 text-slate-500 font-black text-sm uppercase">
                            {agent.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    {isMissionComplete && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white shadow-sm">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="font-black text-slate-800 text-[13px] tracking-tight truncate">UID: {agent.numericId}</p>
                        {isMissionComplete && (
                            <span className="text-[7px] font-black uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">Verified Node</span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2">
                        {loading ? (
                            <div className="flex gap-4 w-full">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Net Profit</p>
                                    <p className="text-[12px] font-black text-teal-600 tabular-nums">₹{earningsFromAgent.toFixed(2)}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Activity</p>
                                    <p className="text-[12px] font-black text-blue-600 tabular-nums">{totalOrders} Nodes</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />
            </div>
            
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 opacity-40 pointer-events-none group-hover:bg-blue-50 transition-colors" />
        </div>
    );
};

const MiniStat = ({ title, value, color, icon: Icon, sub }: any) => (
    <div className="flex flex-col p-4 bg-white/5 rounded-[22px] border border-white/5 backdrop-blur-md relative overflow-hidden group">
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 opacity-60">
                {Icon && <Icon className="h-3 w-3" />}
                <p className="text-[8px] font-black text-white uppercase tracking-[0.2em] leading-none">{title}</p>
            </div>
            <p className={cn("text-2xl font-black tracking-tighter tabular-nums", color)}>{value}</p>
            {sub && <p className="text-[7px] font-bold text-white/40 mt-1 uppercase">{sub}</p>}
        </div>
        <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/5 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />
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

        const l1Query = query(collection(firestore, 'users'), where('inviterUid', '==', user.uid));
        const unsubscribeL1 = onSnapshot(l1Query, async (snap) => {
            const agents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            setL1Agents(agents);
            
            if (agents.length > 0) {
                const l1Ids = agents.map(a => a.id);
                const l2Query = query(collection(firestore, 'users'), where('inviterUid', 'in', l1Ids.slice(0, 30)));
                const l2Snap = await getDocs(l2Query);
                setL2Agents(l2Snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
            } else {
                setL2Agents([]);
            }
            setLoading(false);
        });

        const incomeQuery = query(collection(firestore, 'users', user.uid, 'transactions'), where('type', '==', 'team_bonus'));
        const unsubscribeIncome = onSnapshot(incomeQuery, (snap) => {
            const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setSelfIncome(total);
        });

        return () => { unsubscribeL1(); unsubscribeIncome(); };
    }, [user, firestore]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] font-body">
      <header className="sticky top-0 z-[60] flex items-center gap-3 px-4 py-4 border-b bg-white shadow-sm">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-1.5 rounded-full bg-slate-50 hover:bg-slate-100">
          <Link href="/my"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
        </Button>
        <div className="flex flex-col">
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">My Family</h1>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em]">Network Hierarchy Tree</p>
        </div>
      </header>

      <main className="flex-grow flex flex-col">
        <div className="p-5 bg-slate-900 text-white relative overflow-hidden rounded-b-[40px] shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none animate-pulse"><ShieldCheck className="h-40 w-40" /></div>
            
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <MiniStat title="Total Net Bonus" value={loading ? '...' : `₹${selfIncome.toFixed(2)}`} color="text-teal-400" icon={Wallet} sub="Lifetime Commissions" />
                <MiniStat title="Family Nodes" value={loading ? '...' : (l1Agents.length + l2Agents.length)} color="text-blue-400" icon={UsersIcon} sub="Connected Channels" />
                <MiniStat title="L1 Members" value={l1Agents.length} color="text-white" sub="Direct Network" />
                <MiniStat title="L2 Members" value={l2Agents.length} color="text-white" sub="Indirect Network" />
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-teal-500/10 rounded-lg">
                        <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                    </div>
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Protocol Syncing</span>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 backdrop-blur-md">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-blue-100">Live Engine</span>
                </div>
            </div>
        </div>

        <Tabs defaultValue="lv1" className="w-full flex-1 flex flex-col mt-2">
          <div className="px-4 py-3 bg-transparent sticky top-[69px] z-50">
              <TabsList className="flex w-full bg-slate-200/40 rounded-2xl p-1 h-11 border border-slate-200/20 backdrop-blur-xl shadow-sm">
                <TabsTrigger value="lv1" className="flex-1 text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md rounded-xl transition-all duration-300">Level 1 (Direct)</TabsTrigger>
                <TabsTrigger value="lv2" className="flex-1 text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md rounded-xl transition-all duration-300">Level 2 (Indirect)</TabsTrigger>
              </TabsList>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-32 px-4">
            <TabsContent value="lv1" className="m-0 focus-visible:ring-0 pt-2 animate-in fade-in slide-in-from-bottom-2">
                {loading ? (
                    <div className="space-y-3 pt-4"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-24 w-full rounded-2xl" /></div>
                ) : l1Agents.length > 0 ? (
                    <div>{l1Agents.map((agent) => <AgentItem key={agent.id} agent={agent} inviterUid={user?.uid || ''} />)}</div>
                ) : (
                    <div className="text-center py-24 opacity-30 px-8 flex flex-col items-center">
                        <UsersIcon className="h-16 w-16 mb-4 text-slate-300" />
                        <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">No direct network nodes detected</p>
                        <Button asChild variant="link" className="mt-4 text-[10px] font-black uppercase tracking-tight text-primary">
                            <Link href="/invite">Invite Friends Now</Link>
                        </Button>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="lv2" className="m-0 focus-visible:ring-0 pt-2 animate-in fade-in slide-in-from-bottom-2">
                {loading ? (
                    <div className="space-y-3 pt-4"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-24 w-full rounded-2xl" /></div>
                ) : l2Agents.length > 0 ? (
                    <div>{l2Agents.map((agent) => <AgentItem key={agent.id} agent={agent} inviterUid={user?.uid || ''} />)}</div>
                ) : (
                    <div className="text-center py-24 opacity-30 px-8 flex flex-col items-center">
                        <UsersIcon className="h-16 w-16 mb-4 text-slate-300" />
                        <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">No indirect network nodes detected</p>
                    </div>
                )}
            </TabsContent>
          </div>
        </Tabs>
      </main>
      
      <div className="fixed bottom-0 w-full md:max-w-[390px] bg-white/90 backdrop-blur-xl p-4 text-center border-t z-50">
           <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
               <div className="h-px w-6 bg-slate-100" />
               <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />
               Node Network v4.2.1
               <div className="h-px w-6 bg-slate-100" />
           </div>
      </div>
    </div>
  );
}
