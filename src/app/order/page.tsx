"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, RefreshCw, X, MessageSquare, History, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  type: 'Buy' | 'Sell';
  status: 'Purchase Failed' | 'Canceled' | 'Completed';
  amount: string;
  details: { label: string; value: string }[];
  showSupport?: boolean;
};

const purchaseOrders: Order[] = [
  {
    id: '1',
    type: 'Buy',
    status: 'Purchase Failed',
    amount: '300.00',
    details: [
      { label: 'Bank card number', value: '3746429555' },
      { label: 'Time', value: '2025-12-27 23:04:42' },
      { label: 'Order Number', value: 'MR2025122723044206613' },
    ],
    showSupport: true,
  },
  {
    id: '2',
    type: 'Buy',
    status: 'Canceled',
    amount: '100.00',
    details: [
      { label: 'UTR', value: '976234072571' },
      { label: 'Time', value: '2025-11-15 00:19:14' },
      { label: 'Order Number', value: 'MR2025111500191308705' },
    ],
  },
];

const salesOrders: Order[] = [];

const OrderCard = ({ order }: { order: Order }) => {
  const getStatusClass = (status: Order['status']) => {
    switch (status) {
      case 'Purchase Failed':
        return 'text-red-500';
      case 'Canceled':
        return 'text-gray-500';
      case 'Completed':
        return 'text-green-500';
      default:
        return 'text-white/80';
    }
  };

  return (
    <Card className="mb-4 border-none bg-white/10 text-white shadow-lg backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/20">
          <span className="rounded bg-yellow-400/80 px-3 py-1 text-sm font-bold text-yellow-900">
            {order.type}
          </span>
          <span className={cn('text-sm font-semibold', getStatusClass(order.status))}>
            {order.status}
          </span>
        </div>
        <div className="pt-4 space-y-3 text-sm">
           <div className="flex justify-between items-baseline">
            <span className="text-white/70">Amount</span>
            <div className="text-right">
                <span className="text-xl font-bold">₹{order.amount}</span>
            </div>
          </div>
          {order.details.map((detail, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-white/70">{detail.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{detail.value}</span>
                <Copy className="h-4 w-4 text-white/50 cursor-pointer" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      {order.showSupport && (
         <CardFooter className="p-4 pt-0 mt-2">
          <Button variant="ghost" className="w-full justify-center gap-2 rounded-md bg-white/10 text-sm text-white/80 hover:bg-white/20 hover:text-white">
            <MessageSquare className="h-4 w-4" />
            Customer Service
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};


export default function OrderPage() {

  const OrderList = ({ orders }: { orders: Order[] }) => {
    if (orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center pt-20 text-center text-white/70">
          <History className="h-16 w-16 opacity-50" />
          <p className="mt-4 text-lg">No orders yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        <p className="text-center text-sm text-white/60">No more</p>
      </div>
    );
  };
  
  return (
    <div className="text-white">
       {/* Header */}
      <header className="flex items-center justify-between p-4 bg-transparent">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
            <Link href="/home">
                <ChevronLeft className="h-6 w-6 text-white/80" />
            </Link>
        </Button>
        <h1 className="text-xl font-bold text-white">Order history</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
            <RefreshCw className="h-5 w-5 text-white/80" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
            <X className="h-5 w-5 text-white/80" />
          </Button>
        </div>
      </header>

      <main className="p-4">
        <Tabs defaultValue="purchases">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm h-12 rounded-xl p-1">
            <TabsTrigger value="purchases" className="text-base data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">My Purchases</TabsTrigger>
            <TabsTrigger value="sales" className="text-base data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">My Sales</TabsTrigger>
          </TabsList>
          
          <div className="my-4 grid grid-cols-2 gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-full bg-white/10 border-none rounded-lg h-11">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-background/80 backdrop-blur-sm border-none text-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger className="w-full bg-white/10 border-none rounded-lg h-11">
                <SelectValue placeholder="Choose Time" />
              </SelectTrigger>
              <SelectContent className="bg-background/80 backdrop-blur-sm border-none text-white">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="purchases">
            <OrderList orders={purchaseOrders} />
          </TabsContent>
          <TabsContent value="sales">
            <OrderList orders={salesOrders} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
