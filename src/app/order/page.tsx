'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
    const unsubSell = onSnapshot(sellQ, (snap) => { setSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });

    return () => { unsubBuy(); unsubSell(); };
  }, [user, firestore]);

  const OrderItem = ({ o, isBuy }: { o: any, isBuy: boolean }) => (
    <Card className="border-none shadow-sm rounded-2xl p-4 active:bg-slate-50 transition-colors">
       <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", isBuy ? "bg-teal-50 text-teal-600" : "bg-emerald-50 text-emerald-600")}>
                {isBuy ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
             </div>
             <div>
                <p className="font-black text-slate-800 text-sm">{o.orderId}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{o.createdAt?.toDate().toLocaleDateString()}</p>
             </div>
          </div>
          <div className="text-right">
             <p className={cn("font-black text-base", isBuy ? "text-primary" : "text-emerald-600")}>
               {isBuy ? '+' : '-'} ₹{o.amount.toFixed(2)}
             </p>
             <p className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-1", 
               o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
             )}>
               {o.status.replace('_', ' ')}
             </p>
          </div>
       </div>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-full">
      <header className="flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
         <div className="flex items-center gap-3">
           <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <Link href="/home"><ChevronLeft className="h-5 w-5" /></Link>
           </Button>
           <h1 className="text-lg font-black text-slate-800">Order History</h1>
         </div>
      </header>

      <main className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 bg-slate-100 rounded-xl p-1 h-12">
            <TabsTrigger value="buy" className="rounded-lg font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Purchases</TabsTrigger>
            <TabsTrigger value="sell" className="rounded-lg font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Sales</TabsTrigger>
          </TabsList>
          
          <div className="mt-5 space-y-3">
              {loading ? (
                <div className="flex justify-center py-10"><Loader size="sm" /></div>
              ) : (activeTab === 'buy' ? buyOrders : sellOrders).length > 0 ? (
                (activeTab === 'buy' ? buyOrders : sellOrders).map(o => <OrderItem key={o.id} o={o} isBuy={activeTab === 'buy'} />)
              ) : (
                <div className="text-center py-20 opacity-30">
                   <ClipboardList className="h-16 w-16 mx-auto mb-2" />
                   <p className="font-bold text-sm">No transactions yet</p>
                </div>
              )}
          </div>
        </Tabs>
      </main>
    </div>
  );
}