
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, FileClock, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type SellOrder = {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    createdAt: Timestamp;
    withdrawalMethod: {
        name: string;
        upiId: string;
    };
    failureReason?: string;
};

const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

function SellOrderStatusContent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const orderId = params.orderId as string;
    const { user } = useUser();
    const firestore = useFirestore();

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isRefunding, setIsRefunding] = useState(false);

    const sellOrderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'sellOrders', orderId);
    }, [firestore, user, orderId]);

    const { data: sellOrder, loading: orderLoading } = useDoc<SellOrder>(sellOrderRef);

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const handleRefund = async () => {
        if (!sellOrder || !sellOrderRef || !userProfileRef || !firestore || sellOrder.status !== 'pending') return;
        
        setIsRefunding(true);

        try {
            await runTransaction(firestore, async (transaction) => {
                const userProfileSnap = await transaction.get(userProfileRef);
                if (!userProfileSnap.exists()) {
                    throw new Error("User profile not found");
                }

                const sellOrderSnap = await transaction.get(sellOrderRef);
                if (!sellOrderSnap.exists() || sellOrderSnap.data().status !== 'pending') {
                    // Order was already processed or cancelled
                    return;
                }

                const currentBalance = userProfileSnap.data().balance || 0;
                const newBalance = currentBalance + sellOrder.amount;
                
                transaction.update(sellOrderRef, { status: 'failed', failureReason: 'Order automatically expired.' });
                transaction.update(userProfileRef, { balance: newBalance });
            });
            
            toast({
                variant: 'destructive',
                title: 'Order Failed',
                description: `Your sell order has failed and ₹${sellOrder.amount.toFixed(2)} has been refunded to your balance.`,
            });
            setTimeout(() => router.push('/home'), 500);

        } catch (error: any) {
            console.error("Sell order refund error:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to process the order failure.' });
            setIsRefunding(false);
        }
    };

    useEffect(() => {
        if (!sellOrder || sellOrder.status !== 'pending' || !sellOrder.createdAt) {
            setTimeLeft(0);
            return;
        }

        const createdAt = sellOrder.createdAt.toDate();
        const expiryTime = new Date(createdAt.getTime() + 30 * 60 * 1000); // 30 minutes

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);
            
            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                if (sellOrder.status === 'pending') {
                    handleRefund();
                }
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sellOrder]);

    if (orderLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (!sellOrder) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <h1 className="text-xl font-bold">Order not found.</h1>
                <Button asChild className="mt-4">
                    <Link href="/home">Go Home</Link>
                </Button>
            </div>
        );
    }
    
    const isTimeout = (sellOrder.status === 'failed' && sellOrder.failureReason && sellOrder.failureReason.includes('expired')) || (sellOrder.status === 'pending' && timeLeft !== null && timeLeft <= 0);

    const isFailed = sellOrder.status === 'failed' || (sellOrder.status === 'pending' && timeLeft !== null && timeLeft <= 0);

    return (
        <div className="flex flex-col min-h-screen">
            <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                <Button asChild onClick={() => router.push('/home')} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold mx-auto pr-8">Sell Order Status</h1>
            </header>

            <main className="flex-grow p-4 space-y-6">
                <Card className="text-center overflow-hidden">
                    <CardContent className="p-6 space-y-3 flex flex-col items-center">
                        {isRefunding || isFailed ? (
                            <>
                                {isTimeout ? (
                                    <AlertTriangle className="h-16 w-16 text-orange-500" />
                                ) : (
                                    <XCircle className="h-16 w-16 text-destructive" />
                                )}
                                <h2 className={cn("text-2xl font-bold", isTimeout ? "text-orange-600" : "text-destructive")}>
                                    {isTimeout ? "Timeout" : "Order Failed"}
                                </h2>
                                <p className="text-muted-foreground">₹{sellOrder.amount.toFixed(2)} has been refunded to your balance.</p>
                            </>
                        ) : (
                            <>
                                <FileClock className="h-16 w-16 text-primary" />
                                <h2 className="text-2xl font-bold text-primary">Processing Sell Order</h2>
                                <p className="text-muted-foreground">Waiting for admin to process your withdrawal.</p>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="bg-primary/10 p-4">
                         <div className="w-full text-center">
                            <p className="text-sm text-primary font-semibold">Time remaining to process</p>
                            <p className="text-3xl font-mono font-bold text-primary">
                                {timeLeft !== null ? formatTime(timeLeft) : <Loader2 className="h-8 w-8 animate-spin inline-block"/>}
                            </p>
                         </div>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-semibold">₹{sellOrder.amount.toFixed(2)}</span>
                        </div>
                        {sellOrder.withdrawalMethod && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Withdrawal to</span>
                                <div className="text-right">
                                    <p className="font-semibold">{sellOrder.withdrawalMethod.name}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{sellOrder.withdrawalMethod.upiId}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Order ID</span>
                            <span className="font-mono text-xs">{sellOrder.orderId}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <span className={cn("font-semibold capitalize", isTimeout ? "text-orange-600" : "")}>
                                {isRefunding ? 'Refunding...' : (isTimeout ? 'Timeout' : sellOrder.status)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                 <Button onClick={() => router.push('/home')} className="w-full h-12 btn-gradient font-bold">
                    Back to Home
                </Button>
            </main>
        </div>
    );
}

export default function SellOrderStatusPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
        }>
            <SellOrderStatusContent />
        </Suspense>
    );
}
