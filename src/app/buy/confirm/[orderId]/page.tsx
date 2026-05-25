
'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, AlertCircle, Clock, HelpCircle, Upload, ShieldCheck, QrCode, Copy } from 'lucide-react';
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

const CopyRow = ({ label, value, isHidden = false }: { label: string, value?: string | number, isHidden?: boolean }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value.toString());
        toast({ title: 'Copied' });
    };

    if (isHidden) return null;

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
    fileInputRef = useRef<HTMLInputElement>(null);

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
                
                if (order.matchedSellOrderId && order.sellerId && !['SYSTEM_VAULT', 'ADMIN'].includes(order.sellerId)) {
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
                
                if (order.matchedSellOrderId && order.sellerId && !['SYSTEM_VAULT', 'ADMIN'].includes(order.sellerId)) {
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
            setIsSubmitting(false);
        }
    };

    if (loading) return <Loader fullscreen={true} />;
    if (!order) return <div className="p-8 text-center font-black uppercase text-slate-400 pt-32">Order Expired</div>;

    const details = order.sellerWithdrawalDetails;
    const isSystemOrder = order.sellerId === 'SYSTEM_VAULT' || !order.matchedSellOrderId;

    // HYBRID QR LOGIC
    let qrData = "";
    if (isSystemOrder) {
        // Plain Text QR for System/Admin - ONLY use the provided ID/Text
        qrData = details?.upiId || "";
    } else {
        // Standard Payment QR for P2P Users
        qrData = `upi://pay?pa=${details?.upiId}&pn=${encodeURIComponent(details?.name || 'Flex User')}&am=${order.baseAmount.toFixed(2)}&tr=${order.orderId}&cu=INR`;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="flex flex-col min-h-screen bg-white font-body">
            <header className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50">
                <Button onClick={() => view === 'prove' ? setView('info') : router.push('/buy')} variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                    <ChevronLeft className="h-6 w-6 text-slate-800" />
                </Button>
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-800">
                    {isSystemOrder ? "System Audit" : "P2P Settlement"}
                </h1>
                <HelpCircle className="h-5 w-5 text-blue-500" />
            </header>

            <div className="bg-red-50 px-4 py-3 flex items-center gap-3 text-red-500 border-b border-red-100">
                <Clock className="h-5 w-5" />
                <span className="font-mono font-black text-base">{formatTime(timeLeft)}</span>
                <span className="text-[10px] font-black uppercase tracking-tight ml-1">Session Active</span>
            </div>

            <main className="flex-1 p-4 overflow-y-auto no-scrollbar pb-32">
                {view === 'info' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="relative p-6 bg-white rounded-[32px] shadow-2xl ring-1 ring-slate-100 group active:scale-[0.98] transition-transform">
                                <div className="relative h-48 w-48 overflow-hidden rounded-2xl">
                                    <Image src={qrUrl} alt="QR Code" fill className="object-contain" unoptimized />
                                </div>
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                                    <QrCode className="h-3 w-3" />
                                    <span className="text-[9px] font-black uppercase">Scan to Pay</span>
                                </div>
                            </div>
                            <div className="text-center space-y-1 pt-2">
                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">
                                    {isSystemOrder ? "Secure Text-to-QR Protocol" : "Instant P2P Network Scan"}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">
                                    Status: Verified Receiver Active
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-3 rounded-[28px] border border-slate-100 shadow-inner">
                            <CopyRow label="Receiver" value={details?.name || 'Authorized Member'} />
                            <CopyRow label="Amount" value={`₹${order.baseAmount.toFixed(2)}`} />
                            <CopyRow label="Order ID" value={order.orderId} />
                            
                            {/* Identifier Visibility Logic */}
                            {!isSystemOrder ? (
                                <CopyRow label="UPI ID" value={details?.upiId} />
                            ) : (
                                <div className="flex items-center justify-between py-3.5 border-t border-slate-100/50">
                                    <span className="text-[11px] font-black uppercase text-slate-400 w-20">Identity</span>
                                    <span className="flex-1 text-[10px] font-black text-blue-600/50 text-right uppercase tracking-[0.2em]">Hidden for Security</span>
                                </div>
                            )}
                        </div>

                        <div className={cn(
                            "p-4 rounded-2xl border flex gap-3 items-center",
                            isSystemOrder ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                        )}>
                            <ShieldCheck className={cn("h-6 w-6 shrink-0", isSystemOrder ? "text-amber-500" : "text-blue-500")} />
                            <p className={cn("text-[9px] font-bold uppercase leading-relaxed", isSystemOrder ? "text-amber-700" : "text-blue-700")}>
                                {isSystemOrder 
                                    ? "This is a secure system ID. Manual copying is disabled. Use the QR code to verify details in your payment app."
                                    : "P2P Settlement active. Please pay the exact amount shown above to ensure instant asset release."
                                }
                            </p>
                        </div>

                        <div className="space-y-3 pt-2 text-center">
                            <button onClick={() => setIsCancelDialogOpen(true)} className="text-[10px] font-black text-red-500 uppercase tracking-widest underline decoration-2 underline-offset-4">Terminate Order</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="p-5 bg-blue-600 text-white rounded-[24px]">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="h-6 w-6" />
                                <h3 className="font-black text-sm uppercase">Audit Submission</h3>
                            </div>
                            <p className="text-[10px] font-bold leading-relaxed uppercase">
                                Please ensure the 12-digit UTR and screenshot are correct. Mismatch will result in rejection.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">UTR / Reference Number</Label>
                                <Input placeholder="12-Digit Ref ID" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))} className="h-14 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 font-mono font-black" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Payment Screenshot</Label>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                                <div onClick={() => fileInputRef.current?.click()} className={cn("w-full h-44 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center cursor-pointer transition-all", screenshotFile ? "bg-teal-50 border-teal-200 text-teal-600" : "bg-slate-50 border-slate-200 text-slate-300")}>
                                    {screenshotFile ? (
                                        <div className="text-center space-y-2">
                                            <div className="h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto"><Upload className="h-5 w-5" /></div>
                                            <p className="text-[10px] font-black uppercase">Proof Attached ✓</p>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <Upload className="h-8 w-8 mx-auto opacity-30" />
                                            <p className="text-[9px] font-black uppercase opacity-40">Tap to Upload Receipt</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-xl border-t grid grid-cols-2 gap-3 z-50">
                <Button variant="outline" className="h-14 rounded-2xl text-slate-500 font-black text-xs uppercase" onClick={() => view === 'prove' ? setView('info') : router.push('/buy')}>
                    Back
                </Button>

                {view === 'info' ? (
                    <Button onClick={() => setView('prove')} className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase">Submit Proof</Button>
                ) : (
                    <Button onClick={handleConfirmSubmit} className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase" disabled={isSubmitting || utr.length < 10 || !screenshotFile}>
                        {isSubmitting ? "SUBMITTING..." : "CONFIRM"}
                    </Button>
                )}
            </footer>

            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="max-w-[320px] rounded-[28px] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight">Cancel Order?</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase text-slate-400">Please provide a reason</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input placeholder="Reason for cancellation" className="h-12 bg-slate-50 border-none rounded-xl text-xs font-bold" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                    </div>
                    <DialogFooter className="flex-row gap-2">
                        <Button variant="ghost" className="flex-1 rounded-xl text-[10px] font-black uppercase" onClick={() => setIsCancelDialogOpen(false)}>No</Button>
                        <Button className="flex-1 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase" disabled={isCancelling || !cancelReason.trim()} onClick={handleCancelOrder}>
                            {isCancelling ? "CANCELING..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={<Loader fullscreen={true} />}>
            <ConfirmPageContent />
        </Suspense>
    );
}
