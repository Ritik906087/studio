

'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, ChevronLeft, ClipboardList, History } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';

type Order = {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending_payment' | 'pending_confirmation' | 'completed' | 'cancelled' | 'failed';
  utr?: string;
  createdAt: Timestamp;
  cancellationReason?: string;
};

type SellOrder = {
  id: string;
  orderId: string;
  amount: number;
  remainingAmount: number;
  status: 'pending' | 'partially_filled' | 'processing' | 'completed' | 'failed';
  utr?: string;
  createdAt: Timestamp;
  failureReason?: string;
};

const BuyTransactionCard = React.memo(({ transaction }: { transaction: Order }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied!' });
    });
  };

  const isTimeout = transaction.status === 'failed' && transaction.cancellationReason && (transaction.cancellationReason.includes('expired') || transaction.cancellationReason.includes('timed out'));

  const statusConfig = {
      completed: { style: "bg-green-100 text-green-800", text: "Completed" },
      cancelled: { style: "bg-red-100 text-red-800", text: "Cancelled" },
      failed: { style: isTimeout ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800", text: isTimeout ? "Timeout" : "Failed" },
      pending_confirmation: { style: "bg-blue-100 text-blue-800", text: "Confirming" },
      pending_payment: { style: "bg-yellow-100 text-yellow-800", text: "Pending Payment" }
  }
  const currentStatus = statusConfig[transaction.status] || { style: "bg-gray-100 text-gray-800", text: transaction.status.replace(/_/g, ' ') };

  return (
    <Card className="mb-4 bg-white text-foreground shadow-sm">
      <CardContent className="p-4 space-y-3">
         <div className="flex justify-between items-center">
            <span className="rounded px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800">
              Buy
            </span>
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
                    <span className="font-mono text-muted-foreground" style={{wordBreak: 'break-all'}}>{transaction.utr}</span>
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
              <span className="font-mono text-muted-foreground" style={{wordBreak: 'break-all'}}>{transaction.orderId}</span>
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
        navigator.clipboard.writeText(text).then(() => {
        toast({ title: 'Copied!' });
        });
    };

    const isTimeout = transaction.status === 'failed' && transaction.failureReason && (transaction.failureReason.includes('expired') || transaction.failureReason.includes('timed out'));

    const statusConfig = {
      completed: { style: "bg-green-100 text-green-800", text: "Completed" },
      failed: { style: isTimeout ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800", text: isTimeout ? "Timeout" : "Failed" },
      pending: { style: "bg-yellow-100 text-yellow-800", text: "Pending" },
      partially_filled: { style: "bg-blue-100 text-blue-800", text: "Partially Filled" },
      processing: { style: "bg-blue-100 text-blue-800", text: "Processing" },
    }
    const currentStatus = statusConfig[transaction.status] || { style: "bg-gray-100 text-gray-800", text: transaction.status };
    
    const progress = transaction.amount > 0 ? ((transaction.amount - transaction.remainingAmount) / transaction.amount) * 100 : 0;

    return (
        <Link href={`/order/sell/${transaction.id}`} passHref>
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
                        <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={(e) => {e.preventDefault(); copyToClipboard(transaction.amount.toFixed(2))}} />
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Progress</span>
                    <div className="flex items-center gap-2 w-1/2">
                         <Progress value={progress} className="h-2" />
                         <span className="text-xs font-mono">{progress.toFixed(0)}%</span>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-mono text-muted-foreground text-xs">{transaction.createdAt.toDate().toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Order Number</span>
                    <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground" style={{wordBreak: 'break-all'}}>{transaction.orderId}</span>
                    <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={(e) => {e.preventDefault(); copyToClipboard(transaction.orderId)}} />
                    </div>
                </div>
                </div>
            </CardContent>
            </Card>
        </Link>
    );
});
SellTransactionCard.displayName = 'SellTransactionCard';

