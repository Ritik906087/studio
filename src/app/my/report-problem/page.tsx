
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Filter,
  History,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  serverTimestamp,
  doc
} from 'firebase/firestore';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';

type Order = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: Timestamp;
};

type SellOrder = Order;

type UserProfile = {
  numericId: string;
};

const ReportDialog = ({
  order,
  orderType,
}: {
  order: Order | SellOrder;
  orderType: 'buy' | 'sell';
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Please describe the problem.' });
      return;
    }
    if (!user || !firestore || !userProfile) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'reports'), {
        userId: user.uid,
        userNumericId: userProfile.numericId,
        orderId: order.id,
        displayOrderId: order.orderId,
        orderType: orderType,
        message: message,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      toast({ title: 'Report Submitted', description: 'We will review your issue shortly.' });
      setOpen(false);
      setMessage('');
    } catch (error: any) {
      console.error('Failed to submit report', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Request Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a Problem</DialogTitle>
          <DialogDescription>
            Describe the issue you're facing with order{' '}
            <span className="font-mono">{order.orderId}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Problem Description</Label>
            <Textarea
              id="message"
              placeholder="Please provide as much detail as possible..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
            {isSubmitting && <Loader size="xs" className="mr-2" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OrderCard = ({
  order,
  orderType,
}: {
  order: Order | SellOrder;
  orderType: 'buy' | 'sell';
}) => {
  return (
    <Card className="bg-white">
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span className="font-mono">{order.orderId}</span>
          <span>{order.createdAt.toDate().toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-bold text-lg">₹{order.amount.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-semibold capitalize">
              {order.status.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <ReportDialog order={order} orderType={orderType} />
        </div>
      </CardContent>
    </Card>
  );
};

const OrderList = ({
  type,
  filters,
}: {
  type: 'buy' | 'sell';
  filters: { status: string; time: string };
}) => {
  const { user } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const collectionName = type === 'buy' ? 'orders' : 'sellOrders';
    return query(
      collection(firestore, 'users', user.uid, collectionName),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
  }, [user, firestore, type]);

  const { data: orders, loading } = useCollection<Order | SellOrder>(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    const now = new Date();
    let startDate: Date;
    switch (filters.time) {
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
        startDate = new Date(0); // all_time
    }

    return orders.filter((order) => {
      const createdAtDate = order.createdAt.toDate();
      const isAfterStartDate = filters.time === 'all_time' || isAfter(createdAtDate, startDate);
      if (!isAfterStartDate) return false;

      if (filters.status === 'all') return true;
      if (filters.status === 'completed') return order.status === 'completed';
      if (filters.status === 'pending') {
        if (type === 'buy')
          return ['pending_payment', 'pending_confirmation'].includes(order.status);
        if (type === 'sell')
          return ['pending', 'partially_filled', 'processing'].includes(order.status);
      }
      if (filters.status === 'failed') {
        return ['failed', 'cancelled'].includes(order.status);
      }
      return true;
    });
  }, [orders, filters, type]);

  if (loading) {
    return (
      <div className="flex justify-center pt-10">
        <Loader size="md" />
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground">
        <ClipboardList className="h-16 w-16 opacity-50" />
        <p className="mt-4 text-lg">No Orders Found</p>
        <p className="text-sm">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredOrders.map((order) => (
        <OrderCard key={order.id} order={order} orderType={type} />
      ))}
    </div>
  );
};

export default function ReportProblemPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all_time');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Report a Problem</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow p-4">
        <Tabs defaultValue="buy" className="w-full">
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
            
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy">Buy History</TabsTrigger>
                <TabsTrigger value="sell">Sell History</TabsTrigger>
            </TabsList>

          <TabsContent value="buy" className="pt-4">
            <OrderList type="buy" filters={{ status: statusFilter, time: timeFilter }} />
          </TabsContent>
          <TabsContent value="sell" className="pt-4">
            <OrderList type="sell" filters={{ status: statusFilter, time: timeFilter }} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
