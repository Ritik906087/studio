'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, CheckCircle2, XCircle, AlertCircle, Hash, Clock, HelpCircle, Upload, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
    const { user } = useUser();
    const firestore = useFirestore();

    const orderId = params.orderId as string;
    const [view, setView] = useState<'info' | 'prove'>('info');
    const [utr, setUtr] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(1800);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleConfirmSubmit = async () => {
        if (!utr || utr.length < 10) {
            toast({ variant: 'destructive', title: 'Invalid UTR', description: 'Please enter a valid reference number.' });
            return;
        }
        if (!screenshotFile) {
            toast({ variant: 'destructive', title: 'Screenshot Required', description: 'Please upload payment proof.' });
            return;
        }
        if (!user || !firestore || !order) return;

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

            toast({ title: 'Submitted Successfully', description: 'Redirecting to status page...' });
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

    return (
        <div className="flex flex-col min-h-screen bg-white font-body">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50">
                <Button onClick={() => view === 'prove' ? setView('info') : router.push('/buy')} variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                    <ChevronLeft className="h-6 w-6 text-slate-800" />
                </Button>
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-800">Buy FP Center</h1>
                <HelpCircle className="h-5 w-5 text-blue-500" />
            </header>

            {/* Timer Banner */}
            <div className="bg-red-50 px-4 py-3 flex items-center gap-3 text-red-500 border-b border-red-100">
                <Clock className="h-5 w-5" />
                <span className="font-mono font-black text-base">{formatTime(timeLeft)}</span>
                <span className="text-[10px] font-black uppercase tracking-tight ml-1">Time Remaining to Pay</span>
            </div>

            {/* Steps */}
            <div className="px-6 py-6">
                <div className="flex items-center justify-between relative px-2 mb-2">
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 -translate-y-1/2 z-0" />
                    <div className={cn("relative z-10 h-4 w-4 rounded-full border-2 transition-all", (view === 'info' || view === 'prove') ? "bg-blue-600 border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-white border-slate-200")} />
                    <div className={cn("relative z-10 h-4 w-4 rounded-full border-2 transition-all", view === 'prove' ? "bg-blue-600 border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-white border-slate-200")} />
                    <div className="relative z-10 h-4 w-4 rounded-full border-2 bg-white border-slate-200" />
                </div>
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                    <span className={cn(view === 'info' && "text-blue-600")}>1. Payment Info</span>
                    <span className={cn(view === 'prove' && "text-blue-600")}>2. Payment Prove</span>
                    <span>3. Audit Result</span>
                </div>
            </div>

            <main className="flex-1 p-4 overflow-y-auto no-scrollbar pb-32">
                {view === 'info' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                             <p className="text-xs font-black text-blue-700 leading-tight">
                                PLEASE USE {order.buyerSelectedProvider?.toUpperCase() || 'ANY UPI APP'} TO SEND THE EXACT AMOUNT TO THE DESTINATION BELOW.
                             </p>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-2 rounded-[24px] border border-slate-100 shadow-inner">
                            <CopyRow label="Receiver" value={details?.name || 'Verified Node'} />
                            <CopyRow label="UPI ID" value={details?.upiId} />
                            <CopyRow label="Amount" value={`₹${order.baseAmount.toFixed(2)}`} />
                            <CopyRow label="Token ID" value={order.orderId} />
                        </div>

                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-bold text-red-600 leading-tight uppercase flex gap-2">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                Amount must be consistent, otherwise transaction will fail.
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase flex gap-2">
                                <Info className="h-3.5 w-3.5 shrink-0" />
                                If already paid, do not cancel. Wait for system audit.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* WARNING SECTION */}
                        <div className="p-5 bg-red-600 text-white rounded-[24px] shadow-lg shadow-red-200">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="h-6 w-6" />
                                <h3 className="font-black text-sm uppercase tracking-tight">Security Protocol Active</h3>
                            </div>
                            <p className="text-[10px] font-bold leading-relaxed uppercase opacity-90">
                                Submitting fake screenshots, wrong UTR, or incorrect amounts will lead to immediate permanent ban and total asset freeze. Flex Pay is NOT responsible for funds lost due to non-compliance with these rules.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-1.5 px-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">UTR / Reference Number</Label>
                                <div className="relative group">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder="12-Digit Reference ID" 
                                        value={utr} 
                                        onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                        className="h-14 pl-11 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 font-mono font-black text-base focus-visible:ring-primary/40"
                                    />
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase ml-1">Check your bank SMS for the UTR</p>
                            </div>

                            <div className="space-y-1.5 px-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Transfer Screenshot</Label>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "w-full h-40 border-2 border-dashed rounded-[28px] flex flex-col items-center justify-center cursor-pointer transition-all",
                                        screenshotFile ? "bg-teal-50 border-teal-200 text-teal-600" : "bg-white border-slate-200 text-slate-300 hover:border-primary"
                                    )}
                                >
                                    {screenshotFile ? (
                                        <div className="text-center space-y-2">
                                            <div className="h-12 w-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto shadow-md">
                                                <CheckCircle2 className="h-7 w-7 text-white" />
                                            </div>
                                            <p className="text-xs font-black uppercase">Proof Attached ✓</p>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-3">
                                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100 shadow-sm">
                                                <Upload className="h-6 w-6 opacity-30" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tap to upload</p>
                                                <p className="text-[8px] font-bold opacity-40 uppercase">JPEG or PNG only</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Sticky Footer */}
            <footer className="fixed bottom-0 w-full p-4 bg-white/80 backdrop-blur-xl border-t grid grid-cols-2 gap-3 z-50">
                <Button 
                    variant="outline" 
                    className="h-14 rounded-2xl text-slate-500 border-slate-200 font-black text-xs uppercase" 
                    onClick={() => view === 'info' ? router.push('/buy') : setView('info')}
                >
                    {view === 'info' ? "Cancel" : "Back"}
                </Button>

                {view === 'info' ? (
                    <Button onClick={() => setView('prove')} className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase shadow-blue-500/20">
                        Finish Payment
                    </Button>
                ) : (
                    <Button 
                        onClick={handleConfirmSubmit} 
                        className="h-14 btn-gradient rounded-2xl font-black text-xs uppercase shadow-teal-500/20" 
                        disabled={isSubmitting || utr.length < 10 || !screenshotFile}
                    >
                        {isSubmitting ? <Loader size="xs" /> : "I FINISHED"}
                    </Button>
                )}
            </footer>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader size="md" /></div>}>
            <ConfirmPageContent />
        </Suspense>
    );
}
