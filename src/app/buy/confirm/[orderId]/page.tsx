
'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Copy, Upload, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
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
import { useUser } from '@/hooks/use-user';
import { useFirestore, useDoc, useStorage } from '@/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader } from '@/components/ui/loader';

type Order = {
    id: string;
    amount: number;
    baseAmount: number;
    status: string;
    createdAt: any;
    orderId: string;
    paymentType: string;
    paymentProvider: string;
    sellerId?: string;
    sellerWithdrawalDetails?: any;
    matchedSellOrderId?: string;
};

const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

function PaymentDetailsContent() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();

    const orderId = params.orderId as string;
    const [utr, setUtr] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(600); // Default 10 mins
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading } = useDoc<Order>(orderRef);

    const handleCancelOrder = useCallback(async (reason = "User cancelled") => {
        if (!order || !user || !firestore || isCancelling) return;
        
        setIsCancelling(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
                const sellerOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId!);
                const sellerUserOrderRef = doc(firestore, 'users', order.sellerId!, 'sellOrders', order.matchedSellOrderId!);

                const sellerSnap = await transaction.get(sellerOrderRef);
                if (!sellerSnap.exists()) throw new Error("Seller record not found.");

                const sellerData = sellerSnap.data();
                const newRemaining = (sellerData.remainingAmount || 0) + order.baseAmount;
                const newStatus = sellerData.status === 'processing' ? 'partially_filled' : sellerData.status;

                transaction.update(sellerOrderRef, {
                    remainingAmount: newRemaining,
                    status: newStatus,
                    matchedBuyOrders: (sellerData.matchedBuyOrders || []).filter((m: any) => m.buyOrderId !== orderId)
                });

                transaction.update(sellerUserOrderRef, {
                    remainingAmount: newRemaining,
                    status: newStatus,
                    matchedBuyOrders: (sellerData.matchedBuyOrders || []).filter((m: any) => m.buyOrderId !== orderId)
                });

                transaction.update(buyerOrderRef, {
                    status: 'cancelled',
                    cancellationReason: reason,
                    cancelledAt: serverTimestamp()
                });
            });

            toast({ title: 'Order Cancelled', description: 'Liquidity has been released back to pool.' });
            router.push('/home');
        } catch (e: any) {
            console.error("Cancellation Error:", e);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsCancelling(false);
        }
    }, [order, user, firestore, router, toast, isCancelling, orderId]);

    useEffect(() => {
        if (!order || order.status !== 'pending_payment') {
            if(order && order.status !== 'pending_payment') router.push(`/order/${orderId}`);
            return;
        }

        const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        const expiryTime = new Date(createdAt.getTime() + 10 * 60 * 1000);

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);

            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleCancelOrder("Order timed out (10 mins)");
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order, orderId, router, handleCancelOrder]);

    const handleConfirm = async () => {
        if (!utr || utr.length !== 12 || !/^\d+$/.test(utr)) {
            toast({ variant: 'destructive', title: 'Invalid UTR', description: 'Please enter a valid 12-digit UTR number.' });
            return;
        }
        if (!screenshotFile) {
            toast({ variant: 'destructive', title: 'Proof Required', description: 'Please upload a payment screenshot.' });
            return;
        }
        if (!user || !firestore || !storage || !order) return;

        setIsConfirming(true);
        try {
            const screenshotRef = ref(storage, `orders/${user.uid}/${orderId}/${Date.now()}.png`);
            await uploadBytes(screenshotRef, screenshotFile);
            const downloadUrl = await getDownloadURL(screenshotRef);

            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
                const sellerOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId!);
                const sellerUserOrderRef = doc(firestore, 'users', order.sellerId!, 'sellOrders', order.matchedSellOrderId!);

                const sellerSnap = await transaction.get(sellerOrderRef);
                if (!sellerSnap.exists()) throw new Error("Seller record lost. Contact support.");

                const matchedOrders = sellerSnap.data().matchedBuyOrders || [];
                const updatedMatches = matchedOrders.map((m: any) => 
                    m.buyOrderId === orderId ? { ...m, status: 'pending_confirmation', utr: utr } : m
                );

                transaction.update(sellerOrderRef, { matchedBuyOrders: updatedMatches });
                transaction.update(sellerUserOrderRef, { matchedBuyOrders: updatedMatches });
                transaction.update(buyerOrderRef, {
                    status: 'pending_confirmation',
                    utr: utr,
                    screenshotURL: downloadUrl,
                    submittedAt: serverTimestamp()
                });
            });

            toast({ title: 'Payment Submitted', description: 'Waiting for seller to verify your payment.' });
            router.push(`/order/${orderId}`);
        } catch (e: any) {
            console.error("Submission Error:", e);
            toast({ variant: 'destructive', title: 'Failed', description: e.message });
        } finally {
            setIsConfirming(false);
        }
    };

    const details = order?.sellerWithdrawalDetails;
    
    const qrCodeUrl = useMemo(() => {
        if (!details?.upiId || !order?.baseAmount || !order?.orderId) return null;
        const upiUrl = `upi://pay?pa=${details.upiId}&pn=${encodeURIComponent(details?.name || 'Seller')}&am=${order.baseAmount}&tn=${order.orderId}`;
        return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiUrl)}&size=200x200&qzone=2`;
    }, [details, order]);

    if (loading) return <div className="p-8 flex justify-center"><Loader size="md" /></div>;
    if (!order) return <div className="p-8 text-center font-bold">Order not found.</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
            <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => setIsCancelDialogOpen(true)} variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold">Confirm Payment</h1>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-destructive uppercase tracking-tighter">Expires in</span>
                    <span className="font-mono font-black text-destructive text-lg">{formatTime(timeLeft)}</span>
                </div>
            </header>

            <main className="p-3 space-y-4 pb-24 overflow-y-auto no-scrollbar">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Transaction Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Payable Amount</span>
                            <span className="text-2xl font-black text-primary">₹{order.baseAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Order ID</span>
                            <div className="flex items-center gap-1">
                                <span className="font-mono text-slate-800">{order.orderId}</span>
                                <Copy className="h-3 w-3 text-slate-300 cursor-pointer" onClick={() => { navigator.clipboard.writeText(order.orderId); toast({ title: 'Copied!' }); }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 p-4 border-b">
                        <CardTitle className="text-sm font-bold text-slate-800">Seller Collection Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col items-center py-4 space-y-3">
                             {qrCodeUrl ? (
                                <Image
                                    src={qrCodeUrl}
                                    width={180}
                                    height={200}
                                    alt="Payment QR Code"
                                    className="rounded-xl border-4 border-white shadow-md"
                                />
                             ) : (
                                <div className="h-[180px] w-[180px] bg-slate-100 rounded-xl flex items-center justify-center">
                                    <Loader2 className="animate-spin text-slate-300" />
                                </div>
                             )}
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scan to Pay via UPI</p>
                        </div>
                        <div className="space-y-3 border-t border-dashed pt-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Recipient Name</span>
                                <span className="font-bold text-slate-800">{details?.accountHolderName || details?.name || 'P2P Seller'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">UPI ID</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-primary">{details?.upiId}</span>
                                    <Copy className="h-3.5 w-3.5 text-slate-300 cursor-pointer" onClick={() => { navigator.clipboard.writeText(details?.upiId || ''); toast({ title: 'Copied!' }); }} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl bg-white">
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Submit Payment Proof</Label>
                            <Input 
                                placeholder="Enter 12-digit UTR Number" 
                                value={utr} 
                                onChange={e => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                className="h-12 rounded-xl bg-slate-50 border-none font-mono text-lg font-black"
                                type="tel"
                            />
                        </div>
                        <div className="space-y-2">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setScreenshotFile(e.target.files?.[0] || null)} />
                            <Button 
                                variant="outline" 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-14 border-dashed rounded-xl bg-slate-50 text-slate-500 font-bold"
                            >
                                {screenshotFile ? (
                                    <div className="flex items-center gap-2 text-primary">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {screenshotFile.name.slice(0, 20)}...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        Upload Screenshot
                                    </div>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-md border-t grid grid-cols-2 gap-3 z-50">
                 <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="h-12 rounded-xl text-slate-500 font-black" disabled={isConfirming || isCancelling}>CANCEL</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[24px]">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                            <AlertDialogDescription>Abusing the cancel button will lock your account. Only cancel if you haven't paid.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Go Back</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelOrder("User Manual Cancel")} className="bg-destructive hover:bg-destructive/90 rounded-xl">Confirm Cancel</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>

                <Button 
                    onClick={handleConfirm} 
                    className="h-12 btn-gradient rounded-xl font-black shadow-teal-500/20" 
                    disabled={isConfirming || isCancelling || utr.length !== 12 || !screenshotFile}
                >
                    {isConfirming ? <Loader size="xs" /> : "I HAVE PAID"}
                </Button>
            </footer>
        </div>
    );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader size="md" /></div>}>
      <PaymentDetailsContent />
    </Suspense>
  )
}
