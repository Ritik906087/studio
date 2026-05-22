
'use client';

import React, { useMemo, Suspense, useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
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
    createdAt: any;
    matchedBuyOrders?: MatchedBuyOrder[];
    userId: string;
};

type MatchedBuyOrder = {
    buyOrderId: string;
    buyerId: string;
    amount: number;
    status: 'pending_payment' | 'pending_confirmation' | 'completed' | 'failed' | 'cancelled';
    created_at: string;
    utr?: string;
};

const statusConfig: { [key: string]: { style: string; text: string } } = {
  completed: { style: "bg-green-100 text-green-700", text: "Completed" },
  failed: { style: "bg-red-100 text-red-700", text: "Failed" },
  cancelled: { style: "bg-red-100 text-red-700", text: "Cancelled" },
  pending: { style: "bg-yellow-100 text-yellow-700", text: "Matching..." },
  partially_filled: { style: "bg-blue-100 text-blue-700", text: "Partially Filled" },
  processing: { style: "bg-blue-100 text-blue-700", text: "Verification" },
  pending_payment: { style: "bg-yellow-100 text-yellow-700", text: "Awaiting Pay" },
  pending_confirmation: { style: "bg-blue-600 text-white", text: "Confirm Receipt" },
};

const MatchedOrderCard = ({ order, onConfirm }: { order: MatchedBuyOrder, onConfirm: (id: string) => void }) => {
  const currentStatus = statusConfig[order.status] || { style: "bg-gray-100 text-gray-800", text: order.status };
  const isAwaitingConfirmation = order.status === 'pending_confirmation';

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="px-2 py-0.5 rounded-full bg-blue-50 text-primary font-black text-[9px] uppercase tracking-widest">Matched Buyer</div>
          <span className={cn("font-black text-[9px] uppercase px-2 py-0.5 rounded-md", currentStatus.style)}>{currentStatus.text}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Amount</p>
                <p className="font-black text-slate-800">₹{order.amount.toFixed(2)}</p>
            </div>
            <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">UTR Number</p>
                <p className="font-mono text-[10px] font-black text-primary truncate">{order.utr || 'NOT SUBMITTED'}</p>
            </div>
        </div>

        {isAwaitingConfirmation && (
            <Button 
                onClick={() => onConfirm(order.buyOrderId)} 
                className="w-full h-10 btn-gradient rounded-xl font-black text-xs shadow-teal-500/10"
            >
                CONFIRM RECEIPT (₹{order.amount})
            </Button>
        )}
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

    const [isActionLoading, setIsActionLoading] = useState(false);

    const sellOrderRef = useMemo(() => {
        if(!firestore || !user || !orderId) return null;
        return doc(firestore, 'sellOrders', orderId);
    }, [firestore, user, orderId]);

    const { data: sellOrder, loading: sellOrderLoading } = useDoc<SellOrder>(sellOrderRef);

    const handleConfirmReceipt = async (buyOrderId: string) => {
        if (!user || !firestore || !sellOrder || isActionLoading) return;

        setIsActionLoading(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const match = sellOrder.matchedBuyOrders?.find(m => m.buyOrderId === buyOrderId);
                if (!match) throw new Error("Match not found.");

                // 1. Get references
                const buyerOrderRef = doc(firestore, 'users', match.buyerId, 'orders', buyOrderId);
                const sellerOrderRef = doc(firestore, 'sellOrders', sellOrder.id);
                const sellerUserOrderRef = doc(firestore, 'users', user.uid, 'sellOrders', sellOrder.id);
                const buyerProfileRef = doc(firestore, 'users', match.buyerId);

                // 2. Fetch fresh data
                const buyerSnap = await transaction.get(buyerProfileRef);
                const sellSnap = await transaction.get(sellerOrderRef);
                const buyerOrderSnap = await transaction.get(buyerOrderRef);

                if (!buyerSnap.exists() || !sellSnap.exists()) throw new Error("Reference missing.");
                
                // 3. Update status in matches
                const updatedMatches = sellSnap.data().matchedBuyOrders.map((m: any) => 
                    m.buyOrderId === buyOrderId ? { ...m, status: 'completed' } : m
                );

                // Check if ALL matches are completed AND remaining is 0
                const allCompleted = updatedMatches.every((m: any) => m.status === 'completed') && sellSnap.data().remainingAmount === 0;

                transaction.update(sellerOrderRef, { 
                    matchedBuyOrders: updatedMatches,
                    status: allCompleted ? 'completed' : 'processing'
                });
                transaction.update(sellerUserOrderRef, { 
                    matchedBuyOrders: updatedMatches,
                    status: allCompleted ? 'completed' : 'processing'
                });

                transaction.update(buyerOrderRef, { status: 'completed', completedAt: serverTimestamp() });

                // 4. Credit Buyer Wallet
                const currentBuyerBalance = buyerSnap.data().balance || 0;
                // Add the full "amount" (base + 6% bonus)
                transaction.update(buyerProfileRef, { balance: currentBuyerBalance + (buyerOrderSnap.data()?.amount || 0) });
            });

            toast({ title: 'Payment Confirmed', description: 'Transaction completed for this match.' });
        } catch (e: any) {
            console.error("Confirm Error:", e);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleCancelRemaining = async () => {
        if (!sellOrder || !user || !firestore || sellOrder.remainingAmount <= 0) return;
    
        setIsActionLoading(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.uid);
                const sellerOrderRef = doc(firestore, 'sellOrders', sellOrder.id);
                const sellerUserOrderRef = doc(firestore, 'users', user.uid, 'sellOrders', sellOrder.id);

                const userSnap = await transaction.get(userRef);
                const sellSnap = await transaction.get(sellerOrderRef);

                if(!userSnap.exists() || !sellSnap.exists()) throw new Error("Sync error.");

                const refundAmt = sellSnap.data().remainingAmount;
                
                // 1. Refund seller wallet
                transaction.update(userRef, {
                    balance: (userSnap.data()?.balance || 0) + refundAmt,
                    holdBalance: (userSnap.data()?.holdBalance || 0) - refundAmt
                });

                // 2. Mark order as failed/partially complete
                const hasMatches = (sellSnap.data().matchedBuyOrders || []).length > 0;
                const finalStatus = hasMatches ? 'processing' : 'cancelled';

                transaction.update(sellerOrderRef, { 
                    remainingAmount: 0, 
                    status: finalStatus,
                    cancellationReason: 'User cancelled unmatched portion'
                });
                transaction.update(sellerUserOrderRef, { 
                    remainingAmount: 0, 
                    status: finalStatus 
                });
            });

            toast({ title: 'Unmatched Cancelled', description: 'Remaining balance refunded to wallet.' });
        } catch (e: any) {
            console.error("Refund Error:", e);
            toast({ variant: 'destructive', title: 'Failed', description: e.message });
        } finally {
            setIsActionLoading(false);
        }
    };

    const matchedOrders = useMemo(() => {
        if (!sellOrder || !sellOrder.matchedBuyOrders) return [];
        return [...sellOrder.matchedBuyOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [sellOrder]);
    
    const progress = sellOrder ? ((sellOrder.amount - sellOrder.remainingAmount) / sellOrder.amount) * 100 : 0;

    if (sellOrderLoading) return <div className="p-4 space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div>;
    if (!sellOrder) return <div className="p-8 text-center"><p className="font-bold">Order not found.</p><Button asChild variant="link" href="/home">Home</Button></div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
            <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => router.push('/order')} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-lg font-black mx-auto pr-8">P2P Sell Tracker</h1>
            </header>

            <main className="p-3 space-y-4 overflow-y-auto no-scrollbar pb-24">
                <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Progress</CardTitle>
                            <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-md", statusConfig[sellOrder.status]?.style)}>
                                {statusConfig[sellOrder.status]?.text}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Target</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{sellOrder.amount.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                                <span>Filled: ₹{(sellOrder.amount - sellOrder.remainingAmount).toFixed(2)}</span>
                                <span>Remaining: ₹{sellOrder.remainingAmount.toFixed(2)}</span>
                            </div>
                            <Progress value={progress} className="h-2 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                {sellOrder.remainingAmount > 0 && !['completed', 'failed'].includes(sellOrder.status) && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full h-12 rounded-2xl text-red-500 border-red-50 font-black text-xs uppercase" disabled={isActionLoading}>
                                Stop Matching & Refund Remaining
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[32px]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Unmatched Portion?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    ₹{sellOrder.remainingAmount.toFixed(2)} will be refunded to your wallet immediately. Already matched buyers can still pay.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Wait More</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelRemaining} className="bg-destructive hover:bg-destructive/90 rounded-xl">Confirm Refund</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                <div className="space-y-3">
                    <h3 className="px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">Matched Liquidity</h3>
                    {matchedOrders.length > 0 ? (
                        matchedOrders.map((m) => (
                            <MatchedOrderCard key={m.buyOrderId} order={m} onConfirm={handleConfirmReceipt} />
                        ))
                    ) : (
                        <Card className="border-none shadow-sm rounded-2xl bg-white p-12 text-center opacity-30">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="text-[10px] font-black uppercase mt-4">Rotating liquidity... searching buyers</p>
                        </Card>
                    )}
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                     <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                     <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Ensure you check your bank/UPI app account before confirming any receipt. Confirmation cannot be undone.</p>
                </div>
            </main>
        </div>
    );
}

export default function SellOrderStatusPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <SellOrderStatusContent />
    </Suspense>
  );
}
