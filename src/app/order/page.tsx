'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';

export default function OrderHistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('buy');
  const [buyOrders, setBuyOrders] = useState<any[]>([]);
  const [sellOrders, setSellOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    setLoading(true);

    const buyQ = query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc'));
    const sellQ = query(collection(firestore, 'users', user.uid, 'sellOrders'), orderBy('createdAt', 'desc'));

    const unsubBuy = onSnapshot(buyQ, (snap) => setBuyOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSell = onSnapshot(sellQ, (snap) => { setSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });

    return () => { unsubBuy(); unsubSell(); };
  }, [user, firestore]);

  const List = ({ items }: { items: any[] }) => (
    <div className="space-y-3">
        {items.map(o => (
            <Card key={o.id} className="p-3 text-sm">
                <div className="flex justify-between font-bold mb-2"><span>{o.orderId}</span><span className="text-primary">₹{o.amount}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>{o.status}</span><span>{o.createdAt?.toDate().toLocaleString()}</span></div>
            </Card>
        ))}
        {items.length === 0 && <div className="text-center p-8 opacity-50"><ClipboardList className="mx-auto" /><p>No orders</p></div>}
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-4"><Button asChild variant="ghost" size="icon"><Link href="/home"><ChevronLeft /></Link></Button><h1 className="text-xl font-bold">Orders</h1></header>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2"><TabsTrigger value="buy">Purchases</TabsTrigger><TabsTrigger value="sell">Sales</TabsTrigger></TabsList>
        <div className="mt-4">
            {loading ? <div className="flex justify-center p-8"><Loader /></div> : (activeTab === 'buy' ? <List items={buyOrders} /> : <List items={sellOrders} />)}
        </div>
      </Tabs>
    </div>
  );
}
