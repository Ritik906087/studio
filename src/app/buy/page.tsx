'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const paymentMethodDetails: { [key: string]: { logo: string; bgColor: string } } = {
  PhonePe: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Phonepay.png?alt=media&token=579a228d-121f-4d5b-933d-692d791dec2f", bgColor: "bg-violet-600" },
  Paytm: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8", bgColor: "bg-sky-500" },
  MobiKwik: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7", bgColor: "bg-blue-600" },
  Freecharge: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4", bgColor: "bg-orange-500" },
};

const PurchaseGrid = ({ onBuyClick, options, bonusPercentage, isCreatingOrder }: any) => (
    <div className="grid grid-cols-1 gap-3 mt-4">
      {options.map((option: any) => {
          const totalFLEX = option.amount + (option.amount * (bonusPercentage / 100));
          return (
            <Card key={option.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex items-center justify-center bg-primary/10 rounded-lg text-primary font-black italic">FP</div>
                    <div>
                        <p className="font-bold text-lg">₹ {option.amount.toLocaleString()}</p>
                        <p className="text-xs text-green-600 font-semibold">Get: {totalFLEX.toFixed(0)} FP</p>
                    </div>
                </div>
                <Button onClick={() => onBuyClick(option)} className="h-10 px-6 btn-gradient font-bold" disabled={isCreatingOrder}>
                    {isCreatingOrder ? <Loader2 className="animate-spin" /> : 'Buy'}
                </Button>
            </Card>
          );
      })}
    </div>
);

export default function BuyPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'upi' | 'bank' | 'usdt'>('upi');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [inProgressOrder, setInProgressOrder] = useState<any>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    const q = query(collection(firestore, 'users', user.uid, 'orders'), where('status', 'in', ['pending_payment', 'pending_confirmation']), limit(1));
    getDocs(q).then(snap => { if (!snap.empty) setInProgressOrder({ id: snap.docs[0].id, ...snap.docs[0].data() }); });
  }, [user, firestore]);

  const purchaseOptions = useMemo(() => [100, 500, 1000, 2000, 5000].map((a, i) => ({ id: i, amount: a })), []);

  const handleBuyClick = (option: any) => {
    if (inProgressOrder) { toast({ title: "Order already in progress", variant: "destructive" }); return; }
    setSelectedAmount(option.amount);
    if (activeTab === 'upi') setIsDialogOpen(true);
    else createOrder('Direct', option.amount);
  };

  const createOrder = async (provider: string, amount: number) => {
    if (!user || !firestore) return;
    setIsCreatingOrder(true);
    try {
        const bonus = activeTab === 'bank' ? 5 : 6;
        const total = amount + (amount * bonus / 100);
        const orderId = `FLEX${Date.now()}`;
        const ref = await addDoc(collection(firestore, 'users', user.uid, 'orders'), {
            userId: user.uid,
            orderId,
            amount: total,
            baseAmount: amount,
            bonusPercentage: bonus,
            paymentType: activeTab,
            paymentProvider: provider,
            status: 'pending_payment',
            createdAt: serverTimestamp(),
        });
        router.push(`/buy/confirm/${ref.id}?type=${activeTab}&provider=${provider}`);
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsCreatingOrder(false); }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/home">
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Buy FLEX</h1>
      </header>
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="upi">UPI</TabsTrigger>
          <TabsTrigger value="bank">Bank</TabsTrigger>
          <TabsTrigger value="usdt">USDT</TabsTrigger>
        </TabsList>
      </Tabs>
      <PurchaseGrid 
        options={purchaseOptions} 
        bonusPercentage={activeTab === 'bank' ? 5 : 6} 
        onBuyClick={handleBuyClick} 
        isCreatingOrder={isCreatingOrder} 
      />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Select App</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
                {Object.entries(paymentMethodDetails).map(([name, details]) => (
                    <Button key={name} onClick={() => createOrder(name, selectedAmount!)} className={cn("h-20 flex flex-col gap-2", details.bgColor)}>
                        <Image src={details.logo} width={30} height={30} alt={name} />
                        <span>{name}</span>
                    </Button>
                ))}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
