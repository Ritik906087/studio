

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ShoppingCart, Banknote, Landmark } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


const purchaseOptions = [
  { id: 1, amount: 500, bonus: 5 },
  { id: 2, amount: 1000, bonus: 5 },
  { id: 3, amount: 3000, bonus: 5 },
  { id: 4, amount: 5000, bonus: 6 },
  { id: 5, amount: 10000, bonus: 6 },
  { id: 6, amount: 20000, bonus: 6 },
];

const smallPurchaseOptions = purchaseOptions.filter(o => o.amount < 5000);
const highPurchaseOptions = purchaseOptions.filter(o => o.amount >= 5000);

const upiMethods = [
    { name: "PhonePe", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae" },
    { name: "Paytm", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8" },
    { name: "MobiKwik", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f" },
];

const PurchaseGrid = ({ onBuyClick, options }: { onBuyClick: (amount: number) => void; options: typeof purchaseOptions }) => {
  return (
    <div className="grid grid-cols-1 gap-3 mt-4">
      {options.map((option) => {
        const totalLGB = option.amount + (option.amount * (option.bonus / 100));
        return (
          <Card key={option.id} className="rounded-xl shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between p-3">
               <div className="flex items-center gap-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShoppingCart className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="font-bold text-lg">₹ {option.amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-green-600 font-semibold">You Get: {totalLGB.toLocaleString('en-IN')} LGB</p>
                   </div>
               </div>
               <Button onClick={() => onBuyClick(option.amount)} className="h-10 px-6 btn-gradient font-bold rounded-lg">
                  Buy
               </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};


export default function BuyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('otp-upi');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleBuyClick = async (amount: number) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Please log in to continue.' });
      return;
    }
    setSelectedAmount(amount);
    
    const orderId = `LGPAY${Date.now()}`;

    if (activeTab === 'bank') {
      try {
        const ordersRef = collection(firestore, 'users', user.uid, 'orders');
        const newOrderRef = await addDoc(ordersRef, {
          userId: user.uid,
          amount,
          orderId,
          status: 'pending_payment',
          createdAt: serverTimestamp(),
          paymentType: 'bank',
        });
        router.push(`/buy/confirm/${newOrderRef.id}?type=bank`);
      } catch (error) {
        console.error('Error creating order: ', error);
        toast({ variant: 'destructive', title: 'Could not create order.' });
      }
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleUpiSelect = async (methodName: string) => {
    if (!user || !firestore || !selectedAmount) return;
    setIsDialogOpen(false);
    
    const orderId = `LGPAY${Date.now()}`;

    try {
      const ordersRef = collection(firestore, 'users', user.uid, 'orders');
      const newOrderRef = await addDoc(ordersRef, {
        userId: user.uid,
        amount: selectedAmount,
        orderId,
        status: 'pending_payment',
        createdAt: serverTimestamp(),
        paymentType: 'upi',
        paymentProvider: methodName,
      });
      router.push(`/buy/confirm/${newOrderRef.id}?type=upi&provider=${methodName}`);
    } catch (error) {
      console.error('Error creating order: ', error);
      toast({ variant: 'destructive', title: 'Could not create order.' });
    }
  };


  return (
    <div className="text-foreground pb-4 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold">Buy</h1>
        </div>
        <div className="w-8"></div>
      </header>

      <main className="p-4 flex-grow">
        <Tabs defaultValue="otp-upi" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 gap-2 h-auto p-0 bg-transparent">
             <TabsTrigger value="otp-upi" className="flex flex-col items-center justify-center p-3 h-auto rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all space-y-1">
                <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    <span className="font-bold text-base text-foreground">OTP-UPI</span>
                </div>
                <span className="text-xs text-green-600 font-semibold">+5% Bonus</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex flex-col items-center justify-center p-3 h-auto rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all space-y-1">
                <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    <span className="font-bold text-base text-foreground">BANK</span>
                </div>
                <span className="text-xs text-green-600 font-semibold">+6% Bonus</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="otp-upi">
            <Tabs defaultValue="small" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="small">Small Amount</TabsTrigger>
                    <TabsTrigger value="high">High Amount</TabsTrigger>
                </TabsList>
                <TabsContent value="small">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={smallPurchaseOptions} />
                </TabsContent>
                <TabsContent value="high">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={highPurchaseOptions} />
                </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="bank">
            <Tabs defaultValue="small" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="small">Small Amount</TabsTrigger>
                    <TabsTrigger value="high">High Amount</TabsTrigger>
                </TabsList>
                <TabsContent value="small">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={smallPurchaseOptions} />
                </TabsContent>
                <TabsContent value="high">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={highPurchaseOptions} />
                </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-lg font-semibold text-center">Choose Payment Method</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            {upiMethods.map((method) => (
                <button 
                    key={method.name}
                    onClick={() => handleUpiSelect(method.name)}
                    className="w-full flex items-center p-3 rounded-lg border hover:bg-secondary transition-colors"
                >
                    <Image src={method.logo} alt={method.name} width={32} height={32} className="mr-4" />
                    <span className="font-medium">{method.name}</span>
                </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
