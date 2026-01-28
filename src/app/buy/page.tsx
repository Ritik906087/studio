
"use client";

import React, { useState, useMemo } from 'react';
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
import { ChevronLeft, ShoppingCart } from 'lucide-react';
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

const smallPurchaseOptions = [...purchaseOptions].sort((a, b) => a.amount - b.amount);
const highPurchaseOptions = [...purchaseOptions].sort((a, b) => b.amount - a.amount);


const upiMethods = [
    { name: "PhonePe", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae" },
    { name: "Paytm", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8" },
    { name: "MobiKwik", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f" },
];

const PurchaseGrid = ({ onBuyClick, options }: { onBuyClick: (option: (typeof purchaseOptions)[0]) => void; options: typeof purchaseOptions }) => {
  
  if (options.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm overflow-hidden bg-white mt-4">
          <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-32">
              <p className="font-semibold">All orders for this amount have been taken.</p>
              <p className="text-xs mt-1">Please check other amounts or try again later.</p>
          </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 mt-4">
        {options.map((option) => {
          const totalLGB = option.amount + (option.amount * (option.bonus / 100));
          return (
            <Card key={option.id} className="rounded-xl shadow-sm overflow-hidden bg-white animate-fade-in">
              <div className="flex items-center justify-between p-3">
                 <div className="flex items-center gap-4">
                     <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShoppingCart className="h-6 w-6" />
                     </div>
                     <div>
                        <p className="font-bold text-lg">₹ {option.amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-green-600 font-semibold">You Get: {option.amount}+{option.bonus}%={totalLGB.toLocaleString('en-IN')}</p>
                     </div>
                 </div>
                 <Button onClick={() => onBuyClick(option)} className="h-10 px-6 btn-gradient font-bold rounded-lg">
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
  const [activeSubTab, setActiveSubTab] = useState('small');
  
  // State for optimistic UI updates
  const [visibleSmallUpiOptions, setVisibleSmallUpiOptions] = useState(smallPurchaseOptions);
  const [visibleHighUpiOptions, setVisibleHighUpiOptions] = useState(highPurchaseOptions);
  const [visibleSmallBankOptions, setVisibleSmallBankOptions] = useState(smallPurchaseOptions);
  const [visibleHighBankOptions, setVisibleHighBankOptions] = useState(highPurchaseOptions);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleBuyClick = (option: (typeof purchaseOptions)[0]) => {
     if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Please log in to continue.' });
      return;
    }

    // Optimistically hide the card
    if (activeTab === 'otp-upi') {
      if (activeSubTab === 'small') {
        setVisibleSmallUpiOptions(prev => prev.filter(o => o.id !== option.id));
      } else {
        setVisibleHighUpiOptions(prev => prev.filter(o => o.id !== option.id));
      }
    } else { // bank tab
       if (activeSubTab === 'small') {
        setVisibleSmallBankOptions(prev => prev.filter(o => o.id !== option.id));
      } else {
        setVisibleHighBankOptions(prev => prev.filter(o => o.id !== option.id));
      }
    }
    
    // Set amount and open dialog
    setSelectedAmount(option.amount);
    setIsDialogOpen(true);
  };

  const handleUpiSelect = async (methodName: string) => {
    if (!user || !firestore || !selectedAmount) return;
    setIsDialogOpen(false);
    
    const orderId = `LGPAY${Date.now()}`;
    const paymentType = activeTab === 'bank' ? 'bank' : 'upi';

    try {
      const ordersRef = collection(firestore, 'users', user.uid, 'orders');
      const newOrderRef = await addDoc(ordersRef, {
        userId: user.uid,
        amount: selectedAmount,
        orderId,
        status: 'pending_payment',
        createdAt: serverTimestamp(),
        paymentType: paymentType,
        paymentProvider: methodName,
      });
      router.push(`/buy/confirm/${newOrderRef.id}?type=${paymentType}&provider=${methodName}`);
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
                <span className="font-bold text-base text-foreground">OTP-UPI</span>
                <span className="text-xs text-green-600 font-semibold">+5% Bonus</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex flex-col items-center justify-center p-3 h-auto rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all space-y-1">
                <span className="font-bold text-base text-foreground">BANK</span>
                <span className="text-xs text-green-600 font-semibold">+6% Bonus</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="otp-upi">
            <Tabs defaultValue="small" className="w-full mt-4" onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="small">Small Amount</TabsTrigger>
                    <TabsTrigger value="high">High Amount</TabsTrigger>
                </TabsList>
                <TabsContent value="small">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={visibleSmallUpiOptions} />
                </TabsContent>
                <TabsContent value="high">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={visibleHighUpiOptions} />
                </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="bank">
            <Tabs defaultValue="small" className="w-full mt-4" onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="small">Small Amount</TabsTrigger>
                    <TabsTrigger value="high">High Amount</TabsTrigger>
                </TabsList>
                <TabsContent value="small">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={visibleSmallBankOptions} />
                </TabsContent>
                <TabsContent value="high">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={visibleHighBankOptions} />
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
