

'use client';

import React, { useMemo, Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, Timestamp, runTransaction } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


type SellOrder = {
    id: string;
    orderId: string;
    amount: number;
    remainingAmount: number;
    status: 'pending' | 'partially_filled' | 'completed' | 'failed' | 'processing';
    createdAt: Timestamp;
    matchedBuyOrders?: MatchedBuyOrder[];
};

type MatchedBuyOrder = {
    buyOrderId: string;
    buyerId: string;
    amount: number;
    status: 'pending_payment' | 'pending_confirmation' | 'completed' | 'failed' | 'cancelled';
    createdAt: Timestamp;
    buyerOrderId?: string;
    utr?: string;
};

const statusConfig: { [key: string]: { style: string; text: string } } = {
  completed: { style: "bg-green-100 text-green-800", text: "Completed" },
  failed: { style: "bg-red-100 text-red-800", text: "Failed" },
  cancelled: { style: "bg-red-100 text-red-800", text: "Cancelled" },
  pending: { style: "bg-yellow-100 text-yellow-800", text: "Pending" },
  partially_filled: { style: "bg-blue-100 text-blue-800", text: "Partially Filled" },
  processing: { style: "bg-blue-100 text-blue-800", text: "Processing" },
  pending_payment: { style: "bg-yellow-100 text-yellow-800", text: "Pending Payment" },
  pending_confirmation: { style: "bg-blue-100 text-blue-800", text: "Confirming" },
};


const MatchedOrderCard = ({ order }: { order: MatchedBuyOrder }) => {
  const currentStatus = statusConfig[order.status] || { style: "bg-gray-100 text-gray-800", text: order.status.replace(/_/g, ' ') };
  const { toast } = useToast();
  const copyToClipboard = (text: string | undefined) => {
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Copied!' }));
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="rounded px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800">
            Matched
          </span>
          <span className={cn("font-semibold text-sm capitalize", currentStatus.style, "px-2 py-1 rounded-md")}>{currentStatus.text}</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">₹{order.amount.toFixed(2)}</span>
              <Copy className="h-3 w-3 text-gray-400 cursor-pointer" onClick={() => copyToClipboard(order.amount.toFixed(2))} />
            </div>
          </div>
          {order.utr && (
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">UTR</span>
              <div className="flex items-center gap-2 text-right">
                <span className="font-mono text-muted-foreground break-all">{order.utr}</span>
                <Copy className="h-3 w-3 text-gray-400 cursor-pointer flex-shrink-0" onClick={() => copyToClipboard(order.utr)} />
              </div>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Time</span>
            <span className="font-mono text-muted-foreground text-xs">{order.createdAt.toDate().toLocaleString()}</span>
          </div>
          {order.buyerOrderId && (
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">Buyer Order ID</span>
              <div className="flex items-center gap-2 text-right">
                <span className="font-mono text-muted-foreground break-all">{order.buyerOrderId}</span>
                <Copy className="h-3 w-3 text-gray-400 cursor-pointer flex-shrink-0" onClick={() => copyToClipboard(order.buyerOrderId)} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function SellOrderStatusContent() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isCancelling, setIsCancelling] = useState(false);

    const sellOrderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'sellOrders', orderId);
    }, [firestore, user, orderId]);
    
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: sellOrder, loading: sellOrderLoading } = useDoc<SellOrder>(sellOrderRef);

    const matchedOrders = useMemo(() => {
        if (!sellOrder || !sellOrder.matchedBuyOrders) return [];
        return [...sellOrder.matchedBuyOrders].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [sellOrder]);
    
    const handleCancelRemaining = async () => {
        if (!sellOrder || !sellOrderRef || !userProfileRef || sellOrder.remainingAmount <= 0) {
            toast({ variant: 'destructive', title: 'Cannot cancel', description: 'No remaining amount to cancel.' });
            return;
        }
    
        setIsCancelling(true);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userProfileRef);
                const sellOrderDoc = await transaction.get(sellOrderRef);
    
                if (!userDoc.exists() || !sellOrderDoc.exists()) {
                    throw new Error("Data not found.");
                }
    
                const userData = userDoc.data();
                const orderData = sellOrderDoc.data();
                
                if (orderData.remainingAmount <= 0) {
                     throw new Error("No remaining amount to cancel.");
                }
                
                const amountToRefund = orderData.remainingAmount;
                const newBalance = (userData.balance || 0) + amountToRefund;
    
                transaction.update(userProfileRef, { balance: newBalance });
    
                if (orderData.status === 'pending') {
                    transaction.update(sellOrderRef, {
                        status: 'failed',
                        failureReason: 'Cancelled by user.',
                        remainingAmount: 0
                    });
                } else {
                     transaction.update(sellOrderRef, {
                        remainingAmount: 0,
                     });
                }
            });
    
            toast({ title: 'Order Updated', description: 'The remaining amount has been cancelled and refunded.' });
        } catch (error: any) {
            console.error("Failed to cancel remaining order:", error);
            toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
        } finally {
            setIsCancelling(false);
        }
    };

    const loading = sellOrderLoading;
    
    const amount = sellOrder?.amount || 0;
    const remainingAmount = sellOrder?.remainingAmount ?? amount;
    const progress = amount > 0 ? ((amount - remainingAmount) / amount) * 100 : 0;
    
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
            <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
                <Button asChild onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold">Sell Order Status</h1>
                {sellOrder && sellOrder.remainingAmount > 0 && !['completed', 'failed'].includes(sellOrder.status) ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isCancelling}>
                                Cancel
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Remaining Order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will cancel the unfilled part of your sell order (₹{sellOrder.remainingAmount.toFixed(2)}) and refund it to your wallet. Matched orders will not be affected.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Back</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelRemaining} disabled={isCancelling} className="bg-destructive hover:bg-destructive/90">
                                    {isCancelling ? <Loader size="xs" /> : "Confirm"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                ) : <div className="w-16"></div>}
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
                            <p className="text-4xl font-bold text-primary">₹{(sellOrder.amount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <Progress value={progress} className="h-3" />
                            <div className="flex justify-between mt-2 text-sm font-medium">
                                <span>Filled: ₹{(amount - remainingAmount).toFixed(2)}</span>
                                <span>Remaining: ₹{remainingAmount.toFixed(2)}</span>
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
                                {matchedOrders.map(buyOrder => (
                                    <MatchedOrderCard key={buyOrder.buyOrderId} order={buyOrder} />
                                ))}
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