const TransactionList = ({ orders, loading, type }: { orders: any[], loading: boolean, type: 'buy' | 'sell' }) => {
  if (loading) {
      return (
        <div className="flex justify-center pt-20">
          <Loader size="md" />
        </div>
      );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground">
        <ClipboardList className="h-16 w-16 opacity-50" />
        <p className="mt-4 text-lg">No transactions found</p>
        <p className="text-sm">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        switch(type) {
            case 'buy':
                return <BuyTransactionCard key={order.id} transaction={order} />;
            case 'sell':
                return <SellTransactionCard key={order.id} transaction={order} />;
            default:
                return null;
        }
      })}
      <p className="text-center text-sm text-muted-foreground/60">No more</p>
    </div>
  );
};

export default function OrderHistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('buy');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all_time');

  const buyOrdersQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [user, firestore]);
  
  const sellOrdersQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'users', user.uid, 'sellOrders'),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
  }, [user, firestore]);

  const { data: buyOrders, loading: buyLoading } = useCollection<Order>(buyOrdersQuery);
  const { data: sellOrders, loading: sellLoading } = useCollection<SellOrder>(sellOrdersQuery);

  const filteredBuyOrders = useMemo(() => {
    if (!buyOrders) return [];
    
    const now = new Date();
    let startDate: Date;
    switch (timeFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'this_week':
        startDate = startOfWeek(now);
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        break;
      default:
        startDate = new Date(0);
    }

    return buyOrders.filter(order => {
      const createdAtDate = order.createdAt.toDate();
      const isAfterStartDate = timeFilter === 'all_time' || isAfter(createdAtDate, startDate);
      if (!isAfterStartDate) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return order.status === 'completed';
      if (statusFilter === 'pending') return ['pending_payment', 'pending_confirmation'].includes(order.status);
      if (statusFilter === 'failed') return ['failed', 'cancelled'].includes(order.status);
      
      return true;
    });
  }, [buyOrders, statusFilter, timeFilter]);

  const filteredSellOrders = useMemo(() => {
    if (!sellOrders) return [];

    const now = new Date();
    let startDate: Date;
    switch (timeFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'this_week':
        startDate = startOfWeek(now);
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        break;
      default:
        startDate = new Date(0);
    }

    return sellOrders.filter(order => {
      const createdAtDate = order.createdAt.toDate();
      const isAfterStartDate = timeFilter === 'all_time' || isAfter(createdAtDate, startDate);
      if (!isAfterStartDate) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return order.status === 'completed';
      if (statusFilter === 'pending') return ['pending', 'partially_filled', 'processing'].includes(order.status);
      if (statusFilter === 'failed') return order.status === 'failed';
      
      return true;
    });
  }, [sellOrders, statusFilter, timeFilter]);

  const loading = buyLoading || sellLoading;
  
  return (
    <div className="text-foreground min-h-screen">
      <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/home">
                <ChevronLeft className="h-6 w-6 text-muted-foreground" />
            </Link>
        </Button>
        <h1 className="text-xl font-bold">Order History</h1>
        <div className="w-8"></div>
      </header>

      <main className="p-4">
          <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
             <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto mb-4 border-b">
                <TabsTrigger value="buy" className="text-base data-[state=active]:font-bold data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground p-3">My Purchases</TabsTrigger>
                <TabsTrigger value="sell" className="text-base data-[state=active]:font-bold data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground p-3">My Sales</TabsTrigger>
             </TabsList>
             
              <div className="my-4 grid grid-cols-2 gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full bg-white border-border rounded-lg h-11">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed/Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-full bg-white border-border rounded-lg h-11">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_time">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

             <TabsContent value="buy">
                <TransactionList orders={filteredBuyOrders} loading={loading} type="buy"/>
             </TabsContent>
             <TabsContent value="sell">
                <TransactionList orders={filteredSellOrders} loading={loading} type="sell"/>
             </TabsContent>
          </Tabs>
      </main>
    </div>
  );
}
