
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, Users as UsersIcon, Wallet, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/lib/supabase';
import { Loader } from '@/components/ui/loader';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  id: string;
  uid: string;
  numericId: string;
  photoURL?: string;
};

const AgentItem = ({ agent }: { agent: UserProfile }) => {
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const incomePromise = supabase.from('transactions').select('amount').eq('userId', agent.id);
            const ordersPromise = supabase.from('orders').select('id', { count: 'exact' }).eq('userId', agent.id).eq('status', 'completed');
            
            const [incomeRes, ordersRes] = await Promise.all([incomePromise, ordersPromise]);
            
            if (incomeRes.data) {
                setTotalIncome(incomeRes.data.reduce((acc, tx) => acc + (tx.amount || 0), 0));
            }

            if (ordersRes.count !== null) {
                setTotalOrders(ordersRes.count);
            }
            setLoading(false);
        }
        fetchData();
    }, [agent.id]);

    return (
        <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={agent.photoURL} alt={`Avatar for UID ${agent.numericId}`} />
                <AvatarFallback className="bg-primary/10 text-primary">
                    <UsersIcon className="h-6 w-6" />
                </AvatarFallback>
            </Avatar>
            <div className="grid grid-cols-2 flex-1 text-sm gap-x-4 gap-y-1">
                <p className="font-semibold col-span-2">UID: {agent.numericId}</p>
                {loading ? (
                    <>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </>
                ) : (
                    <>
                        <p className="text-muted-foreground"><span className="font-medium text-green-600">₹{totalIncome.toFixed(2)}</span> Income</p>
                        <p className="text-muted-foreground"><span className="font-medium text-primary">{totalOrders}</span> order</p>
                    </>
                )}
            </div>
             <div className={cn("text-xs font-semibold px-2 py-1 rounded-full", "bg-gray-100 text-gray-500")}>
                Offline
            </div>
        </div>
    );
};


const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string | number, icon: React.ElementType, colorClass: string }) => (
    <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-full", colorClass)}>
            <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="font-bold text-lg">{value}</p>
        </div>
    </div>
);


export default function TeamPage() {
    const { user } = useUser();
    const [l1Agents, setL1Agents] = useState<UserProfile[]>([]);
    const [l2Agents, setL2Agents] = useState<UserProfile[]>([]);
    const [selfIncome, setSelfIncome] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if(!user) {
                setLoading(false);
                return;
            };

            setLoading(true);

            const { data: l1Data } = await supabase.from('users').select('id, uid, numericId, photoURL').eq('inviterUid', user.uid);
            setL1Agents(l1Data || []);
            
            if (l1Data && l1Data.length > 0) {
                const l1AgentUids = l1Data.map(agent => agent.id);
                // Supabase 'in' queries can handle up to ~1000 items, but chunking for very large lists is a good practice.
                const { data: l2Data } = await supabase.from('users').select('id, uid, numericId, photoURL').in('inviterUid', l1AgentUids);
                setL2Agents(l2Data || []);
            }

            const { data: incomeData } = await supabase.from('transactions').select('amount').eq('userId', user.id).eq('type', 'team_bonus');
            if(incomeData) {
                setSelfIncome(incomeData.reduce((acc, tx) => acc + (tx.amount || 0), 0));
            }
            
            setLoading(false);
        }
        fetchData();
    }, [user]);


  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Team</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow p-4 space-y-4">
        <Card className="bg-white">
            <CardContent className="grid grid-cols-2 gap-y-6 p-4">
                <StatCard title="Income" value={loading ? '...' : `₹${selfIncome.toFixed(2)}`} icon={Wallet} colorClass="bg-primary" />
                <StatCard title="Today's income" value="₹0" icon={Wallet} colorClass="bg-accent" />
                <StatCard title="Team size" value={loading ? '...' : (l1Agents.length + l2Agents.length)} icon={UsersIcon} colorClass="bg-green-500" />
                <StatCard title="New members today" value="0" icon={UserPlus} colorClass="bg-orange-500" />
            </CardContent>
        </Card>

        <Tabs defaultValue="lv1" className="w-full">
          <TabsList className="flex w-full bg-white rounded-lg border p-1">
            <TabsTrigger value="lv1" className="flex-1 text-base data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md bg-transparent text-muted-foreground p-2.5">Team L1</TabsTrigger>
            <TabsTrigger value="lv2" className="flex-1 text-base data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md bg-transparent text-muted-foreground p-2.5">Team L2</TabsTrigger>
          </TabsList>
          <TabsContent value="lv1" className="bg-white mt-4 rounded-lg border">
            {loading ? (
                <div className="flex justify-center p-8"><Loader size="sm" /></div>
            ) : l1Agents.length > 0 ? (
                <div>
                    {l1Agents.map((agent) => <AgentItem key={agent.id} agent={agent} />)}
                </div>
            ) : (
                <p className="text-center text-muted-foreground p-8">No Level 1 members found.</p>
            )}
          </TabsContent>
          <TabsContent value="lv2" className="bg-white mt-4 rounded-lg border">
             {loading ? (
                <div className="flex justify-center p-8"><Loader size="sm" /></div>
             ) : l2Agents && l2Agents.length > 0 ? (
                <div>
                    {l2Agents.map((agent) => <AgentItem key={agent.id} agent={agent} />)}
                </div>
            ) : (
                <p className="text-center text-muted-foreground p-8">No Level 2 members found.</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
