'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Search, Shield, ArrowRight, Wallet, BadgePercent, Coins } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, limit } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const purchaseOptions = [
  { id: 'B-101', amount: 100 },
  { id: 'B-102', amount: 500 },
  { id: 'B-103', amount: 1000 },
  { id: 'B-104', amount: 2000 },
  { id: 'B-105', amount: 5000 },
  { id: 'B-106', amount: 10000 },
];

export default function BuyPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isMatching, setIsMatching] = useState(false);
  const [inProgressOrder, setInProgressOrder] = useState<any>(null);
  const [usdtAddress, setUsdtAddress] = useState<string | null>(null);

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

    // Fetch USDT address for the USDT tab
    const usdtQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'usdt'), limit(1));
    getDocs(usdtQuery).then(snap => {
        if (!snap.empty) setUsdtAddress(snap.docs[0].data().usdtWalletAddress);
    });
  }, [user, firestore]);

  const generateOrderId = () => {
    const num = Math.floor(1000000000 + Math.random() * 9000000000);
    return `#${num}`;
  };

  const handleP2PMatch = async (amount: number, type: 'upi' | 'usdt' = 'upi') => {
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
        const displayOrderId = generateOrderId();
        const bonusPercent = 6;
        const flatBonus = 5;
        // Calculation: Base + (Base * 6%) + 5
        const totalAmount = amount + (amount * bonusPercent / 100) + flatBonus;
        const buyOrderRef = doc(collection(firestore, 'users', user.uid, 'orders'));

        if (type === 'usdt') {
            if (!usdtAddress) throw new Error("USDT Payment Server is offline.");
            
            await runTransaction(firestore, async (transaction) => {
                transaction.set(buyOrderRef, {
                    userId: user.uid,
                    orderId: displayOrderId,
                    amount: totalAmount,
                    baseAmount: amount,
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
            router.push(`/buy/confirm/${buyOrderRef.id}`);
            return;
        }

        // --- UPI / P2P Logic ---
        const sellOrdersQuery = query(
            collection(firestore, 'sellOrders'),
            where('status', 'in', ['pending', 'partially_filled']),
            limit(50)
        );

        const sellSnap = await getDocs(sellOrdersQuery);
        const sellerDoc = sellSnap.docs.find(d => d.data().remainingAmount >= amount);

        if (!sellerDoc) {
            // Fallback to Admin UPI
            const adminPMQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'upi'), limit(1));
            const adminPMSnap = await getDocs(adminPMQuery);
            if (adminPMSnap.empty) throw new Error("Liquidity Pool Busy. Try again in 5 mins.");

            const adminMethod = adminPMSnap.docs[0].data();

            await runTransaction(firestore, async (transaction) => {
                transaction.set(buyOrderRef, {
                    userId: user.uid,
                    orderId: displayOrderId,
                    amount: totalAmount,
                    baseAmount: amount,
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
            router.push(`/buy/confirm/${buyOrderRef.id}`);
            return;
        }

        // P2P Match
        const sellerOrderId = sellerDoc.id;
        await runTransaction(firestore, async (transaction) => {
            const freshSellerSnap = await transaction.get(sellerDoc.ref);
            const freshSellerData = freshSellerSnap.data();

            if (!freshSellerData || freshSellerData.remainingAmount < amount || !['pending', 'partially_filled'].includes(freshSellerData.status)) {
                throw new Error("Match rotation error. Retrying...");
            }

            const newRemaining = freshSellerData.remainingAmount - amount;
            const newStatus = newRemaining <= 0 ? 'processing' : 'partially_filled';

            const matchEntry = {
                buyOrderId: buyOrderRef.id,
                buyerId: user.uid,
                amount: amount,
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
                userId: user.uid,
                orderId: displayOrderId,
                amount: totalAmount,
                baseAmount: amount,
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
        router.push(`/buy/confirm/${buyOrderRef.id}`);

    } catch (e: any) {
        toast({ title: "Matching Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsMatching(false);
    }
  };

  const RenderOptionList = ({ type }: { type: 'upi' | 'usdt' }) => (
    <div className="flex flex-col gap-3 pb-24">
        {purchaseOptions.map((opt) => (
            <Card 
                key={opt.id} 
                className="p-4 border-none shadow-sm rounded-[24px] active:scale-[0.98] transition-all group overflow-hidden relative cursor-pointer flex items-center justify-between bg-white ring-1 ring-slate-100" 
                onClick={() => !isMatching && handleP2PMatch(opt.amount, type)}
            >
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                        {type === 'upi' ? <Wallet className="h-6 w-6 text-primary" /> : <Coins className="h-6 w-6 text-amber-500" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">No: {opt.id}</span>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume</p>
                        </div>
                        <p className="text-xl font-black text-slate-800 leading-none mt-1">₹{opt.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <BadgePercent className="h-3 w-3 text-teal-600" />
                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-tighter">Bonus: 6% + ₹5 Extra</p>
                        </div>
                    </div>
                </div>
                <div className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/10">
                    <ArrowRight className="h-4 w-4" />
                </div>
            </Card>
        ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
      <header className="flex items-center gap-3 p-4 bg-white sticky top-0 z-[60] border-b shadow-sm">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-lg font-black text-slate-800">Recharge Center</h1>
      </header>

      <main className="p-3 space-y-4">
        <Tabs defaultValue="upi" className="w-full">
            <TabsList className="grid grid-cols-2 bg-slate-200/50 p-1 rounded-2xl h-12 mb-4">
                <TabsTrigger value="upi" className="rounded-xl font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">UPI Portal</TabsTrigger>
                <TabsTrigger value="usdt" className="rounded-xl font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">USDT (TRC20)</TabsTrigger>
            </TabsList>

            <TabsContent value="upi">
                <RenderOptionList type="upi" />
            </TabsContent>

            <TabsContent value="usdt">
                 <RenderOptionList type="usdt" />
            </TabsContent>
        </Tabs>

        {isMatching && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center">
                 <Card className="w-full max-w-xs animate-in zoom-in-95 duration-200 p-10 rounded-[40px] border-none shadow-2xl">
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
