'use client';

import React, { useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, FileClock, XCircle, AlertTriangle, User, Copy, Info, Loader2, Hourglass } from 'lucide-react';
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
    status: 'pending_payment' | 'pending_confirmation' | 'completed' | 'cancelled' | 'failed';
    utr: string;
    screenshotURL: string;
    submittedAt: Timestamp;
    paymentType?: string;
    sellerId?: string;
    sellerWithdrawalDetails?: any;
    cancellationReason?: string;
    rejectionReason?: string;
};

const statusMapping: Record<string, { label: string, desc: string, icon: any, color: string, bgColor: string }> = {
    pending_payment: { 
        label: "Waiting For Payment", 
        desc: "Please complete payment within 30 minutes", 
        icon: Hourglass, 
        color: "text-amber-500", 
        bgColor: "bg-amber-50" 
    },
    pending_confirmation: { 
        label: "In Review", 
        desc: "System is verifying your payment proof", 
        icon: FileClock, 
        color: "text-blue-500", 
        bgColor: "bg-blue-50" 
    },
    completed: { 
        label: "Approved", 
        desc: "Assets credited to your wallet", 
        icon: CheckCircle, 
        color: "text-teal-500", 
        bgColor: "bg-teal-50" 
    },
    cancelled: { 
        label: "Cancelled", 
        desc: "Order has been terminated", 
        icon: XCircle, 
        color: "text-red-500", 
        bgColor: "bg-red-50" 
    },
    failed: { 
        label: "Rejected", 
        desc: "Invalid proof or security issue identified", 
        icon: AlertTriangle, 
        color: "text-red-600", 
        bgColor: "bg-red-100" 
    }
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

    const config = statusMapping[order.status] || statusMapping.pending_payment;
    const Icon = config.icon;

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
            <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => router.push('/home')} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-sm font-black mx-auto pr-8 uppercase tracking-widest">Order Receipt</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="text-center overflow-hidden border-none shadow-sm rounded-[32px] bg-white">
                    <CardContent className="p-8 flex flex-col items-center">
                        <div className={cn("h-20 w-20 rounded-full flex items-center justify-center mb-4 shadow-inner", config.bgColor)}>
                            <Icon className={cn("h-10 w-10", config.color)} />
                        </div>
                        
                        <h2 className="text-2xl font-black text-slate-800">
                            {config.label}
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{order.orderId}</p>
                        <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-2 px-6", config.color)}>
                            {config.desc}
                        </p>
                    </CardContent>
                    <div className={cn("p-4 text-center border-t border-dashed", config.bgColor)}>
                        <span className="text-xs font-black text-slate-400 uppercase mr-2 tracking-widest">Amount:</span>
                        <span className="text-xl font-black text-slate-900 tracking-tighter tabular-nums">₹{(order.baseAmount || order.amount).toFixed(2)}</span>
                    </div>
                </Card>

                {order.status === 'pending_payment' && (
                    <Button asChild className="w-full h-14 btn-gradient rounded-2xl font-black uppercase shadow-lg shadow-blue-500/20">
                        <Link href={`/buy/confirm/${order.id}`}>Complete Payment Now</Link>
                    </Button>
                )}

                <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
                    <div className="flex flex-col">
                        <TimelineItem 
                            title="Order Token Generated" 
                            isDone={true} 
                        />
                        <TimelineItem 
                            title="Waiting for Payment" 
                            isDone={order.status !== 'cancelled'} 
                        />
                        <TimelineItem 
                            title="In Review (Processing)" 
                            isDone={['pending_confirmation', 'completed', 'failed'].includes(order.status)} 
                        />
                        <TimelineItem 
                            title={order.status === 'completed' ? "Approved & Credited" : order.status === 'failed' ? "Rejected" : "Process Finished"} 
                            isDone={['completed', 'failed'].includes(order.status)} 
                            isLast={true} 
                        />
                    </div>
                </Card>

                {order.status === 'failed' && order.rejectionReason && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-center">
                         <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                         <div>
                            <p className="text-[10px] font-black uppercase text-red-800">Review Note</p>
                            <p className="text-xs font-bold text-red-600">{order.rejectionReason}</p>
                         </div>
                    </div>
                )}

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                     <Info className="h-5 w-5 text-blue-500 shrink-0" />
                     <p className="text-[9px] text-blue-700 font-bold leading-relaxed uppercase tracking-tight">Security check usually takes 5-15 minutes. Our system rotates liquidity between verified channels for maximum speed.</p>
                </div>
            </main>
            
            <div className="p-4 bg-white border-t sticky bottom-0">
                <Button asChild variant="outline" className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest">
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
