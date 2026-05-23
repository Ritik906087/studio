'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Loader2, Search, ArrowRight, Wallet, BadgePercent, Coins, AlertCircle, TrendingUp, Hash } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, limit } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Updated: Plan IDs are now 12-digit numeric strings
const purchaseOptions = [
  { id: '100029384756', amount: 100 },
  { id: '200058372910', amount: 500 },
  { id: '300094857261', amount: 1000 },
  { id: '400037281940', amount: 2000 },
  { id: '500019283746', amount: 5000 },
  { id: '600057283910', amount: 10000 },
];

const USDT_RATE = 108; 
const MIN_USDT = 5;

export default function BuyPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isMatching, setIsMatching] = useState(false);
  const [inProgressOrder, setInProgressOrder] = useState<any>(null);
  const [usdtAddress, setUsdtAddress] = useState<string | null>(null);
  
  // USDT Calculator State
  const [usdtInput, setUsdtInput] = useState<string>('5');

  useEffect(() => {
    if (!user || !firestore) return;
    const q = query(
      collection(firestore, 'users', user.uid, 'orders'), 
      where('status', 'in', ['pending_payment', 'pending_confirmation']), 
      limit(1)
    );
    getDocs(q).then(snap => { 
        if (!snap.empty) {
            setInProgressOrder({ id: snap.docs[0].id, ...snap.docs[0].data() }); 
        } else {
            setInProgressOrder(null);
        }
    });

    const usdtQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'usdt'), limit(1));
    getDocs(usdtQuery).then(snap => {
        if (!snap.empty) setUsdtAddress(snap.docs[0].data().usdtWalletAddress);
    });
  }, [user, firestore]);

  // Updated: Raw Order ID is now 12 digits
  const generateRawOrderId = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  };

  const handleP2PMatch = async (amountInInr: number, type: 'upi' | 'usdt' = 'upi', usdtValue?: number) => {
    if (!user || !firestore) {
        toast({ title: "Session Expired", description: "Please login again.", variant: "destructive" });
        return;
    }

    if (inProgressOrder) { 
        toast({ title: "Pending Order", description: "Please complete or cancel your existing order first.", variant: "destructive" }); 
        if (inProgressOrder.status === 'pending_payment') {
            router.push(`/buy/confirm/${inProgressOrder.id}`);
        } else {
            router.push(`/order/${inProgressOrder.id}`);
        }
        return; 
    }

    setIsMatching(true);
    try {
        const rawOrderId = generateRawOrderId();
        const displayOrderId = "#" + rawOrderId;
        const bonusPercent = 6;
        const flatBonus = 5;
        const totalAmount = amountInInr + (amountInInr * bonusPercent / 100) + flatBonus;
        
        const buyOrderRef = doc(firestore, 'users', user.uid, 'orders', rawOrderId);

        if (type === 'usdt') {
            if (!usdtAddress) throw new Error("USDT Payment Server is offline.");
            if (!usdtValue || usdtValue < MIN_USDT) throw new Error(`Minimum deposit is ${MIN_USDT} USDT`);
            
            await runTransaction(firestore, async (transaction) => {
                transaction.set(buyOrderRef, {
                    id: rawOrderId,
                    userId: user.uid,
                    orderId: displayOrderId,
                    amount: totalAmount,
                    baseAmount: amountInInr,
                    usdtAmount: usdtValue,
                    bonusPercentage: bonusPercent,
                    flatBonus: flatBonus,
                    paymentType: 'usdt',
                    paymentProvider: 'CRYPTO_SERVER',
                    status: 'pending_payment',
                    sellerId: 'ADMIN',
                    sellerWithdrawalDetails: {
                        type: 'usdt',
                        walletAddress: usdtAddress,
                        network: 'TRC20'
                    },
                    createdAt: serverTimestamp(),
                });
            });
            router.push(`/buy/confirm/${rawOrderId}`);
            return;
        }

        // --- UPI Matching Logic ---
        const sellOrdersQuery = query(
            collection(firestore, 'sellOrders'),
            where('status', 'in', ['pending', 'partially_filled']),
            limit(50)
        );

        const sellSnap = await getDocs(sellOrdersQuery);
        const sellerDoc = sellSnap.docs.find(d => d.data().remainingAmount >= amountInInr);

        if (!sellerDoc) {
            const adminPMQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'upi'), limit(1));
            const adminPMSnap = await getDocs(adminPMQuery);
            if (adminPMSnap.empty) throw new Error("Liquidity Pool Busy. Try again in 5 mins.");

            const adminMethod = adminPMSnap.docs[0].data();

            await runTransaction(firestore, async (transaction) => {
                transaction.set(buyOrderRef, {
                    id: rawOrderId,
                    userId: user.uid,
                    orderId: displayOrderId,
                    amount: totalAmount,
                    baseAmount: amountInInr,
                    bonusPercentage: bonusPercent,
                    flatBonus: flatBonus,
                    paymentType: 'admin_transfer',
                    paymentProvider: 'ADMIN_SERVER',
                    status: 'pending_payment',
                    sellerId: 'ADMIN',
                    sellerWithdrawalDetails: {
                        type: 'upi',
                        name: adminMethod.upiHolderName || 'Admin Master Portal',
                        upiId: adminMethod.upiId
                    },
                    createdAt: serverTimestamp(),
                });
            });
            router.push(`/buy/confirm/${rawOrderId}`);
            return;
        }

        const sellerOrderId = sellerDoc.id;
        await runTransaction(firestore, async (transaction) => {
            const freshSellerSnap = await transaction.get(sellerDoc.ref);
            const freshSellerData = freshSellerSnap.data();

            if (!freshSellerData || freshSellerData.remainingAmount < amountInInr || !['pending', 'partially_filled'].includes(freshSellerData.status)) {
                throw new Error("Match rotation error. Retrying...");
            }

            const newRemaining = freshSellerData.remainingAmount - amountInInr;
            const newStatus = newRemaining <= 0 ? 'processing' : 'partially_filled';

            const matchEntry = {
                buyOrderId: rawOrderId,
                buyerId: user.uid,
                amount: amountInInr,
                status: 'pending_payment',
                created_at: new Date().toISOString()
            };

            transaction.update(sellerDoc.ref, {
                remainingAmount: newRemaining,
                status: newStatus,
                matchedBuyOrders: [...(freshSellerData.matchedBuyOrders || []), matchEntry]
            });

            const sellerUserRef = doc(firestore, 'users', freshSellerData.userId, 'sellOrders', sellerOrderId);
            transaction.update(sellerUserRef, {
                remainingAmount: newRemaining,
                status: newStatus,
                matchedBuyOrders: [...(freshSellerData.matchedBuyOrders || []), matchEntry]
            });

            transaction.set(buyOrderRef, {
                id: rawOrderId,
                userId: user.uid,
                orderId: displayOrderId,
                amount: totalAmount,
                baseAmount: amountInInr,
                bonusPercentage: bonusPercent,
                flatBonus: flatBonus,
                paymentType: 'p2p_upi',
                paymentProvider: 'P2P-Matched',
                status: 'pending_payment',
                sellerId: freshSellerData.userId,
                sellerWithdrawalDetails: freshSellerData.withdrawalMethod,
                matchedSellOrderId: sellerOrderId,
                createdAt: serverTimestamp(),
            });
        });

        toast({ title: "Match Success!" });
        router.push(`/buy/confirm/${rawOrderId}`);

    } catch (e: any) {
        toast({ title: "Matching Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsMatching(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
      <header className="flex items-center gap-3 p-4 bg-white sticky top-0 z-[60] border-b shadow-sm">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Buy Center</h1>
      </header>

      <main className="p-3 space-y-4">
        <Tabs defaultValue="upi" className="w-full">
            <TabsList className="grid grid-cols-2 bg-slate-200/50 p-1 rounded-2xl h-12 mb-4">
                <TabsTrigger value="upi" className="rounded-xl font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">UPI Portal</TabsTrigger>
                <TabsTrigger value="usdt" className="rounded-xl font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">USDT (TRC20)</TabsTrigger>
            </TabsList>

            <TabsContent value="upi">
                <div className="flex flex-col gap-3 pb-24">
                    {purchaseOptions.map((opt) => (
                        <Card 
                            key={opt.id} 
                            className="p-4 border-none shadow-sm rounded-[24px] active:scale-[0.98] transition-all group overflow-hidden relative cursor-pointer flex items-center justify-between bg-white ring-1 ring-slate-100" 
                            onClick={() => !isMatching && handleP2PMatch(opt.amount, 'upi')}
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                                    <Wallet className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 font-mono tracking-tighter mb-1.5">#{opt.id}</p>
                                    <p className="text-2xl font-black text-slate-800 leading-none">₹{opt.amount.toLocaleString()}</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <BadgePercent className="h-3 w-3 text-teal-600" />
                                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-tighter">Get ₹{opt.amount.toLocaleString()} + 6% + ₹5</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-blue-500/10 group-active:translate-x-1 transition-transform">
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="usdt" className="space-y-4 animate-in fade-in duration-300">
                <Card className="border-none bg-white rounded-[32px] shadow-lg ring-1 ring-slate-100 overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                        <div className="text-center space-y-1">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">USDT Calculator</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate: ₹{USDT_RATE}/USDT (TRC20)</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">USDT Amount</Label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black">$</div>
                                    <Input 
                                        type="number"
                                        placeholder="Min 5 USDT"
                                        value={usdtInput}
                                        onChange={(e) => setUsdtInput(e.target.value)}
                                        className="h-14 pl-8 bg-slate-50 border-none ring-2 ring-slate-100 rounded-2xl text-lg font-black focus-visible:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-primary text-white rounded-2xl flex items-center justify-between shadow-xl shadow-blue-500/10">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase opacity-60">You Receive</p>
                                    <p className="text-2xl font-black tracking-tighter">₹{(Number(usdtInput) * USDT_RATE).toLocaleString()}</p>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] text-red-800 font-black leading-tight uppercase tracking-tight">CRITICAL WARNING</p>
                                <p className="text-[9px] text-red-600 font-bold uppercase leading-relaxed">
                                    USE TRC20 NETWORK ONLY. DEPOSITS TO WRONG NETWORK OR INCORRECT AMOUNTS WILL BE LOST PERMANENTLY.
                                </p>
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleP2PMatch(Number(usdtInput) * USDT_RATE, 'usdt', Number(usdtInput))}
                            className="w-full h-14 btn-gradient rounded-[20px] font-black text-sm shadow-teal-500/20"
                            disabled={isMatching || Number(usdtInput) < MIN_USDT}
                        >
                            {isMatching ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "DEPOSIT USDT"}
                        </Button>
                    </CardContent>
                </Card>

                <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] py-4">Secured by Flex Shield 4.0</p>
            </TabsContent>
        </Tabs>

        {isMatching && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center">
                 <Card className="w-full max-w-xs animate-in zoom-in-95 duration-200 p-10 rounded-[40px] border-none shadow-2xl bg-white">
                     <div className="relative w-20 h-20 mx-auto mb-6">
                        <Loader2 className="w-20 h-20 text-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="h-8 w-8 text-primary animate-pulse" />
                        </div>
                     </div>
                     <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Syncing Pool</h3>
                     <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest leading-relaxed">Checking Liquidity fallback...</p>
                 </Card>
            </div>
        )}
      </main>
    </div>
  );
}
