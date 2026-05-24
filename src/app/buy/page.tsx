'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    ChevronLeft, 
    Loader2, 
    Search, 
    ArrowRight, 
    Wallet, 
    CheckCircle2, 
    ChevronUp, 
    ChevronDown,
    Filter
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, limit } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import Image from 'next/image';

const INITIAL_PURCHASE_OPTIONS = [
  { id: '5219596344501253', amount: 158 },
  { id: '5219596341617670', amount: 170 },
  { id: '5219511413187590', amount: 200 },
  { id: '5219511413253125', amount: 500 },
  { id: '5219511417840646', amount: 1000 },
  { id: '5219511417840647', amount: 2000 },
  { id: '5219511417840648', amount: 3000 },
  { id: '5219511417840649', amount: 5000 },
  { id: '5219511417840650', amount: 10000 },
];

const USDT_RATE = 108; 
const MIN_USDT = 5;

const PROVIDER_LOGOS: Record<string, string> = {
  "MobiKwik": "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png",
  "Freecharge": "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(3).png"
};

export default function BuyPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isMatching, setIsMatching] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<any>(null);
  const [usdtAddress, setUsdtAddress] = useState<string | null>(null);
  const [usdtInput, setUsdtInput] = useState<string>('5');
  
  // Filter States
  const [minFilter, setMinFilter] = useState('100');
  const [maxFilter, setMaxFilter] = useState('100000');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Method Selection State
  const [isMethodSheetOpen, setIsMethodSheetOpen] = useState(false);
  const [pendingPurchaseAmount, setPendingPurchaseAmount] = useState<number | null>(null);
  const [selectedBuyerMethod, setSelectedBuyerMethod] = useState<any>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    
    const q = query(
      collection(firestore, 'users', user.uid, 'orders'), 
      where('status', '==', 'pending_payment'), 
      limit(1)
    );
    
    getDocs(q).then(snap => { 
        if (!snap.empty) {
            setActivePaymentOrder({ id: snap.docs[0].id, ...snap.docs[0].data() }); 
        } else {
            setActivePaymentOrder(null);
        }
    }).catch(() => {});

    const usdtQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'usdt'), limit(1));
    getDocs(usdtQuery).then(snap => {
        if (!snap.empty) {
            const data = snap.docs[0].data();
            setUsdtAddress(data.usdtWalletAddress);
        }
    }).catch(() => {});
  }, [user, firestore]);

  const filteredOptions = useMemo(() => {
    let result = [...INITIAL_PURCHASE_OPTIONS];
    const minVal = parseInt(minFilter) || 0;
    const maxVal = parseInt(maxFilter) || Infinity;

    result = result.filter(opt => opt.amount >= minVal && opt.amount <= maxVal);

    result.sort((a, b) => sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount);

    return result;
  }, [minFilter, maxFilter, sortOrder]);

  const generateRawOrderId = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  };

  const handleBuyClick = (amount: number) => {
    if (activePaymentOrder) { 
        toast({ 
          title: "Complete Previous Order", 
          description: "You have an order pending payment.", 
          variant: "destructive" 
        }); 
        router.push(`/buy/confirm/${activePaymentOrder.id}`);
        return; 
    }
    setPendingPurchaseAmount(amount);
    setIsMethodSheetOpen(true);
  };

  const handleP2PMatch = async (amountInInr: number, type: 'upi' | 'usdt' = 'upi', usdtValue?: number, buyerMethod?: any) => {
    if (!user || !profile || !firestore) {
        toast({ title: "Session Expired", description: "Please login again.", variant: "destructive" });
        return;
    }

    setIsMatching(true);
    setIsMethodSheetOpen(false);
    
    try {
        const rawOrderId = generateRawOrderId();
        const displayOrderId = "#" + rawOrderId;
        
        // 6% + ₹5 logic
        const bonusPercent = 6;
        const flatBonus = 5;
        const totalAmount = amountInInr + (amountInInr * bonusPercent / 100) + flatBonus;
        
        const buyOrderRef = doc(firestore, 'users', user.uid, 'orders', rawOrderId);

        if (type === 'usdt') {
            if (!usdtAddress) throw new Error("USDT System Server is offline.");
            if (!usdtValue || usdtValue < MIN_USDT) throw new Error(`Minimum deposit is ${MIN_USDT} USDT`);
            
            await runTransaction(firestore, async (transaction) => {
                transaction.set(buyOrderRef, {
                    id: rawOrderId,
                    userId: user.uid,
                    userNumericId: profile.numericId,
                    orderId: displayOrderId,
                    amount: totalAmount,
                    baseAmount: amountInInr,
                    usdtAmount: usdtValue,
                    bonusPercentage: bonusPercent,
                    flatBonus: flatBonus,
                    paymentType: 'usdt',
                    paymentProvider: 'CRYPTO_NODE',
                    status: 'pending_payment',
                    sellerId: 'SYSTEM_VAULT',
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

        // --- DYNAMIC ROTATION ENGINE ---
        const sellOrdersQuery = query(
            collection(firestore, 'sellOrders'),
            where('status', 'in', ['pending', 'partially_filled']),
            limit(100)
        );

        const sellSnap = await getDocs(sellOrdersQuery);
        const candidates = sellSnap.docs.filter(d => 
            d.data().userId !== user.uid && 
            d.data().remainingAmount >= amountInInr
        );

        let sellerDoc = null;
        if (candidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            sellerDoc = candidates[randomIndex];
        }

        if (!sellerDoc) {
            const adminPMQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'upi'), limit(1));
            const adminPMSnap = await getDocs(adminPMQuery);
            if (adminPMSnap.empty) throw new Error("Liquidity Pool Busy. Try again in 5 mins.");

            const adminMethod = adminPMSnap.docs[0].data();

            await runTransaction(firestore, async (transaction) => {
                transaction.set(buyOrderRef, {
                    id: rawOrderId,
                    userId: user.uid,
                    userNumericId: profile.numericId,
                    orderId: displayOrderId,
                    amount: totalAmount,
                    baseAmount: amountInInr,
                    bonusPercentage: bonusPercent,
                    flatBonus: flatBonus,
                    paymentType: 'system_transfer',
                    paymentProvider: 'SYSTEM_NODE',
                    status: 'pending_payment',
                    sellerId: 'SYSTEM_VAULT',
                    buyerSelectedUpi: buyerMethod?.upiId || 'N/A',
                    buyerSelectedProvider: buyerMethod?.name || 'N/A',
                    sellerWithdrawalDetails: {
                        type: 'upi',
                        name: adminMethod.upiHolderName || 'System Master Channel',
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
                throw new Error("Channel expired. Retrying...");
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
                userNumericId: profile.numericId,
                orderId: displayOrderId,
                amount: totalAmount,
                baseAmount: amountInInr,
                bonusPercentage: bonusPercent,
                flatBonus: flatBonus,
                paymentType: 'rotation_upi',
                paymentProvider: 'Verified-Node',
                status: 'pending_payment',
                sellerId: freshSellerData.userId,
                buyerSelectedUpi: buyerMethod?.upiId || 'N/A',
                buyerSelectedProvider: buyerMethod?.name || 'N/A',
                sellerWithdrawalDetails: freshSellerData.withdrawalMethod,
                matchedSellOrderId: sellerOrderId,
                createdAt: serverTimestamp(),
            });
        });

        toast({ title: "Node Sync Success!" });
        router.push(`/buy/confirm/${rawOrderId}`);

    } catch (e: any) {
        toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsMatching(false);
    }
  };

  const filteredMethods = (profile?.paymentMethods || []).filter((m: any) => 
    m.name === "MobiKwik" || m.name === "Freecharge"
  );

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-[60] border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home"><ChevronLeft className="h-6 w-6 text-slate-500" /></Link>
        </Button>
        <h1 className="text-lg font-medium text-slate-700">Buy</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 flex flex-col">
        <Tabs defaultValue="upi" className="w-full">
            <div className="bg-white border-b px-4">
                <TabsList className="grid grid-cols-2 bg-transparent h-12 w-full p-0">
                    <TabsTrigger value="upi" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-slate-400">UPI</TabsTrigger>
                    <TabsTrigger value="usdt" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-slate-400">USDT</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="upi" className="m-0">
                {/* Filter Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-1 text-primary"
                        >
                            {sortOrder === 'asc' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[11px] font-bold text-slate-400">Min</span>
                            <input 
                                value={minFilter}
                                onChange={(e) => setMinFilter(e.target.value)}
                                className="w-12 bg-transparent border-none font-bold text-[13px] focus:ring-0 p-0"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 ml-4">
                            <span className="text-[11px] font-bold text-slate-400">Max</span>
                            <input 
                                value={maxFilter}
                                onChange={(e) => setMaxFilter(e.target.value)}
                                className="w-16 bg-transparent border-none font-bold text-[13px] focus:ring-0 p-0"
                            />
                        </div>
                    </div>
                    <Search className="h-5 w-5 text-orange-400" />
                </div>

                {/* Buy List */}
                <div className="divide-y divide-slate-100 pb-24">
                    {filteredOptions.map((opt) => {
                        const reward = (opt.amount * 0.06) + 5;
                        const total = opt.amount + reward;
                        return (
                            <div key={opt.id} className="p-4 flex flex-col gap-3 group active:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] text-slate-300 font-medium">No:{opt.id}</span>
                                    <span className="text-[11px] text-slate-400 font-medium">Reward 6.0%+₹5</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-red-500 font-bold">Price</span>
                                            <span className="text-base font-bold text-red-500">₹ {opt.amount}</span>
                                        </div>
                                        <span className="text-slate-300 mx-1">+</span>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-slate-500 font-bold">Reward</span>
                                            <span className="text-base font-bold text-slate-800">{reward.toFixed(2)}</span>
                                        </div>
                                        <span className="text-slate-300 mx-1">=</span>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-blue-500 font-bold">FP</span>
                                            <span className="text-base font-bold text-blue-500">{total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={() => handleBuyClick(opt.amount)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-md h-8 px-5 text-sm font-bold shadow-sm"
                                    >
                                        Buy
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TabsContent>

            <TabsContent value="usdt" className="p-4 animate-in fade-in duration-300">
                <Card className="border-none bg-white rounded-2xl shadow-lg ring-1 ring-slate-100 overflow-hidden">
                    <CardContent className="p-5 space-y-5">
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">USDT Amount</Label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black">$</div>
                                    <Input 
                                        type="number"
                                        placeholder="Min 5 USDT"
                                        value={usdtInput}
                                        onChange={(e) => setUsdtInput(e.target.value)}
                                        className="h-12 pl-8 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl text-lg font-black focus-visible:ring-primary/20"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase ml-1">Rate: ₹{USDT_RATE}/USDT</p>
                            </div>

                            <div className="p-4 bg-primary text-white rounded-xl flex items-center justify-between shadow-lg shadow-blue-500/10">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase opacity-60">You Receive</p>
                                    <p className="text-xl font-black tabular-nums">₹{(Number(usdtInput) * USDT_RATE).toLocaleString()}</p>
                                </div>
                                <Wallet className="h-6 w-6 text-white/30" />
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleP2PMatch(Number(usdtInput) * USDT_RATE, 'usdt', Number(usdtInput))}
                            className="w-full h-12 btn-gradient rounded-xl font-black text-sm shadow-teal-500/20"
                            disabled={isMatching || Number(usdtInput) < MIN_USDT}
                        >
                            {isMatching ? <Loader size="xs" className="mr-2" /> : "DEPOSIT USDT"}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {isMatching && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center">
                 <Card className="w-full max-w-xs animate-in zoom-in-95 duration-200 p-8 rounded-[32px] border-none shadow-2xl bg-white">
                     <div className="relative w-16 h-16 mx-auto mb-4">
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="h-6 w-6 text-primary animate-pulse" />
                        </div>
                     </div>
                     <h3 className="font-black text-base text-slate-800 uppercase tracking-tight">Syncing Node</h3>
                     <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-widest leading-relaxed">Connecting to verified channel...</p>
                 </Card>
            </div>
        )}

        <Sheet open={isMethodSheetOpen} onOpenChange={setIsMethodSheetOpen}>
            <SheetContent side="bottom" className="rounded-t-[32px] px-5 pb-10 pt-6 border-none shadow-2xl bg-[#F5F7FB] max-h-[70vh] overflow-y-auto no-scrollbar">
                <SheetHeader className="text-center mb-6">
                    <SheetTitle className="text-xl font-black tracking-tight uppercase">Select Payment Mode</SheetTitle>
                    <SheetDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Choose your linked verified wallet
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-3">
                    {filteredMethods.length > 0 ? (
                        filteredMethods.map((m: any, idx: number) => (
                            <div 
                                key={idx} 
                                className={cn(
                                    "p-4 rounded-[22px] bg-white border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all",
                                    selectedBuyerMethod?.upiId === m.upiId ? "ring-2 ring-primary border-transparent" : ""
                                )}
                                onClick={() => setSelectedBuyerMethod(m)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center p-2 border border-slate-50">
                                        {PROVIDER_LOGOS[m.name] && (
                                            <Image src={PROVIDER_LOGOS[m.name]} alt={m.name} width={32} height={32} className="object-contain" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 text-xs uppercase">{m.name}</p>
                                        <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5 tracking-tight">{m.upiId}</p>
                                    </div>
                                </div>
                                {selectedBuyerMethod?.upiId === m.upiId ? (
                                    <CheckCircle2 className="h-6 w-6 text-primary" />
                                ) : (
                                    <div className="h-6 w-6 rounded-full border-2 border-slate-100" />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center space-y-4">
                            <Wallet className="h-10 w-10 mx-auto text-slate-200" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No MobiKwik or Freecharge Linked</p>
                            <Button asChild className="btn-gradient rounded-xl px-6 h-10 text-[9px] font-black uppercase">
                                <Link href="/my/collection/add">Link Verified Account</Link>
                            </Button>
                        </div>
                    )}

                    {filteredMethods.length > 0 && (
                        <Button 
                            className="w-full h-14 btn-gradient rounded-2xl font-black text-sm uppercase shadow-blue-500/20 mt-4" 
                            disabled={!selectedBuyerMethod || !pendingPurchaseAmount}
                            onClick={() => pendingPurchaseAmount && handleP2PMatch(pendingPurchaseAmount, 'upi', undefined, selectedBuyerMethod)}
                        >
                            SYNC SECURE NODE
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
