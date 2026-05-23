'use client';

import React, { useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, FileClock, XCircle, AlertTriangle, User, Copy, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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
    paymentType?: string;
    sellerId?: string;
    sellerWithdrawalDetails?: any;
};

const TimelineItem = ({ title, time, isDone, isLast }: { title: string, time?: string, isDone: boolean, isLast?: boolean }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className={cn("h-4 w-4 rounded-full border-2", isDone ? "bg-primary border-primary shadow-[0_0_8px_rgba(30,58,138,0.4)]" : "bg-white border-slate-200")}></div>
            {!isLast && <div className={cn("w-0.5 flex-1", isDone ? "bg-primary" : "bg-slate-100")}></div>}
        </div>
        <div className="pb-6">
            <p className={cn("text-xs font-black uppercase tracking-tight", isDone ? "text-slate-800" : "text-slate-300")}>{title}</p>
            {time && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{time}</p>}
        </div>
    </div>
);

function OrderStatusContent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const orderId = params.orderId as string;

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

    if (orderLoading) return <div className="p-4 space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" /></div>;
    if (!order) return <div className="p-8 text-center"><p className="font-bold">Order not found.</p><Button asChild variant="link" className="mt-4"><Link href="/home">Back Home</Link></Button></div>;

    const isCompleted = order.status === 'completed';
    const isFailed = ['cancelled', 'failed'].includes(order.status);
    const isVerifying = order.status === 'pending_confirmation' || order.status === 'in_applied';

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
            <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => router.push('/home')} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-lg font-black mx-auto pr-8">Order Status</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="text-center overflow-hidden border-none shadow-sm rounded-[32px] bg-white">
                    <CardContent className="p-8 flex flex-col items-center">
                        <div className="relative">
                            {isCompleted ? (
                                <div className="h-20 w-20 rounded-full bg-teal-50 flex items-center justify-center animate-in zoom-in duration-500">
                                    <CheckCircle className="h-12 w-12 text-teal-500" />
                                </div>
                            ) : isFailed ? (
                                <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center">
                                    <XCircle className="h-12 w-12 text-red-500" />
                                </div>
                            ) : (
                                <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center">
                                    <FileClock className="h-12 w-12 text-primary animate-pulse" />
                                </div>
                            )}
                        </div>
                        
                        <h2 className="text-2xl font-black text-slate-800 mt-4">
                            {isCompleted ? 'Order Completed' : isFailed ? 'Order Cancelled' : 'Payment Verifying'}
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{order.orderId}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {isCompleted ? 'Assets credited to your wallet' : isFailed ? 'Liquidity has been returned' : 'Rotating to matched seller verification'}
                        </p>
                    </CardContent>
                    <div className={cn("p-4 text-center", isCompleted ? "bg-teal-50" : "bg-blue-50")}>
                        <span className="text-lg font-black text-slate-800 tracking-tighter">₹{(order.baseAmount || order.amount).toFixed(2)}</span>
                    </div>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
                    <div className="flex flex-col">
                        <TimelineItem 
                            title="Order Created" 
                            time={order.submittedAt ? order.submittedAt.toDate().toLocaleString() : 'Processing...'} 
                            isDone={true} 
                        />
                        <TimelineItem 
                            title="Payment Submitted" 
                            time={order.submittedAt?.toDate().toLocaleTimeString()} 
                            isDone={!!order.submittedAt} 
                        />
                        <TimelineItem 
                            title="Seller Verifying" 
                            isDone={isVerifying || isCompleted} 
                        />
                        <TimelineItem 
                            title="Order Completed" 
                            isDone={isCompleted} 
                            isLast={true} 
                        />
                    </div>
                </Card>

                {order.sellerWithdrawalDetails && !isFailed && (
                     <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 p-4 border-b">
                            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Matched Seller</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">Name</span>
                                <span className="font-bold">{order.sellerWithdrawalDetails.name || 'P2P Partner'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-medium">UTR Submited</span>
                                <span className="font-mono text-primary font-black">{order.utr}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-4 flex gap-3">
                     <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                     <p className="text-[10px] text-yellow-700 font-medium leading-relaxed">If your order is not completed within 30 minutes, please contact live support with your order ID and payment screenshot.</p>
                </div>
            </main>
            
            <div className="p-4 bg-white border-t sticky bottom-0">
                <Button asChild className="w-full h-12 btn-gradient rounded-2xl font-black">
                    <Link href="/home">BACK TO DASHBOARD</Link>
                </Button>
            </div>
        </div>
    );
}

export default function OrderStatusPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 size="md"/></div>}>
            <OrderStatusContent />
        </Suspense>
    );
}
