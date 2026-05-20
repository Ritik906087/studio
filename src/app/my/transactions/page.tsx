
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, ChevronLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';

// Type Definitions
type Transaction = {
  id: string;
  orderId?: string;
  amount: number;
  status: string;
  createdAt: any;
  type: string;
  description?: string;
  transactionType: 'buy' | 'sell' | 'invite';
};

const TransactionCard = React.memo(({ transaction }: { transaction: Transaction }) => {
  const { toast } = useToast();
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Copied!' }));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pending_payment':
      case 'pending_confirmation': return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const badgeConfig = {
      buy: { text: 'Buy', color: 'bg-blue-100 text-blue-800' },
      sell: { text: 'Sell', color: 'bg-green-100 text-green-800' },
      invite: { text: 'Invite', color: 'bg-purple-100 text-purple-800' }
  };

  const badge = badgeConfig[transaction.transactionType] || { text: 'Misc', color: 'bg-gray-100 text-gray-800' };

  return (
    <Card className="mb-4 bg-white text-foreground shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className={cn("rounded px-2 py-0.5 text-xs font-bold", badge.color)}>{badge.text}</span>
          <span className={cn("font-semibold text-sm capitalize", getStatusColor(transaction.status), "px-2 py-1 rounded-md")}>
              {transaction.status?.replace(/_/g, ' ') || 'Completed'}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">₹{transaction.amount.toFixed(2)}</span>
            </div>
          </div>
          {transaction.description && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Description</span>
                <span className="text-right">{transaction.description}</span>
              </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Time</span>
            <span className="font-mono text-muted-foreground text-xs">
                {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleString() : 'Just now'}
            </span>
          </div>
          {transaction.orderId && (
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Order ID</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground text-xs truncate max-w-[120px]">{transaction.orderId}</span>
                    <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.orderId!)} />
                </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
TransactionCard.displayName = 'TransactionCard';


export default function AllTransactionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const buyRef = collection(firestore, 'users', user.uid, 'orders');
        const sellRef = collection(firestore, 'users', user.uid, 'sellOrders');
        const txRef = collection(firestore, 'users', user.uid, 'transactions');

        const unsubBuy = onSnapshot(query(buyRef, orderBy('createdAt', 'desc'), limit(50)), (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'buy' } as any));
            updateState(data, 'buy');
        }, (error) => {
            console.error("Buy Trans Listener Error:", error);
            setLoading(false);
        });

        const unsubSell = onSnapshot(query(sellRef, orderBy('createdAt', 'desc'), limit(50)), (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'sell' } as any));
            updateState(data, 'sell');
        }, (error) => {
            console.error("Sell Trans Listener Error:", error);
            setLoading(false);
        });

        const unsubTx = onSnapshot(query(txRef, orderBy('createdAt', 'desc'), limit(50)), (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'invite' } as any));
            updateState(data, 'invite');
        }, (error) => {
            console.error("Misc Trans Listener Error:", error);
            setLoading(false);
        });

        const updateState = (newData: Transaction[], type: string) => {
            setAllTransactions(prev => {
                const filtered = prev.filter(t => t.transactionType !== type);
                const combined = [...filtered, ...newData];
                return combined.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });
            });
            setLoading(false);
        };

        return () => {
            unsubBuy();
            unsubSell();
            unsubTx();
        };
    }, [user, firestore]);

    return (
        <div className="text-foreground min-h-screen bg-secondary">
            <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link href="/my">
                        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">Transaction History</h1>
                <div className="w-8"></div>
            </header>

            <main className="p-4">
                {loading && allTransactions.length === 0 ? (
                     <div className="flex justify-center pt-20">
                        <Loader size="md" />
                     </div>
                ) : allTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground">
                        <ClipboardList className="h-16 w-16 opacity-50" />
                        <p className="mt-4 text-lg">No transactions yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {allTransactions.map((tx) => (
                            <TransactionCard key={tx.id} transaction={tx} />
                        ))}
                         <p className="text-center text-sm text-muted-foreground/60 py-4">No more transactions</p>
                    </div>
                )}
            </main>
        </div>
    );
}
