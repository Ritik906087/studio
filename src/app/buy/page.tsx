

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, AlertCircle, ShoppingCart } from 'lucide-react';
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

const upiMethods = [
    { name: "PhonePe", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae" },
    { name: "Paytm", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8" },
    { name: "MobiKwik", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f" },
];

const PurchaseGrid = ({ onBuyClick }: { onBuyClick: (amount: number) => void }) => {
  return (
    <div className="grid grid-cols-1 gap-3 mt-4">
      {purchaseOptions.map((option) => {
        const bonusLGB = option.amount * (option.bonus / 100);
        return (
          <Card key={option.id} className="rounded-xl shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between p-3">
               <div className="flex items-center gap-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShoppingCart className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="font-bold text-lg">₹ {option.amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-green-600 font-semibold">Bonus +{option.bonus}% = {bonusLGB.toLocaleString('en-IN')} LGB</p>
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
            <p className="text-xs text-muted-foreground">1INR=1LGB 1U=97.00 INR</p>
        </div>
        <div className="w-8"></div>
      </header>

      <main className="p-4 flex-grow">
        <Tabs defaultValue="otp-upi" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto">
            <TabsTrigger value="otp-upi" className="text-base data-[state=active]:font-bold data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground p-3 relative">OTP-UPI <span className="absolute top-1 right-1 text-xs text-red-500 font-bold">+5%</span></TabsTrigger>
            <TabsTrigger value="bank" className="text-base data-[state=active]:font-bold data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground p-3 relative">BANK <span className="absolute top-1 right-1 text-xs text-red-500 font-bold">+6%</span></TabsTrigger>
          </TabsList>
          
          <div className="mt-4 p-2 bg-orange-100 text-orange-700 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Tips: Requires KYC connection to purchase.</span>
          </div>

          <TabsContent value="otp-upi">
            <PurchaseGrid onBuyClick={handleBuyClick} />
          </TabsContent>
          <TabsContent value="bank">
            <PurchaseGrid onBuyClick={handleBuyClick} />
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
