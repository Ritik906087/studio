
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    ChevronLeft, 
    Loader2, 
    Search, 
    Wallet, 
    CheckCircle2, 
    ChevronUp, 
    ChevronDown,
    ArrowRight
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
  
  const [dynamicOrders, setDynamicOrders] = useState<any[]>([]);
  
  const [minFilter, setMinFilter] = useState('100');
  const [maxFilter, setMaxFilter] = useState('15000');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isMethodSheetOpen, setIsMethodSheetOpen] = useState(false);
  const [pendingPurchaseAmount, setPendingPurchaseAmount] = useState<number | null>(null);
  const [selectedBuyerMethod, setSelectedBuyerMethod] = useState<any>(null);

  const generateNodeId = () => {
    let result = '';
    for (let i = 0; i < 15; i++) {
        result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  };

  const generateRandomBatch = useCallback(() => {
    const count = Math.floor(Math.random() * 101) + 200;
    const newOrders = [];
    for (let i = 0; i < count; i++) {
        let amount = 0;
        const rand = Math.random();
        
        if (rand < 0.6) {
            amount = Math.floor(Math.random() * 1401) + 100;
        } else if (rand < 0.9) {
            amount = Math.floor(Math.random() * 6500) + 1501;
        } else {
            amount = Math.floor(Math.random() * 7000) + 8001;
        }

        if (Math.random() > 0.3) {
            amount = Math.round(amount / 10) * 10;
        }

        if (amount >= 100 && amount <= 15000) {
            newOrders.push({
                id: Math.random().toString(36).substr(2, 9),
                nodeId: generateNodeId(),
                amount: amount
            });
        }
    }
    setDynamicOrders(newOrders);
  }, []);

  useEffect(() => {
    generateRandomBatch();
    let timer: NodeJS.Timeout;
    const startCycle = () => {
        const delay = (Math.floor(Math.random() * 10) + 40) * 1000;
        timer = setTimeout(() => {
            generateRandomBatch();
            startCycle();
        }, delay);
    };
    startCycle();
    return () => clearTimeout(timer);
  }, [generateRandomBatch]);

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

    // Fetch USDT address from admin settings
    const usdtQuery = query(collection(firestore, 'paymentMethods'), where('type', '==', 'usdt'), limit(1));
    getDocs(usdtQuery).then(snap => {
        if (!snap.empty) {
            const data = snap.docs[0].data();
            setUsdtAddress(data.usdtWalletAddress);
        }
    }).catch(() => {});
  }, [user, firestore]);

  const filteredOptions = useMemo(() => {
    let result = [...dynamicOrders];
    const minVal = parseInt(minFilter) || 0;
    const maxVal = parseInt(maxFilter) || Infinity;
    result = result.filter(opt => opt.amount >= minVal && opt.amount <= maxVal);
    result.sort((a, b) => sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount);
    return result;
  }, [dynamicOrders, minFilter, maxFilter, sortOrder]);

  const generateRawOrderId = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  };

  const handleBuyClick = (amount: number) => {
    if (activePaymentOrder) { 
        toast({ 
          title: "Pending Session", 
          description: "Please complete your active order first.", 
          variant: "destructive" 
        }); 
        router.push(`/buy/confirm/${activePaymentOrder.id}`);
        return; 
    }
    setPendingPurchaseAmount(amount);
    setIsMethodSheetOpen(true);
  };

  const handleCreateOrder = async (amountInInr: number, type: 'upi' | 'usdt' = 'upi', usdtValue?: number, buyerMethod?: any) => {
    if (!user || !profile || !firestore) {
        toast({ title: "Session Error", description: "Try again.", variant: "destructive" });
        return;
    }

    setIsMatching(true);
    setIsMethodSheetOpen(false);
    
    try {
        const rawOrderId = generateRawOrderId();
        const displayOrderId = "#" + rawOrderId;
        const bonusPercent = 6;
        const flatBonus = 5;
        const totalAmount = amountInInr + (amountInInr * bonusPercent / 100) + flatBonus;
        const buyOrderRef = doc(firestore, 'users', user.uid, 'orders', rawOrderId);

        if (type === 'usdt') {
            if (!usdtAddress) throw new Error("USDT Gateway currently offline.");
            if (!usdtValue || usdtValue < MIN_USDT) throw new Error(`Minimum ${MIN_USDT} USDT required`);
            
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
                    paymentProvider: 'BINANCE/CRYPTO',
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
            toast({ title: "USDT Order Created" });
            router.push(`/buy/confirm/${rawOrderId}`);
            return;
        }

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
            if (adminPMSnap.empty) throw new Error("Service busy. Try USDT or check back later.");

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
                    paymentProvider: 'SYSTEM',
                    status: 'pending_payment',
                    sellerId: 'SYSTEM_VAULT',
                    buyerSelectedUpi: buyerMethod?.upiId || 'N/A',
                    buyerSelectedProvider: buyerMethod?.name || 'N/A',
                    sellerWithdrawalDetails: {
                        type: 'upi',
                        name: adminMethod.upiHolderName || 'Flex System',
                        upiId: adminMethod.upiId
                    },
                    createdAt: serverTimestamp(),
                });
            });
            toast({ title: "Order Created Successfully!" });
            router.push(`/buy/confirm/${rawOrderId}`);
            return;
        }

        const sellerOrderId = sellerDoc.id;
        await runTransaction(firestore, async (transaction) => {
            const freshSellerSnap = await transaction.get(sellerDoc.ref);
            const freshSellerData = freshSellerSnap.data();

            if (!freshSellerData || freshSellerData.remainingAmount < amountInInr || !['pending', 'partially_filled'].includes(freshSellerData.status)) {
                throw new Error("Pool updated. Please refresh.");
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
                paymentType: 'upi_transfer',
                paymentProvider: 'Verified',
                status: 'pending_payment',
                sellerId: freshSellerData.userId,
                buyerSelectedUpi: buyerMethod?.upiId || 'N/A',
                buyerSelectedProvider: buyerMethod?.name || 'N/A',
                sellerWithdrawalDetails: freshSellerData.withdrawalMethod,
                matchedSellOrderId: sellerOrderId,
                createdAt: serverTimestamp(),
            });
        });

        toast({ title: "Order Created Successfully!" });
        router.push(`/buy/confirm/${rawOrderId}`);

    } catch (e: any) {
        toast({ title: "Creation Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsMatching(false);
    }
  };

  const filteredMethods = (profile?.paymentMethods || []).filter((m: any) => 
    m.name === "MobiKwik" || m.name === "Freecharge"
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FB]">
      <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-[60] border-b shadow-sm">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-slate-50">
          <Link href="/home"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
        </Button>
        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Market Place</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 flex flex-col">
        <Tabs defaultValue="upi" className="w-full">
            <div className="bg-white px-4">
                <TabsList className="grid grid-cols-2 bg-slate-100/50 rounded-xl h-11 p-1 mt-2 mb-2">
                    <TabsTrigger value="upi" className="rounded-lg font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">UPI Payment</TabsTrigger>
                    <TabsTrigger value="usdt" className="rounded-lg font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:text-amber-500 data-[state=active]:shadow-sm">USDT Node</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="upi" className="m-0">
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-t mt-1">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-1.5 bg-blue-50 rounded-lg text-primary border border-blue-100">
                            {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <div className="flex items-center gap-1.5 ml-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Min:</span>
                            <input value={minFilter} onChange={(e) => setMinFilter(e.target.value)} className="w-12 bg-transparent border-none font-black text-xs focus:ring-0 p-0 text-slate-800" />
                        </div>
                        <div className="flex items-center gap-1.5 ml-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Max:</span>
                            <input value={maxFilter} onChange={(e) => setMaxFilter(e.target.value)} className="w-16 bg-transparent border-none font-black text-xs focus:ring-0 p-0 text-slate-800" />
                        </div>
                    </div>
                    <Search className="h-4 w-4 text-slate-300" />
                </div>

                <div className="divide-y divide-slate-50 pb-24">
                    {filteredOptions.map((opt) => {
                        const reward = (opt.amount * 0.06) + 5;
                        const total = opt.amount + reward;
                        return (
                            <div key={opt.id} className="p-4 flex flex-col gap-3 bg-white active:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Hash: {opt.id}</span>
                                    </div>
                                    <span className="text-[10px] text-blue-500 font-black uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Bonus 6%+₹5</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Amount</span>
                                            <span className="text-base font-black text-slate-900">₹{opt.amount.toLocaleString()}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-100" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-teal-500 font-black uppercase tracking-tighter">Receive</span>
                                            <span className="text-base font-black text-teal-600 tabular-nums">₹{total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={() => handleBuyClick(opt.amount)}
                                        className="btn-gradient rounded-xl h-10 px-6 text-[11px] font-black uppercase tracking-widest shadow-blue-500/20"
                                    >
                                        Buy
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TabsContent>

            <TabsContent value="usdt" className="p-4">
                <Card className="border-none bg-white rounded-[28px] shadow-lg ring-1 ring-slate-100 overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deposit USDT</Label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black text-lg">$</div>
                                    <Input type="number" placeholder="Min 5 USDT" value={usdtInput} onChange={(e) => setUsdtInput(e.target.value)} className="h-14 pl-10 bg-slate-50 border-none ring-1 ring-slate-100 rounded-[18px] text-xl font-black" />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase ml-1 tracking-tight">Protocol Rate: ₹{USDT_RATE}/USDT</p>
                            </div>
                            <div className="p-5 balance-gradient text-white rounded-[22px] flex items-center justify-between shadow-lg shadow-blue-500/20">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Credits Received</p>
                                    <p className="text-2xl font-black tabular-nums tracking-tighter">₹{(Number(usdtInput) * USDT_RATE).toLocaleString()}</p>
                                </div>
                                <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                                    <Zap className="h-5 w-5 text-yellow-300" />
                                </div>
                            </div>
                        </div>
                        <Button onClick={() => handleCreateOrder(Number(usdtInput) * USDT_RATE, 'usdt', Number(usdtInput))} className="w-full h-14 btn-gradient rounded-[18px] font-black text-sm uppercase shadow-blue-500/30" disabled={isMatching || Number(usdtInput) < MIN_USDT}>
                            {isMatching ? <Loader size="xs" /> : "PROCEED USDT DEPOSIT"}
                        </Button>
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                             <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                             <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed">ONLY TRC20 NETWORK SUPPORTED. WRONG NETWORK TRANSFERS CANNOT BE RECOVERED.</p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {isMatching && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center">
                 <Card className="w-full max-w-xs p-10 rounded-[32px] border-none shadow-2xl bg-white animate-in zoom-in-95">
                     <div className="relative w-20 h-20 mx-auto mb-6">
                        <Loader2 className="w-20 h-20 text-primary animate-spin" />
                     </div>
                     <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Creating Order</h3>
                     <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest leading-relaxed">Syncing with secure payment node...</p>
                 </Card>
            </div>
        )}

        <Sheet open={isMethodSheetOpen} onOpenChange={setIsMethodSheetOpen}>
            <SheetContent side="bottom" className="rounded-t-[32px] px-6 pb-12 pt-8 border-none shadow-2xl bg-[#F8FAFC] max-h-[80vh] overflow-y-auto no-scrollbar">
                <SheetHeader className="text-center mb-8">
                    <SheetTitle className="text-xl font-black tracking-tight uppercase text-slate-800">Verify Account</SheetTitle>
                    <SheetDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Select your linked wallet for settlement
                    </SheetDescription>
                </SheetHeader>
                <div className="space-y-3">
                    {filteredMethods.length > 0 ? (
                        filteredMethods.map((m: any, idx: number) => (
                            <div key={idx} className={cn("p-5 rounded-[22px] bg-white border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all", selectedBuyerMethod?.upiId === m.upiId ? "ring-2 ring-primary border-transparent" : "")} onClick={() => setSelectedBuyerMethod(m)}>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center p-2 shadow-inner">
                                        {PROVIDER_LOGOS[m.name] && <Image src={PROVIDER_LOGOS[m.name]} alt={m.name} width={36} height={36} className="object-contain" />}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{m.name}</p>
                                        <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{m.upiId}</p>
                                    </div>
                                </div>
                                {selectedBuyerMethod?.upiId === m.upiId ? (
                                    <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center shadow-md"><CheckCircle2 className="h-4 w-4 text-white" /></div>
                                ) : (
                                    <div className="h-6 w-6 rounded-full border-2 border-slate-100" />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center space-y-5">
                            <div className="h-16 w-16 bg-slate-100 rounded-[22px] flex items-center justify-center mx-auto opacity-40">
                                <Wallet className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">No Verified Accounts Linked</p>
                            <Button asChild className="btn-gradient rounded-xl px-8 h-12 text-[10px] font-black uppercase tracking-widest shadow-blue-500/20">
                                <Link href="/my/collection/add">Link Verified Account</Link>
                            </Button>
                        </div>
                    )}
                    {filteredMethods.length > 0 && (
                        <Button className="w-full h-14 btn-gradient rounded-[20px] font-black text-sm uppercase mt-6 shadow-blue-500/30" disabled={!selectedBuyerMethod || !pendingPurchaseAmount} onClick={() => pendingPurchaseAmount && handleCreateOrder(pendingPurchaseAmount, 'upi', undefined, selectedBuyerMethod)}>
                            INITIALIZE SETTLEMENT
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
