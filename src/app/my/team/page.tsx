
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronLeft, RefreshCw, X, Users as UsersIcon, Wallet, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Agent = {
  uid: string;
  photoURL?: string;
  online: boolean;
  rebate: number;
  subordinates: number;
};

// Placeholder data similar to the image
const dummyAgentsLv1: Agent[] = [
  { uid: '17549362', online: false, rebate: 0, subordinates: 0 },
  { uid: '16948000', online: false, rebate: 0, subordinates: 0 },
  { uid: '16465543', online: false, rebate: 0, subordinates: 0 },
  { uid: '16209957', online: false, rebate: 0, subordinates: 0 },
  { uid: '16160664', photoURL: 'https://picsum.photos/seed/16160664/100/100', online: false, rebate: 202, subordinates: 0 },
  { uid: '15452250', online: false, rebate: 0, subordinates: 0 },
  { uid: '15192302', photoURL: 'https://picsum.photos/seed/15192302/100/100', online: false, rebate: 320, subordinates: 0 },
  { uid: '14587879', online: false, rebate: 0, subordinates: 0 },
];

const dummyAgentsLv2: Agent[] = [
    { uid: '13549362', online: true, rebate: 50, subordinates: 2 },
    { uid: '12948000', photoURL: 'https://picsum.photos/seed/12948000/100/100', online: false, rebate: 150, subordinates: 5 },
];


const AgentItem = ({ agent }: { agent: Agent }) => (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={agent.photoURL} alt={`Avatar for UID ${agent.uid}`} />
            <AvatarFallback className="bg-primary/10 text-primary">
                <UsersIcon className="h-6 w-6" />
            </AvatarFallback>
        </Avatar>
        <div className="grid grid-cols-2 flex-1 text-sm gap-x-4 gap-y-1">
            <p className="font-semibold col-span-2">UID: {agent.uid}</p>
            <p className="text-muted-foreground"><span className="font-medium text-green-600">{agent.rebate}</span> Income</p>
            <p className="text-muted-foreground"><span className="font-medium text-primary">{agent.subordinates}</span> order</p>
        </div>
         <div className={cn("text-xs font-semibold px-2 py-1 rounded-full", agent.online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500")}>
            {agent.online ? 'Online' : 'Offline'}
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


export default function TeamCenterPage() {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    }

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Team Center</h1>
        <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="ghost" size="icon" className="h-8 w-8" disabled={isRefreshing}>
                <RefreshCw className={`h-5 w-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link href="/my">
                    <X className="h-6 w-6 text-muted-foreground" />
                </Link>
            </Button>
        </div>
      </header>

      <main className="flex-grow p-4 space-y-4">
        <Card className="bg-white">
            <CardContent className="grid grid-cols-2 gap-y-6 p-4">
                <StatCard title="Income" value="₹522" icon={Wallet} colorClass="bg-primary" />
                <StatCard title="Today's income" value="₹0" icon={Wallet} colorClass="bg-accent" />
                <StatCard title="Team size" value="10" icon={UsersIcon} colorClass="bg-green-500" />
                <StatCard title="New members today" value="0" icon={UserPlus} colorClass="bg-orange-500" />
            </CardContent>
        </Card>

        <Tabs defaultValue="lv1" className="w-full">
          <TabsList className="flex w-full bg-white rounded-lg border p-1">
            <TabsTrigger value="lv1" className="flex-1 text-base data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md bg-transparent text-muted-foreground p-2.5">Team L1</TabsTrigger>
            <TabsTrigger value="lv2" className="flex-1 text-base data-[state=active]:font-bold data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md bg-transparent text-muted-foreground p-2.5">Team L2</TabsTrigger>
          </TabsList>
          <TabsContent value="lv1" className="bg-white mt-4 rounded-lg border">
            {dummyAgentsLv1.length > 0 ? (
                <div>
                    {dummyAgentsLv1.map((agent) => <AgentItem key={agent.uid} agent={agent} />)}
                </div>
            ) : (
                <p className="text-center text-muted-foreground p-8">No Level 1 agents found.</p>
            )}
          </TabsContent>
          <TabsContent value="lv2" className="bg-white mt-4 rounded-lg border">
             {dummyAgentsLv2.length > 0 ? (
                <div>
                    {dummyAgentsLv2.map((agent) => <AgentItem key={agent.uid} agent={agent} />)}
                </div>
            ) : (
                <p className="text-center text-muted-foreground p-8">No Level 2 agents found.</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
