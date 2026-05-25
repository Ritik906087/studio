
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
    ChevronLeft, 
    ClipboardList, 
    TrendingUp, 
    TrendingDown, 
    Zap, 
    CheckCircle2, 
    AlertCircle,
    ArrowUpRight,
    ArrowDownLeft,
    Clock
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function OrderHistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('all');
  
  const [buyOrders, setBuyOrders] = useState<any[]>([]);
  const [sellOrders, setSellOrders] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
        setLoading(false);
        return;
    }

    setLoading(true);

    // Buy Orders Listener
    const buyRef = collection(firestore, 'users', user.uid, 'orders');
    const unsubBuy = onSnapshot(query(buyRef, orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        setBuyOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'buy' })));
    });

    // Sell Orders Listener
    const sellRef = collection(firestore, 'users', user.uid, 'sellOrders');
    const unsubSell = onSnapshot(query(sellRef, orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        setSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'sell' })));
    });

    // All Ledger (Transactions) Listener
    const txRef = collection(firestore, 'users', user.uid, 'transactions');
    const unsubTx = onSnapshot(query(txRef, orderBy('createdAt', 'desc'), limit(100)), (snap) => {
        setLedger(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'ledger' })));
        setLoading(false);
    });

    return () => {
        unsubBuy();
        unsubSell();
        unsubTx();
    };
  }, [user, firestore]);

  const HistoryItem = ({ item }: { item: any }) => {
    const isOrder = item.type === 'buy' || item.type === 'sell';
    const isBuy = item.type === 'buy';
    const isSell = item.type === 'sell';
    const isLedger = item.type === 'ledger';

    const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return "bg-green-50 text-green-600";
            case 'failed':
            case 'cancelled': return "bg-red-50 text-red-600";
            default: return "bg-orange-50 text-orange-600";
        }
    };

    if (isLedger) {
        return (
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-50 active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Zap className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-[12px] leading-tight uppercase">{item.description || item.type}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-black text-sm text-teal-600">+ ₹{item.amount.toFixed(2)}</p>
                    <p className="text-[8px] font-black uppercase text-slate-300 tracking-tighter">Bonus Credited</p>
                </div>
            </div>
        );
    }

    return (
        <Link href={isBuy ? `/order/${item.id}` : `/order/sell/${item.id}`} className="block">
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-50 active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", isBuy ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600")}>
                        {isBuy ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-[12px] leading-tight">{item.orderId}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                             <Clock className="h-2 w-2 text-slate-300" />
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className={cn("font-black text-sm", isBuy ? "text-indigo-600" : "text-emerald-600")}>
                        {isBuy ? '+' : '-'} ₹{item.amount.toFixed(2)}
                    </p>
                    <div className={cn("text-[7px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 inline-block border", 
                        item.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                    )}>
                        {item.status.replace('_', ' ')}
                    </div>
                </div>
            </div>
        </Link>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="flex items-center gap-3 px-4 py-4 bg-white sticky top-0 z-50 border-b shadow-sm">
         <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2 rounded-full bg-slate-50">
            <Link href="/home"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
         </Button>
         <div className="flex flex-col">
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ledger Registry</h1>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em]">Node-to-Node Audit Logs</p>
         </div>
      </header>

      <main className="flex-grow flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <div className="p-3 bg-slate-50 border-b sticky top-[69px] z-40">
              <TabsList className="grid grid-cols-3 bg-slate-200/50 rounded-xl p-1 h-10 border border-slate-200/40 shadow-inner">
                <TabsTrigger value="all" className="rounded-lg font-black text-[9px] uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">All History</TabsTrigger>
                <TabsTrigger value="buy" className="rounded-lg font-black text-[9px] uppercase data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">Buy logs</TabsTrigger>
                <TabsTrigger value="sell" className="rounded-lg font-black text-[9px] uppercase data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all">Sell logs</TabsTrigger>
              </TabsList>
          </div>
          
          <div className="flex-1">
              {loading ? (
                <div className="flex justify-center p-20"><Loader size="sm" /></div>
              ) : (
                <div className="divide-y divide-slate-50">
                    <TabsContent value="all" className="m-0">
                         {ledger.length > 0 ? ledger.map(l => <HistoryItem key={l.id} item={l} />) : (
                             <div className="text-center py-32 opacity-20"><ClipboardList className="h-12 w-12 mx-auto mb-3" /><p className="font-black text-[10px] uppercase tracking-widest">Empty Ledger</p></div>
                         )}
                    </TabsContent>
                    <TabsContent value="buy" className="m-0">
                         {buyOrders.length > 0 ? buyOrders.map(b => <HistoryItem key={b.id} item={b} />) : (
                             <div className="text-center py-32 opacity-20"><ClipboardList className="h-12 w-12 mx-auto mb-3" /><p className="font-black text-[10px] uppercase tracking-widest">No Purchases</p></div>
                         )}
                    </TabsContent>
                    <TabsContent value="sell" className="m-0">
                         {sellOrders.length > 0 ? sellOrders.map(s => <HistoryItem key={s.id} item={s} />) : (
                             <div className="text-center py-32 opacity-20"><ClipboardList className="h-12 w-12 mx-auto mb-3" /><p className="font-black text-[10px] uppercase tracking-widest">No Sales</p></div>
                         )}
                    </TabsContent>
                </div>
              )}
          </div>
        </Tabs>
      </main>
    </div>
  );
}
