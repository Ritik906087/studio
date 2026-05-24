'use client';

import React, { useMemo, Suspense, useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Copy, CheckCircle2, AlertCircle, Loader2, Hourglass, FileClock } from 'lucide-react';
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

const statusMapping: Record<string, { label: string, color: string, bgColor: string, icon: any }> = {
    pending_payment: { 
        label: "Waiting For Payment", 
        color: "text-amber-500", 
        bgColor: "bg-amber-50",
        icon: Hourglass
    },
    pending_confirmation: { 
        label: "System Review", 
        color: "text-blue-500", 
        bgColor: "bg-blue-50",
        icon: FileClock
    },
    completed: { 
        label: "Approved", 
        color: "text-teal-500", 
        bgColor: "bg-teal-50",
        icon: CheckCircle2
    },
    cancelled: { 
        label: "Expired/Cancelled", 
        color: "text-slate-400", 
        bgColor: "bg-slate-50",
        icon: AlertCircle
    },
    failed: { 
        label: "Rejected", 
        color: "text-red-500", 
        bgColor: "bg-red-50",
        icon: AlertCircle
    }
};

const MatchedOrderCard = ({ order }: { order: MatchedBuyOrder }) => {
  const config = statusMapping[order.status] || statusMapping.pending_payment;
  const Icon = config.icon;

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden mb-3">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className={cn("p-1 rounded-lg", config.bgColor)}>
                <Icon className={cn("h-3 w-3", config.color)} />
             </div>
             <span className="font-black text-[10px] uppercase tracking-tight text-slate-800">Rotation Match</span>
          </div>
          <span className={cn("font-black text-[9px] uppercase px-2 py-0.5 rounded-md", config.style || config.bgColor + " " + config.color)}>{config.label}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 border-t border-dashed pt-3">
            <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Liquidity Amount</p>
                <p className="font-black text-slate-800 text-sm">₹{order.amount.toFixed(2)}</p>
            </div>
            <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Reference Hash</p>
                <p className="font-mono text-[9px] font-black text-primary truncate uppercase">{order.utr || 'Awaiting Pay'}</p>
            </div>
        </div>

        {order.status === 'pending_confirmation' && (
            <div className="bg-blue-50 p-2 rounded-xl text-center">
                 <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">System is currently reviewing the confirmation proof</p>
            </div>
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
                
                transaction.update(userRef, {
                    balance: (userSnap.data()?.balance || 0) + refundAmt,
                    holdBalance: (userSnap.data()?.holdBalance || 0) - refundAmt
                });

                const hasMatches = (sellSnap.data().matchedBuyOrders || []).some((m: any) => !['cancelled', 'failed'].includes(m.status));
                const finalStatus = hasMatches ? 'processing' : 'cancelled';

                transaction.update(sellerOrderRef, { 
                    remainingAmount: 0, 
                    status: finalStatus,
                    cancellationReason: 'User requested unmatched portion refund'
                });
                transaction.update(sellerUserOrderRef, { 
                    remainingAmount: 0, 
                    status: finalStatus 
                });
            });

            toast({ title: 'Liquidity Refunded', description: 'Unmatched portion returned to balance.' });
        } catch (e: any) {
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
                <h1 className="text-sm font-black mx-auto pr-8 uppercase tracking-widest">Rotation Tracker</h1>
            </header>

            <main className="p-3 space-y-4 overflow-y-auto no-scrollbar pb-24">
                <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Capacity</CardTitle>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                                {sellOrder.status.replace('_', ' ')}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Liquidity Lock</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{sellOrder.amount.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                <span>Matched: ₹{(sellOrder.amount - sellOrder.remainingAmount).toFixed(2)}</span>
                                <span>Idle: ₹{sellOrder.remainingAmount.toFixed(2)}</span>
                            </div>
                            <Progress value={progress} className="h-2 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                {sellOrder.remainingAmount > 0 && !['completed', 'failed', 'cancelled'].includes(sellOrder.status) && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full h-12 rounded-2xl text-red-500 border-red-50 font-black text-xs uppercase" disabled={isActionLoading}>
                                Stop Matching & Refund Idle
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[32px]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Release Idle Assets?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs">
                                    ₹{sellOrder.remainingAmount.toFixed(2)} will be returned to your main balance. Already matched channels have 30 minutes to pay.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Wait More</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelRemaining} className="bg-destructive hover:bg-destructive/90 rounded-xl">Release Now</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                <div className="space-y-1">
                    <h3 className="px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Rotations</h3>
                    {matchedOrders.length > 0 ? (
                        matchedOrders.map((m) => (
                            <MatchedOrderCard key={m.buyOrderId} order={m} />
                        ))
                    ) : (
                        <Card className="border-none shadow-sm rounded-2xl bg-white p-12 text-center opacity-30">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="text-[10px] font-black uppercase mt-4">Scanning Liquidity Pool...</p>
                        </Card>
                    )}
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                     <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                     <p className="text-[10px] text-slate-500 font-medium leading-relaxed">System reviews all matched proofs. Once approved, the corresponding hold balance is permanently released. Channels have a strict 30-min timer to pay.</p>
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
