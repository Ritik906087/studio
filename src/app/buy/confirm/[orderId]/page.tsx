
'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, AlertCircle, Clock, HelpCircle, Upload, ShieldCheck, QrCode, Copy, ChevronRight, Zap } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const cancelReasons = [
    "Payment app not working",
    "Incorrect amount selected",
    "Receiver details mismatch",
    "No longer wish to buy",
    "Other"
];

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isCancelling, setIsCancelling] = useState(false);
    const [selectedReason, setSelectedReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading } = useDoc<Order>(orderRef);

    // --- AUTO-CANCEL TRANSACTION HELPER ---
    const triggerAutoCancel = async () => {
        if (!order || !user || !firestore || isCancelling) return;
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
                            remainingAmount: currentRemaining + (order.baseAmount || order.amount),
                            status: 'partially_filled'
                        });
                        transaction.update(sellerUserOrderRef, { 
                            matchedBuyOrders: updatedMatches,
                            remainingAmount: currentRemaining + (order.baseAmount || order.amount),
                            status: 'partially_filled'
                        });
                    }
                }

                transaction.update(buyerOrderRef, {
                    status: 'cancelled',
                    cancellationReason: 'Session Timeout',
                    cancelledAt: serverTimestamp()
                });
            });
            router.replace('/home');
        } catch (e) {
            console.error("Auto-cancel fail", e);
        }
    };

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
                triggerAutoCancel(); // Auto-cancel when timer reaches 0
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order, orderId, router]);

    const handleCancelOrder = async () => {
        const finalReason = selectedReason === "Other" ? customReason : selectedReason;
        if (!order || !user || !firestore || !finalReason.trim()) {
            toast({ variant: 'destructive', title: 'Reason required' });
            return;
        }
        
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
                            remainingAmount: currentRemaining + (order.baseAmount || order.amount),
                            status: 'partially_filled'
                        });
                        transaction.update(sellerUserOrderRef, { 
                            matchedBuyOrders: updatedMatches,
                            remainingAmount: currentRemaining + (order.baseAmount || order.amount),
                            status: 'partially_filled'
                        });
                    }
                }

                transaction.update(buyerOrderRef, {
                    status: 'cancelled',
                    cancellationReason: finalReason,
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
        if (timeLeft <= 0) {
            toast({ variant: 'destructive', title: 'Session Expired', description: 'This order has timed out.' });
            return;
        }
        if (!utr || utr.length < 10) {
            toast({ variant: 'destructive', title: 'Invalid proof', description: 'Enter full TXID or UTR.' });
            return;
        }
        if (!screenshotFile) {
            toast({ variant: 'destructive', title: 'Receipt Required' });
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

            try {
                await sendOrderSubmissionToTelegram({
                    orderId: order.orderId,
                    uid: profile.numericId,
                    mobile: profile.phoneNumber,
                    amount: order.baseAmount || order.amount,
                    utr: utr
                });
            } catch (tgError) {
                console.error("Telegram alert failed, but order was submitted.");
            }

            toast({ title: 'Submitted for Audit' });
            router.push(`/order/${orderId}`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Submission Failed' });
            setIsSubmitting(false);
        }
    };

    if (loading) return <Loader fullscreen={true} />;
    if (!order) return <div className="p-8 text-center font-black uppercase text-slate-400 pt-32">Order Expired</div>;

    const isUsdt = order.paymentType === 'usdt';
    const details = order.sellerWithdrawalDetails;
    const isSystemOrder = order.sellerId === 'SYSTEM_VAULT' || !order.matchedSellOrderId;

    let qrData = "";
    if (isUsdt) {
        qrData = details?.walletAddress || "";
    } else if (isSystemOrder) {
        qrData = details?.upiId || "";
    } else {
        qrData = `upi://pay?pa=${details?.upiId}&pn=${encodeURIComponent(details?.name || 'Flex Member')}&am=${order.baseAmount.toFixed(2)}&tr=${order.orderId}&cu=INR`;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="flex flex-col min-h-screen bg-white font-body">
            <header className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50 shadow-sm">
                <Button onClick={() => view === 'prove' ? setView('info') : router.push('/buy')} variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-slate-50">
                    <ChevronLeft className="h-5 w-5 text-slate-800" />
                </Button>
                <h1 className="text-xs font-black uppercase tracking-widest text-slate-800">
                    {isUsdt ? "USDT Gateway" : "Secure Payment"}
                </h1>
                <HelpCircle className="h-5 w-5 text-blue-500" />
            </header>

            <div className="bg-red-50 px-4 py-3 flex items-center gap-3 text-red-500 border-b border-red-100">
                <Clock className="h-5 w-5" />
                <span className="font-mono font-black text-base">{formatTime(timeLeft)}</span>
                <span className="text-[10px] font-black uppercase tracking-tight ml-auto bg-red-500 text-white px-2 py-0.5 rounded">Session Active</span>
            </div>

            <main className="flex-1 p-4 overflow-y-auto no-scrollbar pb-32">
                {view === 'info' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="relative p-6 bg-white rounded-[32px] shadow-2xl ring-1 ring-slate-100 group active:scale-[0.98] transition-transform">
                                <div className="relative h-48 w-48 overflow-hidden rounded-2xl">
                                    <Image src={qrUrl} alt="QR Code" fill className="object-contain" unoptimized />
                                </div>
                                <div className={cn("absolute -bottom-3 left-1/2 -translate-x-1/2 text-white px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5", isUsdt ? "bg-amber-500" : "bg-blue-600")}>
                                    <QrCode className="h-3 w-3" />
                                    <span className="text-[9px] font-black uppercase">{isUsdt ? "Scan Wallet" : "Scan to Pay"}</span>
                                </div>
                            </div>
                            <div className="text-center space-y-1 pt-2">
                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">
                                    {isUsdt ? "TRC20 Wallet Node" : (isSystemOrder ? "Authorized QR Node" : "P2P Settlement")}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">
                                    Identity Verified
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-4 rounded-[28px] border border-slate-100 shadow-inner">
                            {isUsdt ? (
                                <>
                                    <CopyRow label="Address" value={details?.walletAddress} />
                                    <div className="flex justify-between items-center py-3.5 border-b border-slate-100">
                                        <span className="text-[11px] font-black uppercase text-slate-400">Network</span>
                                        <span className="font-black text-amber-600 text-xs uppercase tracking-widest">TRC-20</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3.5">
                                        <span className="text-[11px] font-black uppercase text-slate-400">USDT Amt</span>
                                        <span className="font-black text-slate-800 text-xs">{details?.usdtAmount || '...'} USDT</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <CopyRow label="Receiver" value={details?.name || 'Flex System'} />
                                    <CopyRow label="Amount" value={`₹${order.baseAmount.toFixed(2)}`} />
                                    <CopyRow label="Order ID" value={order.orderId} />
                                    {!isSystemOrder && <CopyRow label="UPI ID" value={details?.upiId} />}
                                </>
                            )}
                        </div>

                        <div className={cn(
                            "p-4 rounded-2xl border flex gap-3 items-center",
                            isUsdt ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                        )}>
                            {isUsdt ? <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" /> : <ShieldCheck className="h-6 w-6 text-blue-500 shrink-0" />}
                            <p className={cn("text-[9px] font-bold uppercase leading-relaxed", isUsdt ? "text-amber-700" : "text-blue-700")}>
                                {isUsdt 
                                    ? "WARNING: Send ONLY USDT to this address via TRC20 network. Other tokens or networks will be permanently lost."
                                    : "P2P Settlement active. Please pay the exact amount shown above to ensure instant asset release."
                                }
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="p-5 bg-slate-900 text-white rounded-[24px]">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="h-6 w-6 text-blue-400" />
                                <h3 className="font-black text-sm uppercase">Audit Submission</h3>
                            </div>
                            <p className="text-[10px] font-bold leading-relaxed uppercase opacity-70">
                                Enter the 12-digit UTR or Transaction ID (TXID) accurately. Wrong input will delay or fail the audit.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ref ID / TXID</Label>
                                <Input placeholder={isUsdt ? "Enter Transaction Hash" : "12-Digit Reference Number"} value={utr} onChange={(e) => setUtr(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 font-mono font-black" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Proof Screenshot</Label>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                                <div onClick={() => fileInputRef.current?.click()} className={cn("w-full h-44 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center cursor-pointer transition-all", screenshotFile ? "bg-teal-50 border-teal-200 text-teal-600" : "bg-slate-50 border-slate-200 text-slate-300")}>
                                    {screenshotFile ? (
                                        <div className="text-center space-y-2">
                                            <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-sm"><Upload className="h-6 w-6" /></div>
                                            <p className="text-[10px] font-black uppercase">Receipt Attached ✓</p>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <Upload className="h-8 w-8 mx-auto opacity-30" />
                                            <p className="text-[9px] font-black uppercase opacity-40">Tap to Upload Screenshot</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-xl border-t grid grid-cols-2 gap-3 z-50">
                <Button variant="outline" className="h-14 rounded-2xl text-red-500 border-red-100 font-black text-xs uppercase" onClick={() => setIsCancelDialogOpen(true)}>
                    Cancel
                </Button>

                {view === 'info' ? (
                    <Button onClick={() => setView('prove')} className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase">Submit Proof</Button>
                ) : (
                    <Button onClick={handleConfirmSubmit} className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase" disabled={isSubmitting || utr.length < 8 || !screenshotFile || timeLeft <= 0}>
                        {isSubmitting ? "UPLOADING..." : "CONFIRM"}
                    </Button>
                )}
            </footer>

            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="max-w-[340px] rounded-[32px] p-6 bg-white overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="text-center mb-4">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Stop Payment?</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Select cancellation reason</DialogDescription>
                    </DialogHeader>
                    
                    <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2 mb-4">
                        {cancelReasons.map((reason) => (
                            <div key={reason} className={cn(
                                "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer",
                                selectedReason === reason ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-50"
                            )} onClick={() => setSelectedReason(reason)}>
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value={reason} id={reason} className="h-4 w-4" />
                                    <Label htmlFor={reason} className="text-[11px] font-bold text-slate-700 cursor-pointer">{reason}</Label>
                                </div>
                            </div>
                        ))}
                    </RadioGroup>

                    {selectedReason === "Other" && (
                        <div className="mb-4 animate-in slide-in-from-top-2">
                            <Input 
                                placeholder="Type reason..." 
                                className="h-12 bg-slate-100 border-none rounded-xl text-xs font-bold px-4"
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                            />
                        </div>
                    )}

                    <DialogFooter className="flex-row gap-3 mt-2">
                        <Button variant="ghost" className="flex-1 rounded-xl text-[10px] font-black uppercase text-slate-400" onClick={() => { setIsCancelDialogOpen(false); }}>Close</Button>
                        <Button 
                            className="flex-[1.5] bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase" 
                            disabled={isCancelling || !selectedReason} 
                            onClick={handleCancelOrder}
                        >
                            {isCancelling ? "STOPPING..." : "Cancel Order"}
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
