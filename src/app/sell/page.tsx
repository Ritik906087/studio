'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronLeft, Info, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';

export default function SellPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useUser();
  const firestore = useFirestore();

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isSelling, setIsSelling] = useState(false);

  const handleSell = async () => {
    const val = parseInt(amount);
    if (!val || val < 100 || val % 100 !== 0) { toast({ title: "Invalid Amount", description: "Must be multiple of 100" }); return; }
    if (!selectedMethod) { toast({ title: "No method", description: "Select payment method" }); return; }
    if (!profile || profile.balance < val) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    if (!user || !firestore) return;

    setIsSelling(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const userRef = doc(firestore, 'users', user.uid);
            const userSnap = await transaction.get(userRef);
            const currentBalance = userSnap.data()?.balance || 0;
            if (currentBalance < val) throw new Error("Insufficient balance");

            transaction.update(userRef, { balance: currentBalance - val });
            const sellRef = doc(collection(firestore, 'users', user.uid, 'sellOrders'));
            transaction.set(sellRef, {
                userId: user.uid,
                orderId: `FLEXS${Date.now()}`,
                amount: val,
                remainingAmount: val,
                withdrawalMethod: selectedMethod,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
        });
        toast({ title: "Order Placed" });
        router.push('/order');
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsSelling(false); }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-4"><Button asChild variant="ghost" size="icon"><Link href="/home"><ChevronLeft /></Link></Button><h1 className="text-xl font-bold">Sell FLEX</h1></header>
      <Card><CardHeader><CardTitle className="text-sm">Withdrawal Rules</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Min ₹100. Multiple of 100.</CardContent></Card>
      <Card><CardHeader><CardTitle>Amount</CardTitle></CardHeader><CardContent><Input type="number" placeholder="Multiple of 100" value={amount} onChange={e => setAmount(e.target.value)} /><p className="text-xs mt-2">Balance: {profile?.balance || 0} FP</p></CardContent></Card>
      <Card>
        <CardHeader><CardTitle>Method</CardTitle></CardHeader>
        <CardContent>
            {profile?.paymentMethods?.length > 0 ? (
                <RadioGroup onValueChange={v => setSelectedMethod(JSON.parse(v))}>
                    {profile.paymentMethods.map((m: any, i: number) => (
                        <Label key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                            <RadioGroupItem value={JSON.stringify(m)} />
                            <span>{m.name} ({m.upiId})</span>
                        </Label>
                    ))}
                </RadioGroup>
            ) : <Link href="/my/collection/add" className="text-primary text-sm">Add UPI first</Link>}
        </CardContent>
      </Card>
      <Button className="w-full btn-gradient h-12" onClick={handleSell} disabled={isSelling}>{isSelling ? <Loader size="xs" /> : "Sell Now"}</Button>
    </div>
  );
}
