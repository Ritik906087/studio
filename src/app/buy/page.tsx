'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Search, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function BuyPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isMatching, setIsMatching] = useState(false);
  const [inProgressOrder, setInProgressOrder] = useState<any>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    const q = query(
      collection(firestore, 'users', user.uid, 'orders'), 
      where('status', 'in', ['pending_payment', 'pending_confirmation']), 
      limit(1)
    );
    getDocs(q).then(snap => { 
        if (!snap.empty) setInProgressOrder({ id: snap.docs[0].id, ...snap.docs[0].data() }); 
    });
  }, [user, firestore]);

  const purchaseOptions = [100, 500, 1000, 2000, 5000, 10000];

  const generateOrderId = () => {
    const num = Math.floor(1000000000 + Math.random() * 9000000000);
    return `#${num}`;
  };

  const handleP2PMatch = async (amount: number) => {
    if (!user || !firestore) {
        toast({ title: "Session Expired", description: "Please login again.", variant: "destructive" });
        return;
    }

    if (inProgressOrder) { 
        toast({ title: "Pending Order", description: "Please complete or cancel your existing order first.", variant: "destructive" }); 
        router.push(`/buy/confirm/${inProgressOrder.id}`);
        return; 
    }

    setIsMatching(true);
    try {
        // 1. Search for available P2P Seller
        const sellOrdersQuery = query(
            collection(firestore, 'sellOrders'),
            where('status', 'in', ['pending', 'partially_filled']),
            limit(50)
        );

        const sellSnap = await getDocs(sellOrdersQuery);
        // Find a seller who has enough liquidity
        const sellerDoc = sellSnap.docs.find(d => d.data().remainingAmount >= amount);

        const displayOrderId = generateOrderId();
        const bonus = 6;
        const totalAmount = amount + (amount * bonus / 100);
        const buyOrderRef = doc(collection(firestore, 'users', user.uid, 'orders'));

        if (!sellerDoc) {
            // 2. FALLBACK: NO PEER SELLER FOUND -> USE ADMIN PAYMENT SERVER
            console.log("No seller found. Routing to Admin Master Portal.");
            const adminPMQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'upi'), limit(1));
            const adminPMSnap = await getDocs(adminPMQuery);
            
            if (adminPMSnap.empty) {
                throw new Error("Liquidity Pool is currently busy. Please try again in 5 minutes.");
            }

            const adminMethod = adminPMSnap.docs[0].data();

            await runTransaction(firestore, async (transaction) => {
                transaction.set(buyOrderRef, {
                    userId: user.uid,
                    orderId: displayOrderId,
                    amount: totalAmount,
                    baseAmount: amount,
                    bonusPercentage: bonus,
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

            toast({ title: "Portal Link Ready", description: "Matched with Admin Liquidity Pool." });
            router.push(`/buy/confirm/${buyOrderRef.id}`);
            return;
        }

        // 3. NORMAL P2P MATCHING
        const sellerOrderId = sellerDoc.id;
        await runTransaction(firestore, async (transaction) => {
            const freshSellerSnap = await transaction.get(sellerDoc.ref);
            const freshSellerData = freshSellerSnap.data();

            if (!freshSellerData || freshSellerData.remainingAmount < amount || !['pending', 'partially_filled'].includes(freshSellerData.status)) {
                throw new Error("Rotation timeout. Retrying link...");
            }

            const newRemaining = freshSellerData.remainingAmount - amount;
            const newStatus = newRemaining <= 0 ? 'processing' : 'partially_filled';

            transaction.update(sellerDoc.ref, {
                remainingAmount: newRemaining,
                status: newStatus,
                matchedBuyOrders: [
                    ...(freshSellerData.matchedBuyOrders || []),
                    {
                        buyOrderId: buyOrderRef.id,
                        buyerId: user.uid,
                        amount: amount,
                        status: 'pending_payment',
                        created_at: new Date().toISOString()
                    }
                ]
            });

            const sellerUserRef = doc(firestore, 'users', freshSellerData.userId, 'sellOrders', sellerOrderId);
            transaction.update(sellerUserRef, {
                remainingAmount: newRemaining,
                status: newStatus,
                matchedBuyOrders: [
                    ...(freshSellerData.matchedBuyOrders || []),
                    {
                        buyOrderId: buyOrderRef.id,
                        buyerId: user.uid,
                        amount: amount,
                        status: 'pending_payment',
                        created_at: new Date().toISOString()
                    }
                ]
            });

            transaction.set(buyOrderRef, {
                userId: user.uid,
                orderId: displayOrderId,
                amount: totalAmount,
                baseAmount: amount,
                bonusPercentage: bonus,
                paymentType: 'p2p_upi',
                paymentProvider: 'P2P-Matched',
                status: 'pending_payment',
                sellerId: freshSellerData.userId,
                sellerWithdrawalDetails: freshSellerData.withdrawalMethod,
                matchedSellOrderId: sellerOrderId,
                createdAt: serverTimestamp(),
            });
        });

        toast({ title: "Match Success!", description: "Liquidity secured via P2P Partner." });
        router.push(`/buy/confirm/${buyOrderRef.id}`);

    } catch (e: any) {
        console.error("Matching Error:", e);
        toast({ title: "Matching Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsMatching(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F5F7FB]">
      <header className="flex items-center gap-3 p-4 bg-white sticky top-0 z-50 border-b shadow-sm">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-lg font-black text-slate-800">Recharge Assets</h1>
      </header>

      <main className="p-4 space-y-4">
        <Card className="border-none bg-primary text-white overflow-hidden rounded-3xl relative shadow-lg shadow-blue-500/20">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Shield className="h-20 w-20" /></div>
             <CardContent className="p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Rotation Engine</p>
                <h3 className="text-xl font-black mt-1">P2P Secure Pool</h3>
                <div className="flex gap-2 mt-3">
                    <span className="text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-full border border-white/10 uppercase">Anti-Fraud v4</span>
                    <span className="text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-full border border-white/10 uppercase">Verified P2P</span>
                </div>
             </CardContent>
        </Card>

        <div className="flex flex-col gap-3 pb-20">
            {purchaseOptions.map((amt) => (
                <Card 
                    key={amt} 
                    className="p-5 border-none shadow-sm rounded-3xl active:bg-blue-50 transition-all group overflow-hidden relative cursor-pointer flex items-center justify-between bg-white ring-1 ring-slate-100" 
                    onClick={() => !isMatching && handleP2PMatch(amt)}
                >
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Buy Volume</p>
                            <p className="text-xl font-black text-slate-800 leading-none">₹{amt.toLocaleString()}</p>
                            <p className="text-[10px] font-black text-teal-600 mt-1.5 uppercase tracking-tighter">Bonus: +6% FP Assets</p>
                        </div>
                    </div>
                    <div className="bg-primary text-white p-2.5 rounded-xl group-active:scale-90 transition-transform shadow-lg shadow-primary/20">
                        <ArrowRight className="h-5 w-5" />
                    </div>
                </Card>
            ))}
        </div>

        {isMatching && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center">
                 <Card className="w-full max-w-xs animate-in zoom-in-95 duration-200 p-10 rounded-[40px] border-none shadow-2xl">
                     <div className="relative w-24 h-24 mx-auto mb-8">
                        <Loader2 className="w-24 h-24 text-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="h-10 w-10 text-primary animate-pulse" />
                        </div>
                     </div>
                     <h3 className="font-black text-xl text-slate-800">Matching Pool</h3>
                     <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed px-4">Rotating liquidity... Checking P2P Sellers and Admin Server fallback.</p>
                 </Card>
            </div>
        )}
      </main>
    </div>
  );
}
