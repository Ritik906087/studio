"use client";

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, ChevronLeft, ClipboardList, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';


type Order = {
  id: string;
  amount: number;
  status: string;
  utr: string;
  createdAt: Timestamp;
};

const TransactionCard = ({ transaction }: { transaction: Order }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Order number copied!' });
    });
  };

  return (
    <Card className="mb-4 bg-white text-foreground shadow-sm">
      <CardContent className="p-4 space-y-3">
         <div className="flex justify-between items-center">
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-bold",
                transaction.status === 'completed' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
              )}
            >
              Buy
            </span>
             <span className="font-semibold text-sm capitalize">{transaction.status}</span>
        </div>
        <div className="space-y-2 text-sm">
           <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-primary">₹{transaction.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Time</span>
            <span className="font-mono text-muted-foreground text-xs">{transaction.createdAt.toDate().toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Order Number</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground">{transaction.id}</span>
              <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(transaction.id)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TransactionList = ({ orders, loading }: { orders: Order[], loading: boolean }) => {
  if (loading) {
      return (
        <div className="flex justify-center pt-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground">
        <ClipboardList className="h-16 w-16 opacity-50" />
        <p className="mt-4 text-lg">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <TransactionCard key={order.id} transaction={order} />
      ))}
      <p className="text-center text-sm text-muted-foreground/60">No more</p>
    </div>
  );
};

export default function TransactionPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const completedOrdersQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'orders'),
      where('status', '==', 'completed')
    );
  }, [user, firestore]);

  const { data: completedOrders, loading } = useCollection<Order>(completedOrdersQuery);
  
  return (
    <div className="text-foreground min-h-screen">
       {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/my">
                <ChevronLeft className="h-6 w-6 text-muted-foreground" />
            </Link>
        </Button>
        <h1 className="text-xl font-bold">Transaction</h1>
        <div className="w-8"></div>
      </header>

      <main className="p-4">
          <div className="my-4 grid grid-cols-2 gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-full bg-white border-border rounded-lg h-11">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger className="w-full bg-white border-border rounded-lg h-11">
                <SelectValue placeholder="Choose Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TransactionList orders={completedOrders || []} loading={loading} />
      </main>
    </div>
  );
}
