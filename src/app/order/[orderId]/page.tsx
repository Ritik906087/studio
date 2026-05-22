
'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, FileClock, XCircle, AlertTriangle, User, Copy, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader } from '@/components/ui/loader';

type Order = {
    id: string;
    orderId: string;
    amount: number;
    baseAmount?: number;
    status: 'pending_payment' | 'pending_confirmation' | 'in_applied' | 'completed' | 'cancelled' | 'failed';
    utr: string;
    screenshotURL: string;
    submittedAt: Timestamp;
    cancellationReason?: string;
    rejectionReason?: string;
    paymentType?: 'bank' | 'upi' | 'usdt' | 'p2p_upi';
    sellerId?: string;
    sellerWithdrawalDetails?: any;
};

const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

function OrderStatusContent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const orderId = params.orderId as string;
    const { user } = useUser();
    const firestore = useFirestore();

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

    const handleOrderExpiry = useCallback(async () => {
        if (!order || !orderRef || order.status !== 'pending_confirmation' || !firestore) return;
    
        const currentOrderSnap = await getDoc(orderRef);
        if (currentOrderSnap.exists() && currentOrderSnap.data().status !== 'pending_confirmation') {
            return;
        }

        setIsUpdatingStatus(true);
        try {
             await updateDoc(orderRef, { status: 'in_applied' });
             toast({ title: 'Under Review', description: 'System busy. Admin review initiated.' });
        } catch (error) {
            console.error("Order expiry error:", error);
        } finally {
            setIsUpdatingStatus(false);
        }
    }, [order, orderRef, firestore, toast]);
    
    useEffect(() => {
        if (!order || order.status !== 'pending_confirmation' || !order.submittedAt) {
            if (order && !['pending_confirmation', 'in_applied'].includes(order.status)) setTimeLeft(0);
            return;
        }
        const submittedTime = order.submittedAt.toDate();
        const expiryTime = new Date(submittedTime.getTime() + 30 * 60 * 1000);
        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);
            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleOrderExpiry();
            } else setTimeLeft(secondsLeft);
        }, 1000);
        return () => clearInterval(interval);
    }, [order, handleOrderExpiry]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => toast({ title: 'Copied!' }));
    };

    if (orderLoading) return <div className="p-4 space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" /></div>;
    if (!order) return <div className="p-4 text-center">Order not found.</div>;
    
    const isTimeout = (order.status === 'failed' || order.status === 'cancelled') && (order.cancellationReason?.includes('timed out'));

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
            <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => router.push('/home')} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-lg font-black mx-auto pr-8">Order Tracking</h1>
            </header>

            <main className="flex-grow p-3 space-y-4 no-scrollbar">
                <Card className="text-center overflow-hidden border-none shadow-sm rounded-2xl">
                    <CardContent className="p-6 space-y-2 flex flex-col items-center">
                        {order.status === 'completed' ? (
                            <>
                                <CheckCircle className="h-14 w-14 text-teal-500" />
                                <h2 className="text-xl font-black text-slate-800">Payment Successful</h2>
                                <p className="text-[11px] text-slate-400 font-medium">Assets credited to your wallet.</p>
                            </>
                        ) : (
                            <>
                                <FileClock className={cn("h-14 w-14", order.status === 'pending_confirmation' ? "text-primary" : "text-orange-500")} />
                                <h2 className="text-xl font-black text-slate-800">
                                    {order.status === 'pending_confirmation' ? 'Confirming...' : 'Under Review'}
                                </h2>
                                <p className="text-[11px] text-slate-400 font-medium">Rotation engine is verifying transaction.</p>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className={cn("p-4", order.status === 'completed' ? 'bg-teal-50' : 'bg-blue-50')}>
                         <div className="w-full text-center">
                            {order.status === 'pending_confirmation' ? (
                                <div className="text-2xl font-mono font-black text-primary">
                                    {timeLeft !== null && timeLeft > 0 ? formatTime(timeLeft) : <Loader2 size="sm" className="inline-block animate-spin"/>}
                                </div>
                            ) : (
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    {order.status === 'completed' ? 'Transaction Complete' : 'System Processing...'}
                                </p>
                            )}
                         </div>
                    </CardFooter>
                </Card>

                {order.paymentType === 'p2p_upi' && (
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 p-4 border-b">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Matched Seller Details</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                             <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400 font-bold uppercase">Seller UID</span>
                                <span className="font-mono text-slate-800">{order.sellerId?.slice(-8).toUpperCase() || 'P2P_USER'}</span>
                            </div>
                             <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400 font-bold uppercase">Recipient</span>
                                <span className="text-slate-800 font-bold">{order.sellerWithdrawalDetails?.upiHolderName || order.sellerWithdrawalDetails?.name || 'Seller'}</span>
                            </div>
                             <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400 font-bold uppercase">UPI ID</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-primary font-black">{order.sellerWithdrawalDetails?.upiId}</span>
                                    <Copy className="h-3 w-3 text-slate-300 cursor-pointer" onClick={() => copyToClipboard(order.sellerWithdrawalDetails?.upiId)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                 <Card className="border-none shadow-sm rounded-2xl">
                    <CardContent className="p-4 space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black uppercase text-slate-400">Total Amount</span>
                            <span className="font-black text-lg text-slate-800">₹{(order.baseAmount || order.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black uppercase text-slate-400">Reference ID</span>
                            <span className="font-mono text-[10px] text-slate-500">{order.orderId}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black uppercase text-slate-400">Status</span>
                            <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase", order.status === 'completed' ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700")}>
                                {order.status.replace('_', ' ')}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-white/50 border border-slate-100 rounded-xl p-3 flex gap-3">
                    <Info className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-medium text-slate-400 leading-relaxed">Payments are secured via escrow. Once matched seller confirms the receipt, your assets are released immediately. Contact support if not credited within 30 mins.</p>
                </div>
            </main>
            
            <div className="p-4 bg-white border-t sticky bottom-0">
                <Button onClick={() => router.push('/home')} className="w-full h-12 btn-gradient rounded-2xl font-black">
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}

export default function OrderStatusPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader size="md"/></div>}>
            <OrderStatusContent />
        </Suspense>
    );
}
