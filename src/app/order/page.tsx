'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ClipboardList, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    const unsubSell = onSnapshot(sellQ, (snap) => { 
        setSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        setLoading(false); 
    });

    return () => { unsubBuy(); unsubSell(); };
  }, [user, firestore]);

  const OrderItem = ({ o, isBuy }: { o: any, isBuy: boolean }) => (
    <Link href={isBuy ? `/order/${o.id}` : `/order/sell/${o.id}`} className="block">
        <div className="flex items-center justify-between p-3 bg-white border-b border-slate-50 active:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
             <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", isBuy ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600")}>
                {isBuy ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
             </div>
             <div>
                <p className="font-black text-slate-800 text-[13px] leading-none">{o.orderId}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{o.createdAt?.toDate().toLocaleDateString()} • {o.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
             </div>
          </div>
          <div className="text-right">
             <p className={cn("font-black text-sm", isBuy ? "text-primary" : "text-emerald-600")}>
               {isBuy ? '+' : '-'} ₹{o.amount.toFixed(2)}
             </p>
             <p className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 inline-block", 
               o.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
             )}>
               {o.status.replace('_', ' ')}
             </p>
          </div>
        </div>
    </Link>
  );

  return (
    <div className="flex flex-col min-h-full bg-white">
      <header className="flex items-center gap-3 px-4 py-3 bg-white sticky top-0 z-50 border-b">
         <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
            <Link href="/home"><ChevronLeft className="h-5 w-5" /></Link>
         </Button>
         <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Order Logs</h1>
      </header>

      <main className="flex-grow">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="p-3 bg-slate-50 border-b">
              <TabsList className="grid grid-cols-2 bg-slate-200/50 rounded-lg p-1 h-9">
                <TabsTrigger value="buy" className="rounded-md font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Purchases</TabsTrigger>
                <TabsTrigger value="sell" className="rounded-md font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Sales</TabsTrigger>
              </TabsList>
          </div>
          
          <div>
              {loading ? (
                <div className="flex justify-center py-20"><Loader size="sm" /></div>
              ) : (activeTab === 'buy' ? buyOrders : sellOrders).length > 0 ? (
                (activeTab === 'buy' ? buyOrders : sellOrders).map(o => <OrderItem key={o.id} o={o} isBuy={activeTab === 'buy'} />)
              ) : (
                <div className="text-center py-32 opacity-20">
                   <ClipboardList className="h-12 w-12 mx-auto mb-3" />
                   <p className="font-black text-[10px] uppercase tracking-widest">No Activity Records</p>
                </div>
              )}
          </div>
        </Tabs>
      </main>
    </div>
  );
}
