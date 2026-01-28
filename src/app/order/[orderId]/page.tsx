
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, CheckCircle, FileClock, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Order = {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    utr: string;
    screenshotURL: string;
    submittedAt: Timestamp;
    cancellationReason?: string;
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

    const handleOrderExpiry = async () => {
        if (!order || !orderRef || order.status !== 'processing') return;

        // Ensure we don't run this multiple times
        const currentOrderSnap = await getDoc(orderRef);
        if (currentOrderSnap.exists() && currentOrderSnap.data().status !== 'processing') {
            return;
        }

        setIsUpdatingStatus(true);
        try {
            await updateDoc(orderRef, { 
                status: 'failed',
                cancellationReason: 'Order processing timed out.'
            });
            
            toast({
                variant: 'destructive',
                title: 'Order Failed',
                description: 'The order was not processed in time.',
            });
            setTimeout(() => router.push('/home'), 1000);

        } catch (error) {
            console.error("Order expiry error:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update the order status.' });
            setIsUpdatingStatus(false);
        }
    };
    
    useEffect(() => {
        if (!order || order.status !== 'processing' || !order.submittedAt) {
            if (order && order.status !== 'processing') {
                setTimeLeft(0);
            }
            return;
        }

        const submittedTime = order.submittedAt.toDate();
        const expiryTime = new Date(submittedTime.getTime() + 30 * 60 * 1000); // 30 minutes from submission

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);
            
            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleOrderExpiry();
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order]);
    

    if (orderLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <h1 className="text-xl font-bold">Order not found.</h1>
                <Button asChild className="mt-4">
                    <Link href="/home">Go Home</Link>
                </Button>
            </div>
        )
    }
    
    const isTimeout = order.status === 'failed' && order.cancellationReason && (order.cancellationReason.includes('expired') || order.cancellationReason.includes('timed out'));

    return (
        <div className="flex flex-col min-h-screen">
            <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                <Button asChild onClick={() => router.push('/home')} variant="ghost" size="icon" className="h-8 w-8">
                     <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold mx-auto pr-8">Order Status</h1>
            </header>

            <main className="flex-grow p-4 space-y-6">
                <Card className="text-center overflow-hidden">
                    <CardContent className="p-6 space-y-3 flex flex-col items-center">
                        {order.status === 'completed' ? (
                            <>
                                <CheckCircle className="h-16 w-16 text-green-500" />
                                <h2 className="text-2xl font-bold text-green-600">Order Completed</h2>
                                <p className="text-muted-foreground">₹{order.amount.toFixed(2)} has been added to your balance.</p>
                            </>
                        ) : order.status === 'processing' ? (
                            <>
                                <FileClock className="h-16 w-16 text-primary" />
                                <h2 className="text-2xl font-bold text-primary">Processing Order</h2>
                                <p className="text-muted-foreground">Your payment is being verified.</p>
                            </>
                        ) : (
                            <>
                                {isTimeout ? (
                                    <AlertTriangle className="h-16 w-16 text-orange-500" />
                                ) : (
                                    <XCircle className="h-16 w-16 text-destructive" />
                                )}
                                <h2 className={cn("text-2xl font-bold capitalize", isTimeout ? "text-orange-600" : "text-destructive")}>
                                    {isTimeout ? 'Timeout' : order.status.replace('_', ' ')}
                                </h2>
                                <p className="text-muted-foreground">
                                    {isTimeout ? "This order has expired." : "This order could not be completed."}
                                </p>
                            </>
                        )}
                        
                    </CardContent>
                    <CardFooter className="bg-primary/10 p-4">
                         <div className="w-full text-center">
                            {order.status === 'processing' ? (
                                <>
                                    <p className="text-sm text-primary font-semibold">Estimated time remaining</p>
                                    <p className="text-3xl font-mono font-bold text-primary">
                                        {timeLeft !== null ? formatTime(timeLeft) : <Loader2 className="h-8 w-8 animate-spin inline-block"/>}
                                    </p>
                                </>
                            ) : order.status === 'completed' ? (
                                 <p className="w-full text-center text-sm text-green-600 font-semibold">Processed successfully!</p>
                            ) : (
                                <p className={cn("w-full text-center text-sm font-semibold", isTimeout ? "text-orange-600" : "text-destructive")}>
                                    This order is no longer active.
                                </p>
                            )}
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
                            <span className="font-semibold">₹{order.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Order ID</span>
                            <span className="font-mono text-xs">{order.orderId}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">UTR</span>
                            <span className="font-mono">{order.utr}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <span className={cn("font-semibold capitalize", isTimeout ? "text-orange-600" : "")}>
                                {isUpdatingStatus ? 'Updating...' : (isTimeout ? 'Timeout' : order.status.replace('_', ' '))}
                            </span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Screenshot</span>
                            <a href={order.screenshotURL} target="_blank" rel="noopener noreferrer" className="text-primary underline">View</a>
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

export default function OrderStatusPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
        }>
            <OrderStatusContent />
        </Suspense>
    )
}
