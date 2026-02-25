
'use client';

import React, { useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore, useCollection } from '@/firebase';
import { doc, collectionGroup, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { Progress } from '@/components/ui/progress';

type SellOrder = {
    id: string;
    orderId: string;
    amount: number;
    remainingAmount: number;
    status: 'pending' | 'partially_filled' | 'completed' | 'failed';
    createdAt: Timestamp;
};

type BuyOrder = {
    id: string;
    orderId: string;
    amount: number;
    status: 'pending_payment' | 'pending_confirmation' | 'completed' | 'failed';
    createdAt: Timestamp;
};

const statusConfig: { [key: string]: { style: string; text: string } } = {
  completed: { style: "bg-green-100 text-green-800", text: "Completed" },
  failed: { style: "bg-red-100 text-red-800", text: "Failed" },
  pending: { style: "bg-yellow-100 text-yellow-800", text: "Pending" },
  partially_filled: { style: "bg-blue-100 text-blue-800", text: "Partially Filled" },
  pending_payment: { style: "bg-yellow-100 text-yellow-800", text: "Pending Payment" },
  pending_confirmation: { style: "bg-blue-100 text-blue-800", text: "Confirming" },
};


function SellOrderStatusContent() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;
    const { user } = useUser();
    const firestore = useFirestore();

    const sellOrderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'sellOrders', orderId);
    }, [firestore, user, orderId]);

    const { data: sellOrder, loading: sellOrderLoading } = useDoc<SellOrder>(sellOrderRef);

    const matchedOrdersQuery = useMemo(() => {
        if (!firestore || !orderId) return null;
        return query(
            collectionGroup(firestore, 'orders'),
            where('matchedSellOrderId', '==', orderId)
        );
    }, [firestore, orderId]);

    const { data: matchedOrders, loading: matchedOrdersLoading } = useCollection<BuyOrder>(matchedOrdersQuery);
    
    const loading = sellOrderLoading || matchedOrdersLoading;
    
    const progress = sellOrder ? ((sellOrder.amount - sellOrder.remainingAmount) / sellOrder.amount) * 100 : 0;
    const currentStatus = sellOrder ? statusConfig[sellOrder.status] : null;

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }
    
    if (!sellOrder) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <h1 className="text-xl font-bold">Sell Order not found.</h1>
                <Button asChild className="mt-4">
                    <Link href="/order">Go to Orders</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                <Button asChild onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold mx-auto pr-8">Sell Order Status</h1>
            </header>

            <main className="flex-grow p-4 space-y-6">
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle>Sell Order Progress</CardTitle>
                             {currentStatus && <span className={cn("font-semibold text-sm capitalize", currentStatus.style, "px-2 py-1 rounded-md")}>{currentStatus.text}</span>}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Sell Amount</p>
                            <p className="text-4xl font-bold text-primary">₹{sellOrder.amount.toFixed(2)}</p>
                        </div>
                        <div>
                            <Progress value={progress} className="h-3" />
                            <div className="flex justify-between mt-2 text-sm font-medium">
                                <span>Filled: ₹{(sellOrder.amount - sellOrder.remainingAmount).toFixed(2)}</span>
                                <span>Remaining: ₹{sellOrder.remainingAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Matched Buy Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {matchedOrders && matchedOrders.length > 0 ? (
                            <div className="space-y-3">
                                {matchedOrders.map(buyOrder => {
                                    const buyStatus = statusConfig[buyOrder.status] || { style: "bg-gray-100 text-gray-800", text: buyOrder.status.replace(/_/g, ' ') };
                                    return (
                                        <div key={buyOrder.id} className="p-3 rounded-lg bg-secondary/70 flex justify-between items-center text-sm">
                                            <div>
                                                <p className="font-bold">₹{buyOrder.amount.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{buyOrder.createdAt.toDate().toLocaleString()}</p>
                                            </div>
                                            <span className={cn("font-semibold capitalize text-xs", buyStatus.style, "px-2 py-1 rounded-md")}>{buyStatus.text}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                             <p className="text-center text-muted-foreground py-4">No buyers matched yet.</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}


export default function SellOrderStatusPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
            <Loader size="md"/>
        </div>
    }>
      <SellOrderStatusContent />
    </Suspense>
  );
}
