'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Copy, Upload, Loader2, CheckCircle2, XCircle, AlertCircle, Hash, Clock, Info, HelpCircle } from 'lucide-react';
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
import { useFirestore, useDoc } from '@/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { uploadToSupabase } from '@/lib/supabase';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

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
    buyerSelectedProvider?: string;
    buyerSelectedUpi?: string;
};

const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hours} : ${mins} : ${secs}`;
};

const CANCELLATION_REASONS = [
    "I don't want to buy anymore",
    "Payment method is not working",
    "Information provided is incorrect",
    "Accidentally created the order",
    "Other reasons"
];

const CopyRow = ({ label, value }: { label: string, value?: string | number }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value.toString());
        toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <span className="text-sm font-medium text-slate-500 w-24">{label}</span>
            <span className="flex-1 text-sm font-black text-slate-800 truncate px-2">{value || '...'}</span>
            <button 
                onClick={handleCopy}
                className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 active:scale-95 transition-all uppercase"
            >
                Copy
            </button>
        </div>
    );
};

function PaymentDetailsContent() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const orderId = params.orderId as string;
    const [utr, setUtr] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(1800); 
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
    
    // View state to toggle between payment info and proof submission
    const [view, setView] = useState<'info' | 'prove'>('info');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading } = useDoc<Order>(orderRef);

    const handleCancelOrder = useCallback(async (reason: string) => {
        if (!order || !user || !firestore || isCancelling) return;
        
        setIsCancelling(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
                
                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'SYSTEM_VAULT') {
                    const sellerOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    const sellerUserOrderRef = doc(firestore, 'users', order.sellerId, 'sellOrders', order.matchedSellOrderId);

                    const sellerSnap = await transaction.get(sellerOrderRef);
                    if (sellerSnap.exists()) {
                        const sellerData = sellerSnap.data();
                        const newRemaining = (sellerData.remainingAmount || 0) + (order.baseAmount || 0);
                        
                        let newStatus = 'partially_filled';
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

            toast({ title: 'Order Cancelled', description: reason });
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
        
        if (order.status !== 'pending_payment') {
            if (['cancelled', 'failed'].includes(order.status)) {
                router.replace('/home');
            } else {
                router.push(`/order/${orderId}`);
            }
            return;
        }

        const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        const duration = 30 * 60 * 1000;
        const expiryTime = new Date(createdAt.getTime() + duration);

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);

            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleCancelOrder("Payment timeout exceeded");
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order, orderId, router, handleCancelOrder]);

    const handleConfirm = async () => {
        if (!utr || utr.length < 10) {
            toast({ variant: 'destructive', title: 'Invalid Ref', description: 'Please enter a valid reference number.' });
            return;
        }
        
        if (order?.paymentType !== 'usdt' && !screenshotFile) {
            toast({ variant: 'destructive', title: 'Proof Required', description: 'Please upload the payment screenshot.' });
            return;
        }
        
        if (!user || !firestore || !order) return;

        setIsConfirming(true);
        try {
            let downloadUrl = null;
            if (screenshotFile) {
                const path = `orders/${user.uid}/${orderId}/${Date.now()}.png`;
                downloadUrl = await uploadToSupabase(screenshotFile, path);
            }

            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
                
                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'SYSTEM_VAULT') {
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

            toast({ title: 'Payment Submitted', description: 'Process is now in review.' });
            router.push(`/order/${orderId}`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
        } finally {
            setIsConfirming(false);
        }
    };

    const details = order?.sellerWithdrawalDetails;
    
    const handleGoPay = () => {
        if (!details?.upiId) return;
        const upiUrl = `upi://pay?pa=${details.upiId}&pn=${encodeURIComponent(details?.name || 'Verified Recipient')}&am=${order?.baseAmount}&tn=${order?.orderId}`;
        window.location.href = upiUrl;
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader size="md" /></div>;
    if (!order) return <div className="p-8 text-center">Session not found.</div>;

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Header matching screenshot */}
            <header className="flex items-center justify-between p-3 border-b bg-white sticky top-0 z-50">
                <Button onClick={() => setIsCancelDialogOpen(true)} variant="ghost" size="icon" className="h-8 w-8 -ml-1">
                    <ChevronLeft className="h-6 w-6 text-slate-600" />
                </Button>
                <h1 className="text-base font-bold text-slate-700">Buy FP details</h1>
                <HelpCircle className="h-5 w-5 text-blue-500" />
            </header>

            {/* Timer Banner */}
            <div className="bg-red-50 px-4 py-2.5 flex items-center gap-3 text-red-500">
                <Clock className="h-5 w-5" />
                <span className="font-mono font-black text-base">{formatTime(timeLeft)}</span>
                <span className="text-xs font-bold uppercase tracking-tight">Please pay in time</span>
                <div className="ml-auto flex items-center justify-center h-5 w-5 rounded-full border-2 border-red-500">
                    <span className="text-[10px] font-black">!</span>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="px-4 pt-6 pb-2">
                <div className="flex items-center justify-between relative px-2 mb-2">
                    <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-slate-100 -translate-y-1/2 z-0" />
                    <div className={cn("relative z-10 h-3.5 w-3.5 rounded-full border-2", view === 'info' ? "bg-blue-500 border-blue-500" : "bg-blue-500 border-blue-500")} />
                    <div className={cn("relative z-10 h-3.5 w-3.5 rounded-full border-2", view === 'prove' ? "bg-blue-500 border-blue-500" : "bg-white border-slate-200")} />
                    <div className="relative z-10 h-3.5 w-3.5 rounded-full border-2 bg-white border-slate-200" />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span className={cn(view === 'info' && "text-blue-500")}>Payment info</span>
                    <span className={cn(view === 'prove' && "text-blue-500")}>Payment prove</span>
                    <span>Audit</span>
                </div>
            </div>

            <main className="flex-1 p-4 overflow-y-auto no-scrollbar pb-32">
                {view === 'info' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Instruction Section */}
                        <div className="space-y-1">
                            <p className="text-base font-black text-red-600 leading-tight">
                                Please use the {order.buyerSelectedProvider || 'app'}({order.buyerSelectedUpi || 'linked account'}) of your choice to pay
                            </p>
                        </div>

                        {/* Payment Data Section */}
                        <div className="space-y-0.5 mt-4">
                            <CopyRow label="Name" value={details?.accountHolderName || details?.name || 'Verified Channel'} />
                            <CopyRow label="UPI ID" value={details?.upiId} />
                            <CopyRow label="Amount" value={order.baseAmount} />
                            <CopyRow label="Order ID" value={order.orderId} />
                        </div>

                        {/* Notice Section */}
                        <div className="space-y-3 pt-4">
                            <p className="text-[11px] font-bold text-red-600 leading-tight">
                                Notice: The remittance amount must be consistent, otherwise the transaction will not be completed.
                            </p>
                            <p className="text-[11px] font-bold text-red-600 leading-tight">
                                Notice: If you have already paid, please wait patiently for the transaction review, please do not cancel the order
                            </p>
                        </div>

                        {/* Support Floating-ish */}
                        <div className="flex justify-center pt-4">
                             <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm text-blue-500 active:scale-95 transition-transform">
                                <HelpCircle className="h-5 w-5" />
                             </div>
                        </div>

                        {/* Cancel My Order */}
                        <div className="text-center pt-4">
                             <p className="text-xs font-medium text-slate-400">
                                Unable to complete payment? <button onClick={() => setIsCancelDialogOpen(true)} className="text-red-600 font-bold hover:underline">Cancel</button> my order.
                             </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <Card className="border-none shadow-sm rounded-2xl bg-slate-50">
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Enter UTR / Transaction Hash
                                    </Label>
                                    <Input 
                                        placeholder="Enter reference number..." 
                                        value={utr} 
                                        onChange={(e) => setUtr(e.target.value.replace(/\s/g, '').toUpperCase())}
                                        className="h-12 rounded-xl bg-white border-none font-mono font-black text-sm ring-1 ring-slate-100 focus-visible:ring-primary/40"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                                    <Button 
                                        variant="outline" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-16 border-dashed rounded-xl bg-white text-slate-400 font-bold border-2"
                                    >
                                        {screenshotFile ? (
                                            <div className="flex items-center gap-2 text-teal-600">
                                                <CheckCircle2 className="h-5 w-5" />
                                                Proof Selected ✓
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Upload className="h-5 w-5" />
                                                <span className="text-[10px] uppercase">Upload Transfer Screenshot</span>
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-orange-800 font-black leading-tight uppercase tracking-tight">
                                SYSTEM AUTOMATICALLY BLACKLISTS FRAUDULENT SCREENSHOTS. PLEASE SUBMIT GENUINE DATA ONLY.
                            </p>
                        </div>

                        <button onClick={() => setView('info')} className="w-full text-xs font-black text-slate-400 uppercase tracking-widest py-2">
                            Back to details
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Buttons */}
            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-md border-t grid grid-cols-2 gap-4 z-50">
                <Button 
                    variant="outline" 
                    className="h-12 rounded-xl text-blue-500 border-slate-200 font-black text-xs uppercase" 
                    onClick={handleGoPay}
                    disabled={isCancelling}
                >
                    Go pay
                </Button>

                {view === 'info' ? (
                    <Button 
                        onClick={() => setView('prove')} 
                        className="h-12 btn-gradient rounded-xl font-black text-xs shadow-blue-500/20 uppercase" 
                    >
                        Finish payment
                    </Button>
                ) : (
                    <Button 
                        onClick={handleConfirm} 
                        className="h-12 btn-gradient rounded-xl font-black text-xs shadow-teal-500/20 uppercase" 
                        disabled={isConfirming || utr.length < 10 || !screenshotFile}
                    >
                        {isConfirming ? <Loader size="xs" /> : "I FINISHED"}
                    </Button>
                )}
            </footer>

            {/* Cancel Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="rounded-[32px] max-w-[90%] sm:max-w-md border-none p-0 overflow-hidden shadow-2xl">
                    <div className="bg-red-50 p-8 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Terminate Transfer?</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-red-400 uppercase mt-1 tracking-widest">Node connection will be closed</DialogDescription>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Cancellation Reason</Label>
                            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
                                {CANCELLATION_REASONS.map((reason) => (
                                    <div key={reason} className={cn("flex items-center space-x-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100")}>
                                        <RadioGroupItem value={reason} id={reason} />
                                        <Label htmlFor={reason} className="flex-1 font-bold text-slate-600 text-xs">{reason}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="h-12 rounded-xl font-black text-slate-400 text-xs" onClick={() => setIsCancelDialogOpen(false)}>BACK</Button>
                            <Button 
                                onClick={() => handleCancelOrder(selectedReason)} 
                                className="h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black shadow-red-200 shadow-lg text-xs"
                                disabled={isCancelling}
                            >
                                {isCancelling ? <Loader size="xs" /> : "YES, CANCEL"}
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
