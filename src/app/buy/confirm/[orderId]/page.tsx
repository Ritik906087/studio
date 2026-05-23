'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Copy, Upload, Loader2, CheckCircle2, XCircle, AlertCircle, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUser } from '@/hooks/use-user';
import { useFirestore, useDoc, useStorage } from '@/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader } from '@/components/ui/loader';

type Order = {
    id: string;
    amount: number;
    baseAmount: number;
    usdtAmount?: number;
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

const CANCELLATION_REASONS = [
    "I don't want to buy anymore",
    "Payment method is not working",
    "Information provided is incorrect",
    "Accidentally created the order",
    "Other reasons"
];

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
    const [timeLeft, setTimeLeft] = useState<number>(600);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading } = useDoc<Order>(orderRef);

    const isUsdtOrder = order?.paymentType === 'usdt';

    const handleCancelOrder = useCallback(async (reason: string) => {
        if (!order || !user || !firestore || isCancelling) return;
        
        setIsCancelling(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
                
                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'ADMIN') {
                    const sellerOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    const sellerUserOrderRef = doc(firestore, 'users', order.sellerId, 'sellOrders', order.matchedSellOrderId);

                    const sellerSnap = await transaction.get(sellerOrderRef);
                    if (sellerSnap.exists()) {
                        const sellerData = sellerSnap.data();
                        const newRemaining = (sellerData.remainingAmount || 0) + (order.baseAmount || 0);
                        
                        let newStatus = sellerData.status;
                        if (sellerData.status === 'processing' || sellerData.status === 'completed') {
                            newStatus = 'partially_filled';
                        }
                        if (newRemaining >= sellerData.amount) {
                            newStatus = 'pending';
                        }

                        const updatedMatches = (sellerData.matchedBuyOrders || []).filter((m: any) => m.buyOrderId !== orderId);

                        transaction.update(sellerOrderRef, {
                            remainingAmount: newRemaining,
                            status: newStatus,
                            matchedBuyOrders: updatedMatches
                        });

                        transaction.update(sellerUserOrderRef, {
                            remainingAmount: newRemaining,
                            status: newStatus,
                            matchedBuyOrders: updatedMatches
                        });
                    }
                }

                transaction.update(buyerOrderRef, {
                    status: 'cancelled',
                    cancellationReason: reason,
                    cancelledAt: serverTimestamp()
                });
            });

            toast({ title: 'Order Cancelled' });
            router.replace('/home');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Cancellation Failed', description: e.message });
        } finally {
            setIsCancelling(false);
            setIsCancelDialogOpen(false);
        }
    }, [order, user, firestore, router, toast, isCancelling, orderId]);

    useEffect(() => {
        if (!order) return;
        if (order.status === 'cancelled' || order.status === 'failed') {
            router.replace('/home');
            return;
        }
        if (order.status !== 'pending_payment') {
            router.push(`/order/${orderId}`);
            return;
        }

        const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        const duration = isUsdtOrder ? 30 * 60 * 1000 : 10 * 60 * 1000;
        const expiryTime = new Date(createdAt.getTime() + duration);

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);

            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleCancelOrder("System Timeout");
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order, orderId, router, handleCancelOrder, isUsdtOrder]);

    const handleConfirm = async () => {
        if (isUsdtOrder) {
            if (!utr || utr.length < 10) {
                toast({ variant: 'destructive', title: 'Invalid Hash', description: 'Please enter valid TXID.' });
                return;
            }
        } else {
            if (!utr || utr.length !== 12) {
                toast({ variant: 'destructive', title: 'Invalid UTR' });
                return;
            }
            if (!screenshotFile) {
                toast({ variant: 'destructive', title: 'Proof Required' });
                return;
            }
        }
        
        if (!user || !firestore || !order) return;

        setIsConfirming(true);
        try {
            let downloadUrl = null;
            if (screenshotFile && storage) {
                const screenshotRef = ref(storage, `orders/${user.uid}/${orderId}/${Date.now()}.png`);
                await uploadBytes(screenshotRef, screenshotFile);
                downloadUrl = await getDownloadURL(screenshotRef);
            }

            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
                
                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'ADMIN') {
                    const sellerOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    const sellerUserOrderRef = doc(firestore, 'users', order.sellerId, 'sellOrders', order.matchedSellOrderId);

                    const sellerSnap = await transaction.get(sellerOrderRef);
                    if (sellerSnap.exists()) {
                        const matchedOrders = sellerSnap.data().matchedBuyOrders || [];
                        const updatedMatches = matchedOrders.map((m: any) => 
                            m.buyOrderId === orderId ? { ...m, status: 'pending_confirmation', utr: utr } : m
                        );
                        transaction.update(sellerOrderRef, { matchedBuyOrders: updatedMatches });
                        transaction.update(sellerUserOrderRef, { matchedBuyOrders: updatedMatches });
                    }
                }

                transaction.update(buyerOrderRef, {
                    status: 'pending_confirmation',
                    utr: utr,
                    ...(downloadUrl && { screenshotURL: downloadUrl }),
                    submittedAt: serverTimestamp()
                });
            });

            toast({ title: 'Submitted' });
            router.push(`/order/${orderId}`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed', description: e.message });
        } finally {
            setIsConfirming(false);
        }
    };

    const details = order?.sellerWithdrawalDetails;
    
    const qrCodeUrl = useMemo(() => {
        if (isUsdtOrder) {
            if (!details?.walletAddress) return "";
            return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(details.walletAddress)}&size=250x250&qzone=2`;
        }
        if (!details?.upiId || !order?.baseAmount) return "";
        const upiUrl = `upi://pay?pa=${details.upiId}&pn=${encodeURIComponent(details?.name || 'Seller')}&am=${order.baseAmount}&tn=${order.orderId}`;
        return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiUrl)}&size=250x250&qzone=2`;
    }, [details, order, isUsdtOrder]);

    if (loading) return <div className="p-8 flex justify-center"><Loader size="md" /></div>;
    if (!order) return <div className="p-8 text-center">Order not found.</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
            <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => setIsCancelDialogOpen(true)} variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold">Confirm Asset</h1>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-destructive uppercase">Expires</span>
                    <span className="font-mono font-black text-destructive text-lg">{formatTime(timeLeft)}</span>
                </div>
            </header>

            <main className="p-3 space-y-4 pb-24 overflow-y-auto no-scrollbar">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Payable</span>
                            <span className="text-2xl font-black text-primary">
                                {isUsdtOrder ? `${order.usdtAmount} USDT` : `₹${order.baseAmount?.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Order ID</span>
                            <div className="flex items-center gap-1">
                                <span className="font-mono font-black text-slate-800">{order.orderId}</span>
                                <Copy className="h-3 w-3 text-slate-300 cursor-pointer" onClick={() => { navigator.clipboard.writeText(order.orderId); toast({ title: 'Copied!' }); }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 p-4 border-b">
                        <CardTitle className="text-sm font-bold text-slate-800">
                            {isUsdtOrder ? 'TRC20 Wallet (External)' : (order.sellerId === 'ADMIN' ? 'Master Payment Server' : 'P2P Trusted Partner')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col items-center py-4 space-y-3">
                             {qrCodeUrl ? (
                                <Image
                                    src={qrCodeUrl}
                                    width={200}
                                    height={200}
                                    alt="Payment QR Code"
                                    className="rounded-xl border-4 border-white shadow-md"
                                    unoptimized
                                />
                             ) : (
                                <div className="h-[200px] w-[200px] bg-slate-100 rounded-xl flex items-center justify-center">
                                    <Loader2 className="animate-spin text-slate-300" />
                                </div>
                             )}
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scan using {isUsdtOrder ? 'Binance/TrustWallet' : 'any UPI App'}</p>
                        </div>
                        <div className="space-y-3 border-t border-dashed pt-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">{isUsdtOrder ? 'Network' : 'Recipient'}</span>
                                <span className="font-bold text-slate-800">{isUsdtOrder ? 'TRC20' : (details?.accountHolderName || details?.name || 'Authorized Seller')}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-xs">
                                <span className="text-slate-400 font-medium">{isUsdtOrder ? 'Wallet Address' : 'UPI ID'}</span>
                                <div className="flex items-center gap-2 mt-1 bg-slate-50 p-2.5 rounded-xl border border-dashed">
                                    <span className="font-mono font-black text-primary break-all flex-1 text-[10px]">
                                        {isUsdtOrder ? details?.walletAddress : details?.upiId}
                                    </span>
                                    <Copy className="h-4 w-4 text-slate-400 cursor-pointer shrink-0" onClick={() => { 
                                        const val = isUsdtOrder ? details?.walletAddress : details?.upiId;
                                        if(val) { navigator.clipboard.writeText(val); toast({ title: 'Copied!' }); } 
                                    }} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl bg-white">
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                {isUsdtOrder ? 'Transaction Hash / TXID' : 'Transaction UTR (12 Digits)'}
                            </Label>
                            <div className="relative">
                                {isUsdtOrder ? (
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Hash className="h-4 w-4" /></div>
                                ) : null}
                                <Input 
                                    placeholder={isUsdtOrder ? "Paste Hash Here" : "Enter 12-digit UTR"} 
                                    value={utr} 
                                    onChange={(e) => {
                                        if (isUsdtOrder) setUtr(e.target.value);
                                        else setUtr(e.target.value.replace(/\D/g, '').slice(0, 12));
                                    }}
                                    className={cn("h-12 rounded-xl bg-slate-50 border-none font-mono font-black", isUsdtOrder ? "pl-10 text-sm" : "text-lg")}
                                    type="text"
                                />
                            </div>
                        </div>
                        
                        {!isUsdtOrder && (
                            <div className="space-y-2">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                                <Button 
                                    variant="outline" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-14 border-dashed rounded-xl bg-slate-50 text-slate-500 font-bold"
                                >
                                    {screenshotFile ? (
                                        <div className="flex items-center gap-2 text-teal-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            File Attached ✓
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Upload className="h-4 w-4" />
                                            Upload Payment Proof
                                        </div>
                                    )}
                                </Button>
                            </div>
                        )}
                        
                        {isUsdtOrder && (
                             <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex gap-3">
                                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-red-800 font-bold leading-tight uppercase">ENSURE YOU SEND TRC20 ONLY. WRONG NETWORK TRANSFERS WILL NEVER BE CREDITED.</p>
                             </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-md border-t grid grid-cols-2 gap-3 z-50">
                <Button 
                    variant="outline" 
                    className="h-12 rounded-xl text-slate-500 font-black" 
                    disabled={isConfirming || isCancelling}
                    onClick={() => setIsCancelDialogOpen(true)}
                >
                    CANCEL
                </Button>

                <Button 
                    onClick={handleConfirm} 
                    className="h-12 btn-gradient rounded-xl font-black shadow-teal-500/20" 
                    disabled={isConfirming || isCancelling || (!isUsdtOrder && (utr.length !== 12 || !screenshotFile)) || (isUsdtOrder && utr.length < 10)}
                >
                    {isConfirming ? <Loader size="xs" /> : "I'VE PAID"}
                </Button>
            </footer>

            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="rounded-[32px] max-w-[90%] sm:max-w-md border-none p-0 overflow-hidden shadow-2xl">
                    <div className="bg-red-50 p-8 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-800">Cancel Order?</DialogTitle>
                        <DialogDescription className="text-xs font-bold text-red-400 uppercase mt-1">This action will release the matched session</DialogDescription>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Reason for Cancellation</Label>
                            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
                                {CANCELLATION_REASONS.map((reason) => (
                                    <div key={reason} className="flex items-center space-x-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 active:scale-[0.98] transition-all">
                                        <RadioGroupItem value={reason} id={reason} />
                                        <Label htmlFor={reason} className="flex-1 font-bold text-slate-600 text-sm">{reason}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="h-12 rounded-xl font-black text-slate-400" onClick={() => setIsCancelDialogOpen(false)}>GO BACK</Button>
                            <Button 
                                onClick={() => handleCancelOrder(selectedReason)} 
                                className="h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black shadow-red-200 shadow-lg"
                                disabled={isCancelling}
                            >
                                {isCancelling ? <Loader size="xs" /> : "CONFIRM"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
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
