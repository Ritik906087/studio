
'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Copy, ChevronLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';

// Type Definitions
type Order = {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending_payment' | 'processing' | 'completed' | 'cancelled' | 'failed';
  utr?: string;
  createdAt: Timestamp;
  cancellationReason?: string;
};

type SellOrder = {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  utr?: string;
  createdAt: Timestamp;
  failureReason?: string;
};

type RewardTransaction = {
    id: string;
    orderId: string;
    amount: number;
    description: string;
    type: 'team_bonus' | 'daily_task' | 'new_user_reward';
    createdAt: Timestamp;
}

type CombinedTransaction = (Order | SellOrder | RewardTransaction) & { transactionType: 'buy' | 'sell' | 'invite' };

// Card Components
const BuyTransactionCard = React.memo(({ transaction }: { transaction: Order }) => {
  const { toast } = useToast();
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Copied!' }));
  };

  const isTimeout = transaction.status === 'failed' && transaction.cancellationReason && (transaction.cancellationReason.includes('expired') || transaction.cancellationReason.includes('timed out'));
  const statusConfig = {
    completed: { style: "bg-green-100 text-green-800", text: "Completed" },
    cancelled: { style: "bg-red-100 text-red-800", text: "Cancelled" },
    failed: { style: isTimeout ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800", text: isTimeout ? "Timeout" : "Failed" },
    processing: { style: "bg-blue-100 text-blue-800", text: "Processing" },
    pending_payment: { style: "bg-yellow-100 text-yellow-800", text: "Pending Payment" }
  };
  const currentStatus = statusConfig[transaction.status] || { style: "bg-gray-100 text-gray-800", text: transaction.status.replace(/_/g, ' ') };

  return (
    <Card className="mb-4 bg-white text-foreground shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="rounded px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800">Buy</span>
          <span className={cn("font-semibold text-sm capitalize", currentStatus.style, "px-2 py-1 rounded-md")}>{currentStatus.text}</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">₹{transaction.amount.toFixed(2)}</span>
              <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.amount.toFixed(2))} />
            </div>
          </div>
          {transaction.utr && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">UTR</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground" style={{ wordBreak: 'break-all' }}>{transaction.utr}</span>
                <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.utr!)} />
              </div>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Time</span>
            <span className="font-mono text-muted-foreground text-xs">{transaction.createdAt.toDate().toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Order Number</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground" style={{ wordBreak: 'break-all' }}>{transaction.orderId}</span>
              <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.orderId)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
BuyTransactionCard.displayName = 'BuyTransactionCard';

const SellTransactionCard = React.memo(({ transaction }: { transaction: SellOrder }) => {
    const { toast } = useToast();
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => toast({ title: 'Copied!' }));
    };
    const isTimeout = transaction.status === 'failed' && transaction.failureReason && (transaction.failureReason.includes('expired') || transaction.failureReason.includes('timed out'));
    const statusConfig = {
      completed: { style: "bg-green-100 text-green-800", text: "Completed" },
      failed: { style: isTimeout ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800", text: isTimeout ? "Timeout" : "Failed" },
      pending: { style: "bg-yellow-100 text-yellow-800", text: "Pending" },
      processing: { style: "bg-blue-100 text-blue-800", text: "Processing" },
    };
    const currentStatus = statusConfig[transaction.status] || { style: "bg-gray-100 text-gray-800", text: transaction.status };

    return (
        <Card className="mb-4 bg-white text-foreground shadow-sm">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">Sell</span>
                    <span className={cn("font-semibold text-sm capitalize", currentStatus.style, "px-2 py-1 rounded-md")}>{currentStatus.text}</span>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">₹{transaction.amount.toFixed(2)}</span>
                            <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.amount.toFixed(2))} />
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">UTR</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground" style={{ wordBreak: 'break-all' }}>{transaction.utr || '---'}</span>
                            {transaction.utr && <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.utr!)} />}
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-mono text-muted-foreground text-xs">{transaction.createdAt.toDate().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Order Number</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground" style={{ wordBreak: 'break-all' }}>{transaction.orderId}</span>
                            <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.orderId)} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});
SellTransactionCard.displayName = 'SellTransactionCard';

const InviteTransactionCard = React.memo(({ transaction }: { transaction: RewardTransaction }) => {
  const { toast } = useToast();
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Copied!' }));
  };

  return (
    <Card className="mb-4 bg-white text-foreground shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="rounded px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-800">Invite</span>
          <span className={cn("font-semibold text-sm capitalize", "bg-green-100 text-green-800", "px-2 py-1 rounded-md")}>Completed</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">₹{transaction.amount.toFixed(2)}</span>
              <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.amount.toFixed(2))} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Time</span>
            <span className="font-mono text-muted-foreground text-xs">{transaction.createdAt.toDate().toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Order Number</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground" style={{ wordBreak: 'break-all' }}>{transaction.orderId}</span>
              <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.orderId)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
InviteTransactionCard.displayName = 'InviteTransactionCard';


export default function AllTransactionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch Buy Orders
    const buyOrdersQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'orders'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
    }, [user, firestore]);

    // Fetch Sell Orders
    const sellOrdersQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'sellOrders'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
    }, [user, firestore]);

    // Fetch Invite Rewards
    const inviteRewardsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'transactions'),
            where('type', '==', 'team_bonus'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
    }, [user, firestore]);

    const { data: buyOrders, loading: buyLoading } = useCollection<Order>(buyOrdersQuery);
    const { data: sellOrders, loading: sellLoading } = useCollection<SellOrder>(sellOrdersQuery);
    const { data: inviteRewards, loading: inviteLoading } = useCollection<RewardTransaction>(inviteRewardsQuery);

    const allTransactions = useMemo(() => {
        const buys: CombinedTransaction[] = (buyOrders || []).map(o => ({ ...o, transactionType: 'buy' }));
        const sells: CombinedTransaction[] = (sellOrders || []).map(o => ({ ...o, transactionType: 'sell' }));
        const invites: CombinedTransaction[] = (inviteRewards || []).map(o => ({ ...o, transactionType: 'invite' }));

        const combined = [...buys, ...sells, ...invites];
        
        return combined.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [buyOrders, sellOrders, inviteRewards]);

    const loading = buyLoading || sellLoading || inviteLoading;
    
    return (
        <div className="text-foreground min-h-screen">
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
                {loading ? (
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
                        {allTransactions.map((tx, index) => {
                            if (tx.transactionType === 'buy') {
                                return <BuyTransactionCard key={`buy-${tx.id}-${index}`} transaction={tx as Order} />;
                            }
                            if (tx.transactionType === 'sell') {
                                return <SellTransactionCard key={`sell-${tx.id}-${index}`} transaction={tx as SellOrder} />;
                            }
                            if (tx.transactionType === 'invite') {
                                return <InviteTransactionCard key={`invite-${tx.id}-${index}`} transaction={tx as RewardTransaction} />;
                            }
                            return null;
                        })}
                         <p className="text-center text-sm text-muted-foreground/60">No more</p>
                    </div>
                )}
            </main>
        </div>
    );
}
