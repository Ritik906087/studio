
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Loader2, Search, CheckCircle2, Shield, Info, AlertCircle } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState<'p2p' | 'usdt'>('p2p');
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

  const handleP2PMatch = async (amount: number) => {
    if (!user || !firestore) {
        toast({ title: "Session Expired", description: "Please login again.", variant: "destructive" });
        return;
    }

    if (inProgressOrder) { 
        toast({ 
            title: "Pending Order", 
            description: "Please complete or cancel your existing order first.",
            variant: "destructive" 
        }); 
        router.push(`/buy/confirm/${inProgressOrder.id}`);
        return; 
    }

    setIsMatching(true);
    try {
        const sellOrdersQuery = query(
            collection(firestore, 'sellOrders'),
            where('status', 'in', ['pending', 'partially_filled']),
            limit(50)
        );

        const sellSnap = await getDocs(sellOrdersQuery);
        const sellerDoc = sellSnap.docs.find(d => d.data().remainingAmount >= amount);

        if (!sellerDoc) {
            toast({ 
              title: "No Available Match", 
              description: "The engine is currently rotating liquidity. Please try a different amount or wait a few moments.", 
              variant: "destructive" 
            });
            setIsMatching(false);
            return;
        }

        const sellerOrderId = sellerDoc.id;
        const displayOrderId = `LGPAYB${Date.now()}`;
        const bonus = 6;
        const totalAmount = amount + (amount * bonus / 100);

        const buyOrderRef = doc(collection(firestore, 'users', user.uid, 'orders'));

        await runTransaction(firestore, async (transaction) => {
            const freshSellerSnap = await transaction.get(sellerDoc.ref);
            const freshSellerData = freshSellerSnap.data();

            if (!freshSellerData || freshSellerData.remainingAmount < amount || !['pending', 'partially_filled'].includes(freshSellerData.status)) {
                throw new Error("Seller status changed. Retrying rotation...");
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
                paymentProvider: 'Auto-Matched',
                status: 'pending_payment',
                sellerId: freshSellerData.userId,
                sellerWithdrawalDetails: freshSellerData.withdrawalMethod,
                matchedSellOrderId: sellerOrderId,
                createdAt: serverTimestamp(),
            });
        });

        toast({ title: "Match Success!", description: "Liquidity secured. Complete payment within 10 minutes." });
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
      <header className="flex items-center gap-3 p-4 bg-white sticky top-0 z-50 border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-lg font-black text-slate-800">Buy Assets</h1>
      </header>

      <main className="p-4 space-y-4">
        <Card className="border-none bg-primary text-white overflow-hidden rounded-2xl relative shadow-lg shadow-blue-500/20">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Shield className="h-20 w-20" /></div>
             <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Instant Liquidity</p>
                <h3 className="text-xl font-black mt-1">P2P Auto-Rotation</h3>
                <p className="text-[10px] mt-2 font-medium bg-white/20 inline-block px-2 py-0.5 rounded-full border border-white/10">Secure Liquidity Pool Active</p>
             </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid grid-cols-2 bg-slate-100 rounded-xl p-1 h-11">
            <TabsTrigger value="p2p" className="rounded-lg font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">P2P Match</TabsTrigger>
            <TabsTrigger value="usdt" className="rounded-lg font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm" disabled>USDT Direct</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-2 gap-3 pb-20">
            {purchaseOptions.map((amt) => (
                <Card 
                    key={amt} 
                    className="p-4 border-none shadow-sm rounded-2xl active:bg-blue-50 transition-all group overflow-hidden relative cursor-pointer" 
                    onClick={() => !isMatching && handleP2PMatch(amt)}
                >
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Amount</p>
                        <p className="text-lg font-black text-slate-800">₹{amt.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-teal-600 mt-1">+6% Bonus FP</p>
                    </div>
                    <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-10 transition-opacity">
                         <Shield className="h-8 w-8 text-primary" />
                    </div>
                </Card>
            ))}
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
             <Info className="h-5 w-5 text-primary shrink-0" />
             <div className="space-y-1">
                 <p className="text-[11px] font-bold text-slate-700">How it works:</p>
                 <p className="text-[10px] text-slate-500 leading-relaxed">Select an amount to trigger the auto-rotation engine. We'll match you with a verified seller instantly. Complete the payment to receive your assets.</p>
             </div>
        </div>

        {isMatching && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center">
                 <Card className="w-full max-w-xs animate-in zoom-in-95 duration-200 p-8 rounded-[32px] border-none shadow-2xl">
                     <div className="relative w-20 h-20 mx-auto mb-6">
                        <Loader2 className="w-20 h-20 text-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="h-8 w-8 text-primary animate-pulse" />
                        </div>
                     </div>
                     <h3 className="font-black text-xl text-slate-800">Finding Match</h3>
                     <p className="text-xs text-slate-400 mt-2 font-medium">Rotating liquidity pool to find your secure P2P partner...</p>
                 </Card>
            </div>
        )}
      </main>
    </div>
  );
}
