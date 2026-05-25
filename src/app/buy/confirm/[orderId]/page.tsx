'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, CheckCircle2, XCircle, AlertCircle, Hash, Clock, HelpCircle, Upload, Info, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useDoc } from '@/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { uploadToSupabase } from '@/lib/supabase';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { sendOrderSubmissionToTelegram } from '@/lib/telegram';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

type Order = {
    id: string;
    amount: number;
    baseAmount: number;
    status: string;
    createdAt: any;
    orderId: string;
    paymentType: string;
    sellerWithdrawalDetails?: any;
    buyerSelectedProvider?: string;
    buyerSelectedUpi?: string;
    matchedSellOrderId?: string;
    sellerId?: string;
};

const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hours} : ${mins} : ${secs}`;
};

const CopyRow = ({ label, value }: { label: string, value?: string | number }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value.toString());
        toast({ title: 'Copied', description: `${label} copied.` });
    };

    return (
        <div className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0">
            <span className="text-[11px] font-black uppercase text-slate-400 w-20">{label}</span>
            <span className="flex-1 text-sm font-black text-slate-800 truncate px-2 text-right">{value || '...'}</span>
            <button onClick={handleCopy} className="ml-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 active:scale-90 uppercase">Copy</button>
        </div>
    );
};

function ConfirmPageContent() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user, profile } = useUser();
    const firestore = useFirestore();

    const orderId = params.orderId as string;
    const [view, setView] = useState<'info' | 'prove'>('info');
    const [utr, setUtr] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(1800);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading } = useDoc<Order>(orderRef);

    useEffect(() => {
        if (!order) return;
        if (order.status !== 'pending_payment') {
            router.replace(`/order/${orderId}`);
            return;
        }

        const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        const expiryTime = new Date(createdAt.getTime() + 30 * 60 * 1000);

        const interval = setInterval(() => {
            const diff = Math.floor((expiryTime.getTime() - Date.now()) / 1000);
            if (diff <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order, orderId, router]);

    const handleCancelOrder = async () => {
        if (!order || !user || !firestore || !cancelReason.trim()) return;
        setIsCancelling(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const buyerOrderRef = doc(firestore, 'users', user.uid, 'orders', order.id);
                
                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'SYSTEM_VAULT') {
                    const sellerOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    const sellerUserOrderRef = doc(firestore, 'users', order.sellerId, 'sellOrders', order.matchedSellOrderId);

                    const sellerSnap = await transaction.get(sellerOrderRef);
                    if (sellerSnap.exists()) {
                        const matchedOrders = sellerSnap.data().matchedBuyOrders || [];
                        const updatedMatches = matchedOrders.filter((m: any) => m.buyOrderId !== order.id);
                        const currentRemaining = sellerSnap.data().remainingAmount || 0;
                        
                        transaction.update(sellerOrderRef, { 
                            matchedBuyOrders: updatedMatches,
                            remainingAmount: currentRemaining + order.baseAmount,
                            status: 'partially_filled'
                        });
                        transaction.update(sellerUserOrderRef, { 
                            matchedBuyOrders: updatedMatches,
                            remainingAmount: currentRemaining + order.baseAmount,
                            status: 'partially_filled'
                        });
                    }
                }

                transaction.update(buyerOrderRef, {
                    status: 'cancelled',
                    cancellationReason: cancelReason,
                    cancelledAt: serverTimestamp()
                });
            });

            toast({ title: 'Order Cancelled' });
            router.push('/home');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleConfirmSubmit = async () => {
        if (!utr || utr.length < 10) {
            toast({ variant: 'destructive', title: 'Invalid UTR', description: 'Please enter a valid reference number.' });
            return;
        }
        if (!screenshotFile) {
            toast({ variant: 'destructive', title: 'Screenshot Required', description: 'Please upload payment proof.' });
            return;
        }
        if (!user || !profile || !firestore || !order) return;

        setIsSubmitting(true);
        try {
            const path = `orders/${user.uid}/${orderId}/${Date.now()}.png`;
            const downloadUrl = await uploadToSupabase(screenshotFile, path);

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
                    screenshotURL: downloadUrl,
                    submittedAt: serverTimestamp()
                });
            });

            await sendOrderSubmissionToTelegram({
                orderId: order.orderId,
                uid: profile.numericId,
                mobile: profile.phoneNumber,
                amount: order.baseAmount || order.amount,
                utr: utr
            });

            toast({ title: 'Submitted Successfully' });
            router.push(`/order/${orderId}`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader size="md" /></div>;
    if (!order) return <div className="p-8 text-center font-black uppercase text-slate-400">Order Expired</div>;

    const details = order.sellerWithdrawalDetails;
    const upiLink = `upi://pay?pa=${details?.upiId}&pn=${encodeURIComponent(details?.name || 'Verified Node')}&am=${order.baseAmount}&tr=${order.orderId}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

    return (
        <div className="flex flex-col min-h-screen bg-white font-body">
            <header className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50">
                <Button onClick={() => view === 'prove' ? setView('info') : router.push('/buy')} variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                    <ChevronLeft className="h-6 w-6 text-slate-800" />
                </Button>
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-800">Buy FP Center</h1>
                <HelpCircle className="h-5 w-5 text-blue-500" />
            </header>

            <div className="bg-red-50 px-4 py-3 flex items-center gap-3 text-red-500 border-b border-red-100">
                <Clock className="h-5 w-5" />
                <span className="font-mono font-black text-base">{formatTime(timeLeft)}</span>
                <span className="text-[10px] font-black uppercase tracking-tight ml-1">Remaining</span>
            </div>

            <main className="flex-1 p-4 overflow-y-auto no-scrollbar pb-32">
                {view === 'info' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="relative p-4 bg-white rounded-3xl shadow-xl ring-1 ring-slate-100">
                                <div className="relative h-48 w-48 overflow-hidden rounded-xl">
                                    <Image src={qrUrl} alt="UPI QR Code" fill className="object-contain" unoptimized />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scan with MobiKwik / Freecharge</p>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-2 rounded-[24px] border border-slate-100 shadow-inner">
                            <CopyRow label="Receiver" value={details?.name || 'Verified Node'} />
                            <CopyRow label="UPI ID" value={details?.upiId} />
                            <CopyRow label="Amount" value={`₹${order.baseAmount.toFixed(2)}`} />
                            <CopyRow label="Token ID" value={order.orderId} />
                        </div>

                        <div className="space-y-3 pt-2 text-center">
                            <button onClick={() => setIsCancelDialogOpen(true)} className="text-[10px] font-black text-red-500 uppercase tracking-widest underline decoration-2 underline-offset-4">Unable to complete payment? Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="p-5 bg-red-600 text-white rounded-[24px]">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="h-6 w-6" />
                                <h3 className="font-black text-sm uppercase">Security Protocol</h3>
                            </div>
                            <p className="text-[10px] font-bold leading-relaxed uppercase">
                                Fake screenshots or wrong UTR will lead to permanent ban. Flex Pay is NOT responsible for lost funds.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">UTR / Reference Number</Label>
                                <Input placeholder="12-Digit Reference ID" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))} className="h-14 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 font-mono font-black" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Transfer Screenshot</Label>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                                <div onClick={() => fileInputRef.current?.click()} className={cn("w-full h-40 border-2 border-dashed rounded-[28px] flex flex-col items-center justify-center cursor-pointer", screenshotFile ? "bg-teal-50 border-teal-200 text-teal-600" : "bg-white border-slate-200 text-slate-300")}>
                                    {screenshotFile ? <p className="text-xs font-black uppercase">Proof Attached ✓</p> : <Upload className="h-8 w-8 opacity-30" />}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-xl border-t grid grid-cols-2 gap-3 z-50">
                <Button variant="outline" className="h-14 rounded-2xl text-slate-500 font-black text-xs uppercase" onClick={() => view === 'prove' ? setView('info') : router.push('/buy')}>
                    {view === 'info' ? "Back" : "Cancel"}
                </Button>

                {view === 'info' ? (
                    <Button onClick={() => setView('prove')} className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase">Finish Payment</Button>
                ) : (
                    <Button onClick={handleConfirmSubmit} className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase" disabled={isSubmitting || utr.length < 10 || !screenshotFile}>
                        {isSubmitting ? <Loader size="xs" /> : "I FINISHED"}
                    </Button>
                )}
            </footer>

            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="max-w-[320px] rounded-[28px] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight">Cancel Order?</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase text-slate-400">Reason for cancelling</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input placeholder="e.g. Bank issue, Changed mind" className="h-12 bg-slate-50 border-none rounded-xl text-xs font-bold" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                    </div>
                    <DialogFooter className="flex-row gap-2">
                        <Button variant="ghost" className="flex-1 rounded-xl text-[10px] font-black uppercase" onClick={() => setIsCancelDialogOpen(false)}>No</Button>
                        <Button className="flex-1 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase" disabled={isCancelling || !cancelReason.trim()} onClick={handleCancelOrder}>
                            {isCancelling ? <Loader size="xs" /> : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white"><Loader size="md" /></div>}>
            <ConfirmPageContent />
        </Suspense>
    );
}
