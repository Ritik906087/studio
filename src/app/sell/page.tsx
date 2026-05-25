'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronLeft, Info, Wallet, CircleDollarSign } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SellPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useUser();
  const firestore = useFirestore();

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isSelling, setIsSelling] = useState(false);

  const generateOrderId = () => {
    const num = Math.floor(1000000000 + Math.random() * 9000000000);
    return `#${num}`;
  };

  const handleSell = async () => {
    const val = parseInt(amount);
    if (!val || val < 100 || val % 100 !== 0) { 
        toast({ title: "Invalid Amount", description: "Must be multiple of 100. Minimum ₹100." }); 
        return; 
    }
    if (!selectedMethod) { 
        toast({ title: "Method Required", description: "Please select a withdrawal account." }); 
        return; 
    }
    if (!profile || profile.balance < val) { 
        toast({ title: "Insufficient Balance", variant: "destructive" }); 
        return; 
    }
    if (!user || !firestore) return;

    setIsSelling(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const userRef = doc(firestore, 'users', user.uid);
            const userSnap = await transaction.get(userRef);
            const currentBalance = userSnap.data()?.balance || 0;
            const currentHold = userSnap.data()?.holdBalance || 0;

            if (currentBalance < val) throw new Error("Insufficient balance");

            transaction.update(userRef, { 
                balance: currentBalance - val,
                holdBalance: currentHold + val 
            });

            const sellOrderId = generateOrderId();
            const sellRef = doc(collection(firestore, 'sellOrders'));
            const userSellRef = doc(firestore, 'users', user.uid, 'sellOrders', sellRef.id);

            const sellData = {
                id: sellRef.id,
                userId: user.uid,
                userNumericId: profile.numericId,
                userPhoneNumber: profile.phoneNumber,
                orderId: sellOrderId,
                amount: val,
                remainingAmount: val,
                withdrawalMethod: selectedMethod,
                status: 'pending',
                matchedBuyOrders: [],
                createdAt: serverTimestamp(),
            };

            transaction.set(sellRef, sellData);
            transaction.set(userSellRef, sellData);
        });

        toast({ title: "Order Created Successfully!" });
        router.push('/order');
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
        setIsSelling(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F5F7FB]">
      <header className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-lg font-black text-slate-800">Sell</h1>
      </header>

      <main className="p-4 space-y-4">
        <Card className="border-none bg-emerald-600 text-white rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><CircleDollarSign className="h-16 w-16" /></div>
            <CardContent className="p-5">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Available to Sell</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <h3 className="text-2xl font-black tabular-nums tracking-tighter">₹{profile?.balance?.toFixed(2) || '0.00'}</h3>
                    <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">FP</span>
                </div>
            </CardContent>
        </Card>

        <div className="space-y-4">
            <div className="space-y-2 px-1">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Enter Amount</Label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-primary">₹</div>
                    <Input 
                        type="tel" 
                        placeholder="Multiple of 100" 
                        className="pl-9 h-12 bg-white border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-lg font-bold" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} 
                    />
                </div>
                <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[9px] font-medium text-blue-600">Your sale request will be processed. Multiple transactions may occur for faster completion.</p>
                </div>
            </div>

            <div className="space-y-2 px-1">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Withdraw To</Label>
                {profile?.paymentMethods?.length > 0 ? (
                    <RadioGroup 
                        onValueChange={v => {
                            try {
                                if (v) setSelectedMethod(JSON.parse(v));
                            } catch (e) {
                                console.error("Method parse error:", e);
                            }
                        }} 
                        className="space-y-3"
                    >
                        {profile.paymentMethods.map((m: any, i: number) => (
                            <Label key={i} className={cn(
                                "flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl transition-all active:scale-[0.98]",
                                selectedMethod?.upiId === m.upiId ? "ring-2 ring-primary border-transparent" : ""
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                        <Wallet className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-slate-800">{m.name}</p>
                                        <p className="text-[10px] font-mono text-slate-400">{m.upiId || `****${m.accountNumber?.slice(-4)}`}</p>
                                    </div>
                                </div>
                                <RadioGroupItem value={JSON.stringify(m)} className="h-5 w-5" />
                            </Label>
                        ))}
                    </RadioGroup>
                ) : (
                    <Link href="/my/collection/add" className="block p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:bg-slate-50 transition-colors">
                        <p className="text-xs font-bold text-primary">+ Add Withdrawal Method</p>
                    </Link>
                )}
            </div>
        </div>

        <div className="pt-4">
            <Button 
                className="w-full btn-gradient h-14 rounded-2xl text-base font-black shadow-teal-500/20 uppercase tracking-widest" 
                onClick={handleSell} 
                disabled={isSelling || !amount || !selectedMethod}
            >
                {isSelling ? "PROCESSING..." : "Sell Now"}
            </Button>
            <p className="text-center text-[9px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Secured Payment Network</p>
        </div>
      </main>
    </div>
  );
}
