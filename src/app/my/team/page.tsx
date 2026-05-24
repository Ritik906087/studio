
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, Users as UsersIcon, Wallet, UserPlus, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  id: string;
  uid: string;
  numericId: string;
  photoURL?: string;
  displayName?: string;
};

const AgentItem = ({ agent }: { agent: UserProfile }) => {
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();

    useEffect(() => {
        if (!firestore || !agent.id) return;
        
        async function fetchData() {
            setLoading(true);
            try {
                const txQuery = query(collection(firestore, 'users', agent.id, 'transactions'), where('type', '==', 'team_bonus'));
                const txSnap = await getDocs(txQuery);
                const income = txSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
                setTotalIncome(income);

                const ordersQuery = query(collection(firestore, 'users', agent.id, 'orders'), where('status', '==', 'completed'));
                const ordersSnap = await getDocs(ordersQuery);
                setTotalOrders(ordersSnap.size);
            } catch (e) {
                console.error("Error fetching agent stats:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [agent.id, firestore]);

    return (
        <div className="flex items-center gap-3 p-3 border-b border-slate-50 last:border-b-0 active:bg-slate-50 transition-colors">
            <Avatar className="h-10 w-10 border border-slate-100 shadow-sm shrink-0">
                <AvatarImage src={agent.photoURL} />
                <AvatarFallback className="bg-slate-50 text-slate-400">
                    <UsersIcon className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-[12px] truncate">UID: {agent.numericId}</p>
                <div className="flex items-center gap-3 mt-0.5">
                    {loading ? (
                        <Skeleton className="h-3 w-20" />
                    ) : (
                        <>
                            <p className="text-[10px] font-bold text-teal-600">₹{totalIncome.toFixed(1)} <span className="text-slate-400 font-medium ml-0.5">Earnings</span></p>
                            <p className="text-[10px] font-bold text-blue-600">{totalOrders} <span className="text-slate-400 font-medium ml-0.5">Orders</span></p>
                        </>
                    )}
                </div>
            </div>
             <div className="flex flex-col items-end gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className="text-[8px] font-black text-slate-300 uppercase">Offline</span>
            </div>
        </div>
    );
};

const MiniStat = ({ title, value, color }: any) => (
    <div className="flex flex-col">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className={cn("text-sm font-black mt-0.5", color)}>{value}</p>
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
            }
            setLoading(false);
        });

        const incomeQuery = query(collection(firestore, 'users', user.uid, 'transactions'), where('type', '==', 'team_bonus'));
        const unsubscribeIncome = onSnapshot(incomeQuery, (snap) => {
            const income = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setSelfIncome(income);
        });

        return () => { unsubscribeL1(); unsubscribeIncome(); };
    }, [user, firestore]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b bg-white">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
          <Link href="/my"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Affiliate Family Map</h1>
      </header>

      <main className="flex-grow flex flex-col">
        <div className="p-4 bg-slate-900 text-white">
            <div className="grid grid-cols-2 gap-y-4">
                <MiniStat title="Net Bonus" value={loading ? '...' : `₹${selfIncome.toFixed(2)}`} color="text-teal-400" />
                <MiniStat title="Daily Intake" value="₹0.00" color="text-white" />
                <MiniStat title="Family Registry" value={loading ? '...' : (l1Agents.length + l2Agents.length)} color="text-blue-400" />
                <MiniStat title="New Members" value="0" color="text-white" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-teal-400" />
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Rotation volume processing active</span>
            </div>
        </div>

        <Tabs defaultValue="lv1" className="w-full">
          <div className="px-4 py-3 bg-slate-50 border-b">
              <TabsList className="flex w-full bg-slate-200/50 rounded-lg p-1 h-9">
                <TabsTrigger value="lv1" className="flex-1 text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">Direct (L1)</TabsTrigger>
                <TabsTrigger value="lv2" className="flex-1 text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">Indirect (L2)</TabsTrigger>
              </TabsList>
          </div>
          
          <TabsContent value="lv1" className="bg-white m-0">
            {loading ? (
                <div className="flex justify-center p-12"><Loader size="sm" /></div>
            ) : l1Agents.length > 0 ? (
                <div className="divide-y divide-slate-50">
                    {l1Agents.map((agent) => <AgentItem key={agent.id} agent={agent} />)}
                </div>
            ) : (
                <div className="text-center py-20 opacity-20">
                    <UsersIcon className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase">Level 1 Empty</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="lv2" className="bg-white m-0">
             {loading ? (
                <div className="flex justify-center p-12"><Loader size="sm" /></div>
             ) : l2Agents.length > 0 ? (
                <div className="divide-y divide-slate-50">
                    {l2Agents.map((agent) => <AgentItem key={agent.id} agent={agent} />)}
                </div>
            ) : (
                <div className="text-center py-20 opacity-20">
                    <UsersIcon className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase">Level 2 Empty</p>
                </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
