'use client';

import React, { useMemo, Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Order = {
    id: string;
    orderId: string;
    amount: number;
    baseAmount?: number;
    status: 'pending_payment' | 'pending_confirmation' | 'completed' | 'cancelled' | 'failed';
    utr: string;
    submittedAt?: Timestamp;
    rejectionReason?: string;
    matchedSellOrderId?: string;
    sellerId?: string;
};

const statusMapping: Record<string, { label: string, desc: string, color: string, bgColor: string }> = {
    pending_payment: { 
        label: "Awaiting Pay", 
        desc: "Payment pending from your side", 
        color: "text-amber-500", 
        bgColor: "bg-amber-50" 
    },
    pending_confirmation: { 
        label: "System Review", 
        desc: "Verification engine is processing", 
        color: "text-blue-600", 
        bgColor: "bg-blue-50" 
    },
    completed: { 
        label: "Verified", 
        desc: "Assets injected to your wallet", 
        color: "text-teal-600", 
        bgColor: "bg-teal-50" 
    },
    cancelled: { 
        label: "Cancelled", 
        desc: "Order has been terminated", 
        color: "text-slate-400", 
        bgColor: "bg-slate-50" 
    },
    failed: { 
        label: "Rejected", 
        desc: "Audit failed or proof invalid", 
        color: "text-red-600", 
        bgColor: "bg-red-50" 
    }
};

const TimelineItem = ({ title, desc, isDone, isLast }: { title: string, desc?: string, isDone: boolean, isLast?: boolean }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className={cn("h-3 w-3 rounded-full border transition-all", isDone ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-slate-200")}></div>
            {!isLast && <div className={cn("w-px flex-1 transition-colors duration-500", isDone ? "bg-blue-600" : "bg-slate-100")}></div>}
        </div>
        <div className="pb-6">
            <p className={cn("text-[10px] font-black uppercase tracking-tight", isDone ? "text-slate-800" : "text-slate-300")}>{title}</p>
            {desc && <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{desc}</p>}
        </div>
    </div>
);

function OrderStatusContent() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const orderId = params.orderId as string;

    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

    const handleCancelOrder = async () => {
        if (!order || !user || !firestore || !cancelReason.trim()) return;
        setIsCancelling(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', order.id);
                
                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'SYSTEM_VAULT') {
                    const sellerOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    const sellerUserOrderRef = doc(firestore, 'users', order.sellerId, 'sellOrders', order.matchedSellOrderId);

                    const sellerSnap = await transaction.get(sellerOrderRef);
                    if (sellerSnap.exists()) {
                        const matchedOrders = sellerSnap.data().matchedBuyOrders || [];
                        const updatedMatches = matchedOrders.filter((m: any) => m.buyOrderId !== order.id);
                        const currentRemaining = sellerSnap.data().remainingAmount || 0;
                        
                        transaction.update(sellerOrderRef, { 
                            matchedBuyOrders: updatedMatches,
                            remainingAmount: currentRemaining + (order.baseAmount || order.amount),
                            status: 'partially_filled'
                        });
                        transaction.update(sellerUserOrderRef, { 
                            matchedBuyOrders: updatedMatches,
                            remainingAmount: currentRemaining + (order.baseAmount || order.amount),
                            status: 'partially_filled'
                        });
                    }
                }

                transaction.update(buyerOrderRef, {
                    status: 'cancelled',
                    cancellationReason: cancelReason,
                    cancelledAt: serverTimestamp()
                });
            });

            toast({ title: 'Order Cancelled' });
            setIsCancelDialogOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
            setIsCancelling(false);
        }
    };

    if (orderLoading) return <div className="p-4 space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" /></div>;
    if (!order) return <div className="p-8 text-center font-black uppercase text-slate-300 pt-32">Order Expired</div>;

    const config = statusMapping[order.status] || statusMapping.pending_payment;

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
            <header className="flex items-center p-4 bg-white sticky top-0 z-50 border-b shadow-sm">
                <Button onClick={() => router.push('/home')} variant="ghost" size="icon" className="h-8 w-8 -ml-1">
                     <ChevronLeft className="h-6 w-6 text-slate-800" />
                </Button>
                <h1 className="text-[10px] font-black mx-auto pr-8 uppercase tracking-[0.3em] text-slate-800">Review Status</h1>
            </header>

            <main className="flex-1 p-4 space-y-4 pb-32 no-scrollbar">
                <Card className="border-none shadow-sm rounded-[24px] bg-white overflow-hidden animate-in zoom-in-95 duration-500">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <h2 className={cn("text-xl font-black tracking-tight uppercase", config.color)}>
                            {config.label}
                        </h2>
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">TOKEN: #{order.orderId}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-4 px-6 leading-relaxed">
                            {config.desc}
                        </p>
                    </CardContent>
                    <div className={cn("p-4 text-center border-t border-dashed transition-colors", config.bgColor)}>
                         <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Contract Amount</span>
                            <span className="text-xl font-black text-slate-900 tracking-tighter tabular-nums">₹{(order.baseAmount || order.amount).toFixed(2)}</span>
                         </div>
                    </div>
                </Card>

                {order.status === 'pending_payment' && (
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-12 rounded-xl font-black uppercase text-[10px] border-slate-200" onClick={() => setIsCancelDialogOpen(true)}>
                            <span className="text-red-500">Cancel</span>
                        </Button>
                        <Button asChild className="h-12 btn-gradient rounded-xl font-black uppercase shadow-md active:scale-95 transition-all">
                            <Link href={`/buy/confirm/${order.id}`}>Resume</Link>
                        </Button>
                    </div>
                )}

                <Card className="border-none shadow-sm rounded-[24px] bg-white p-6">
                    <div className="flex flex-col">
                        <TimelineItem title="Node Generated" desc="Token secured" isDone={true} />
                        <TimelineItem title="Payment Intent" desc={order.status === 'pending_payment' ? 'Pending' : 'Confirmed'} isDone={order.status !== 'pending_payment'} />
                        <TimelineItem title="Review Phase" desc={['pending_confirmation', 'completed', 'failed'].includes(order.status) ? 'Active' : 'Locked'} isDone={['pending_confirmation', 'completed', 'failed'].includes(order.status)} />
                        <TimelineItem title="Final Release" desc={order.status === 'completed' ? 'Done' : 'Pending'} isDone={order.status === 'completed'} isLast={true} />
                    </div>
                </Card>

                {order.status === 'failed' && order.rejectionReason && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-[20px] flex gap-3 items-center">
                         <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                         <div>
                            <p className="text-[9px] font-black uppercase text-red-800 tracking-widest">Reject Note</p>
                            <p className="text-[10px] font-bold text-red-600 mt-0.5">{order.rejectionReason}</p>
                         </div>
                    </div>
                )}

                <div className="bg-blue-50/50 border border-blue-100 rounded-[20px] p-4 flex gap-3">
                     <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                     <p className="text-[9px] text-blue-700 font-bold leading-relaxed uppercase tracking-tight">
                        Real-time audit active. Estimated: 5-10 mins. Keep screen open.
                     </p>
                </div>
            </main>
            
            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-xl border-t z-50">
                <Button asChild variant="outline" className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-slate-100 active:scale-95 transition-all">
                    <Link href="/home">BACK TO HOME</Link>
                </Button>
            </footer>

            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="max-w-[320px] rounded-[28px] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight">Cancel Order?</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase text-slate-400">Please provide a reason for cancelling</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Reason (e.g. Bank busy, Changed mind)" 
                            className="h-12 bg-slate-50 border-none rounded-xl text-xs font-bold"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="flex-row gap-2">
                        <Button variant="ghost" className="flex-1 rounded-xl text-[10px] font-black uppercase" onClick={() => setIsCancelDialogOpen(false)}>No</Button>
                        <Button 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase"
                            disabled={isCancelling || !cancelReason.trim()}
                            onClick={handleCancelOrder}
                        >
                            {isCancelling ? "CANCELING..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function OrderStatusPage() {
    return (
        <Suspense fallback={<Loader fullscreen={true} />}>
            <OrderStatusContent />
        </Suspense>
    );
}
