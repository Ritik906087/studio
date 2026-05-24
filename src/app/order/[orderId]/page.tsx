'use client';

import React, { useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, FileClock, XCircle, AlertTriangle, Info, Hourglass, BadgeCheck, ShieldCheck } from 'lucide-react';
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
    submittedAt?: Timestamp;
    rejectionReason?: string;
};

const statusMapping: Record<string, { label: string, desc: string, icon: any, color: string, bgColor: string }> = {
    pending_payment: { 
        label: "Awaiting Pay", 
        desc: "Payment pending from your side", 
        icon: Hourglass, 
        color: "text-amber-500", 
        bgColor: "bg-amber-50" 
    },
    pending_confirmation: { 
        label: "System Review", 
        desc: "Verification engine is processing", 
        icon: FileClock, 
        color: "text-blue-600", 
        bgColor: "bg-blue-50" 
    },
    completed: { 
        label: "Verified", 
        desc: "Assets injected to your wallet", 
        icon: CheckCircle, 
        color: "text-teal-600", 
        bgColor: "bg-teal-50" 
    },
    cancelled: { 
        label: "Cancelled", 
        desc: "Order has been terminated", 
        icon: XCircle, 
        color: "text-slate-400", 
        bgColor: "bg-slate-50" 
    },
    failed: { 
        label: "Rejected", 
        desc: "Audit failed or proof invalid", 
        icon: AlertTriangle, 
        color: "text-red-600", 
        bgColor: "bg-red-50" 
    }
};

const TimelineItem = ({ title, desc, isDone, isLast }: { title: string, desc?: string, isDone: boolean, isLast?: boolean }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className={cn("h-4 w-4 rounded-full border-2 transition-all", isDone ? "bg-blue-600 border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-white border-slate-200")}></div>
            {!isLast && <div className={cn("w-0.5 flex-1 transition-colors duration-500", isDone ? "bg-blue-600" : "bg-slate-100")}></div>}
        </div>
        <div className="pb-8">
            <p className={cn("text-[11px] font-black uppercase tracking-tight", isDone ? "text-slate-800" : "text-slate-300")}>{title}</p>
            {desc && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{desc}</p>}
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
    if (!order) return <div className="p-8 text-center font-black uppercase text-slate-300 pt-32">Data Corrupted</div>;

    const config = statusMapping[order.status] || statusMapping.pending_payment;
    const Icon = config.icon;

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
            <header className="flex items-center p-4 bg-white sticky top-0 z-50 border-b shadow-sm">
                <Button onClick={() => router.push('/home')} variant="ghost" size="icon" className="h-8 w-8 -ml-1">
                     <ChevronLeft className="h-6 w-6 text-slate-800" />
                </Button>
                <h1 className="text-[10px] font-black mx-auto pr-8 uppercase tracking-[0.3em] text-slate-800">Audit Status</h1>
            </header>

            <main className="flex-1 p-4 space-y-4 pb-32 no-scrollbar">
                <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden animate-in zoom-in-95 duration-500">
                    <CardContent className="p-8 flex flex-col items-center text-center">
                        <div className={cn("h-20 w-20 rounded-full flex items-center justify-center mb-5 shadow-inner transition-all duration-700 scale-100", config.bgColor)}>
                            <Icon className={cn("h-10 w-10", config.color)} />
                        </div>
                        
                        <h2 className={cn("text-2xl font-black tracking-tight uppercase", config.color)}>
                            {config.label}
                        </h2>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">#{order.orderId}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 px-6 leading-relaxed">
                            {config.desc}
                        </p>
                    </CardContent>
                    <div className={cn("p-5 text-center border-t border-dashed transition-colors", config.bgColor)}>
                         <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contract Amount</span>
                            <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">₹{(order.baseAmount || order.amount).toFixed(2)}</span>
                         </div>
                    </div>
                </Card>

                {order.status === 'pending_payment' && (
                    <Button asChild className="w-full h-14 btn-gradient rounded-2xl font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                        <Link href={`/buy/confirm/${order.id}`}>Resume Payment</Link>
                    </Button>
                )}

                <Card className="border-none shadow-sm rounded-[28px] bg-white p-7">
                    <div className="flex flex-col">
                        <TimelineItem title="Node Generated" desc="Token secured in pool" isDone={true} />
                        <TimelineItem title="Payment Intent" desc={order.status === 'pending_payment' ? 'Awaiting action' : 'Confirmed'} isDone={order.status !== 'pending_payment'} />
                        <TimelineItem title="Review Phase" desc={['pending_confirmation', 'completed', 'failed'].includes(order.status) ? 'Audit in progress' : 'Locked'} isDone={['pending_confirmation', 'completed', 'failed'].includes(order.status)} />
                        <TimelineItem title="Final Release" desc={order.status === 'completed' ? 'Balance updated' : 'Result pending'} isDone={order.status === 'completed'} isLast={true} />
                    </div>
                </Card>

                {order.status === 'failed' && order.rejectionReason && (
                    <div className="p-5 bg-red-50 border border-red-100 rounded-[24px] flex gap-4 items-center">
                         <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                         <div>
                            <p className="text-[10px] font-black uppercase text-red-800 tracking-widest">Reject Note</p>
                            <p className="text-xs font-bold text-red-600 mt-0.5">{order.rejectionReason}</p>
                         </div>
                    </div>
                )}

                <div className="bg-blue-50/50 border border-blue-100 rounded-[24px] p-5 flex gap-4">
                     <ShieldCheck className="h-6 w-6 text-blue-500 shrink-0" />
                     <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase tracking-tight">
                        Our verified rotation engine audits all submissions in real-time. Estimated completion: 5-10 minutes. Please keep this screen open for faster updates.
                     </p>
                </div>
            </main>
            
            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-xl border-t z-50">
                <Button asChild variant="outline" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border-slate-100 shadow-sm active:scale-95 transition-all">
                    <Link href="/home">BACK TO HOME</Link>
                </Button>
            </footer>
        </div>
    );
}

export default function OrderStatusPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white"><Loader size="md"/></div>}>
            <OrderStatusContent />
        </Suspense>
    );
}
