
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, CheckCircle, FileClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type Order = {
    id: string;
    amount: number;
    status: string;
    utr: string;
    screenshotURL: string;
    submittedAt: Timestamp;
};

function OrderStatusContent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const orderId = params.orderId as string;
    const { user } = useUser();
    const firestore = useFirestore();

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const handleOrderCompletion = async () => {
        if (!order || !orderRef || !userProfileRef || !firestore || order.status !== 'processing') return;
        setIsCompleting(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userProfileSnap = await transaction.get(userProfileRef);
                if (!userProfileSnap.exists()) {
                    throw "User profile does not exist!";
                }

                const currentBalance = userProfileSnap.data().balance || 0;
                const newBalance = currentBalance + order.amount;

                transaction.update(orderRef, { status: 'completed' });
                transaction.update(userProfileRef, { balance: newBalance });
            });
            
            toast({
                title: 'Order Completed!',
                description: `₹${order.amount.toFixed(2)} has been added to your balance.`,
                className: 'bg-green-500 text-white'
            });
            router.push('/home');

        } catch (error) {
            console.error("Order completion error:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete the order.' });
            setIsCompleting(false);
        }
    };
    
    useEffect(() => {
        if (!order || order.status !== 'processing' || !order.submittedAt) {
            if (order && order.status === 'completed') {
                setTimeLeft(0);
            }
            return;
        }

        const submittedTime = order.submittedAt.toDate();
        const expiryTime = new Date(submittedTime.getTime() + 60 * 1000); // 1 minute from submission

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);
            
            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                if (order.status === 'processing') {
                   handleOrderCompletion();
                }
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

    const isCompleted = order.status === 'completed' || timeLeft === 0;

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
                        {isCompleting || isCompleted ? (
                            <>
                                <CheckCircle className="h-16 w-16 text-green-500" />
                                <h2 className="text-2xl font-bold text-green-600">Order Completed</h2>
                                <p className="text-muted-foreground">₹{order.amount.toFixed(2)} has been added to your balance.</p>
                            </>
                        ) : (
                            <>
                                <FileClock className="h-16 w-16 text-primary" />
                                <h2 className="text-2xl font-bold text-primary">Processing Order</h2>
                                <p className="text-muted-foreground">Your payment is being verified.</p>
                            </>
                        )}
                        
                    </CardContent>
                    <CardFooter className="bg-primary/10 p-4">
                         <div className="w-full text-center">
                            <p className="text-sm text-primary font-semibold">Estimated time remaining</p>
                            <p className="text-3xl font-mono font-bold text-primary">
                                {timeLeft !== null ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : <Loader2 className="h-8 w-8 animate-spin inline-block"/>}
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
                            <span className="font-semibold">₹{order.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Order ID</span>
                            <span className="font-mono text-xs">{order.id}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">UTR</span>
                            <span className="font-mono">{order.utr}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-semibold capitalize">{isCompleting ? 'Completing...' : order.status}</span>
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
