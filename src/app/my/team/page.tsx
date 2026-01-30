'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, Users as UsersIcon, Wallet, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, DocumentData, Query } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';

type UserProfile = {
  id: string;
  uid: string;
  numericId: string;
  photoURL?: string;
};

const AgentItem = ({ agent }: { agent: UserProfile }) => (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={agent.photoURL} alt={`Avatar for UID ${agent.numericId}`} />
            <AvatarFallback className="bg-primary/10 text-primary">
                <UsersIcon className="h-6 w-6" />
            </AvatarFallback>
        </Avatar>
        <div className="grid grid-cols-2 flex-1 text-sm gap-x-4 gap-y-1">
            <p className="font-semibold col-span-2">UID: {agent.numericId}</p>
            <p className="text-muted-foreground"><span className="font-medium text-green-600">0</span> Income</p>
            <p className="text-muted-foreground"><span className="font-medium text-primary">0</span> order</p>
        </div>
         <div className={cn("text-xs font-semibold px-2 py-1 rounded-full", "bg-gray-100 text-gray-500")}>
            Offline
        </div>
    </div>
);

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
    const firestore = useFirestore();

    const l1Query = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users'), where('inviterUid', '==', user.uid));
    }, [user, firestore]);

    const { data: l1Agents, loading: l1Loading } = useCollection<UserProfile>(l1Query);

    const l1AgentUids = useMemo(() => l1Agents.map(agent => agent.uid), [l1Agents]);

    const [l2Query, setL2Query] = useState<Query<DocumentData> | null>(null);

    useEffect(() => {
        if (firestore && l1AgentUids.length > 0) {
            // Firestore 'in' queries are limited to 30 items.
            setL2Query(query(collection(firestore, 'users'), where('inviterUid', 'in', l1AgentUids.slice(0, 30))));
        } else {
            setL2Query(null);
        }
    }, [firestore, l1AgentUids]);

    const { data: l2Agents, loading: l2Loading } = useCollection<UserProfile>(l2Query);
    
    const loading = l1Loading || (l1AgentUids.length > 0 && l2Loading);

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
                <StatCard title="Income" value="₹0" icon={Wallet} colorClass="bg-primary" />
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
             ) : l2Agents.length > 0 ? (
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
