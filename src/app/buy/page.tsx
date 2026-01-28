
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ChevronLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const smallPurchaseOptions = [
  { id: 1, amount: 500 },
  { id: 2, amount: 1000 },
  { id: 3, amount: 3000 },
  { id: 4, amount: 5000 },
];

const highPurchaseOptions = [
  { id: 5, amount: 10000 },
  { id: 6, amount: 20000 },
  { id: 7, amount: 50000 },
  { id: 8, amount: 100000 },
];

const upiMethods = [
    { name: "PhonePe", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae" },
    { name: "Paytm", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8" },
    { name: "MobiKwik", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f" },
];

const PurchaseGrid = ({ onBuyClick, options: initialOptions, activeTab }: { onBuyClick: (option: any) => void; options: any[]; activeTab: string }) => {
    
  const bonusPercentage = activeTab === 'bank' ? 6 : 5;
  const [options, setOptions] = useState(() => initialOptions.map(o => ({...o, bonus: bonusPercentage, key: o.id})));

  // Interval for updating the list (add/remove)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = setInterval(() => {
      setOptions(prevOptions => {
        if (prevOptions.length === 0) return prevOptions;

        let newOptions = [...prevOptions];
        
        // 50% chance to do something
        if (Math.random() < 0.5) {
            // Remove a random item (if more than 3)
            if (newOptions.length > 3) {
                 const indexToRemove = Math.floor(Math.random() * newOptions.length);
                 newOptions.splice(indexToRemove, 1);
            }

            // Add a new random item from initialOptions
            const baseOption = initialOptions[Math.floor(Math.random() * initialOptions.length)];
            const newId = Date.now();
            newOptions.unshift({
                ...baseOption,
                id: newId,
                key: newId,
                bonus: bonusPercentage,
            });
        }
        
        return newOptions.slice(0, 8); // Keep list size reasonable
      });
    }, 3500); // every 3.5 seconds
    return () => clearInterval(id);
  }, [initialOptions, bonusPercentage]);

  if (options.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm overflow-hidden bg-white mt-4">
          <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-32">
              <p className="font-semibold">Searching for available orders...</p>
              <p className="text-xs mt-1">Please check other amounts or try again later.</p>
          </CardContent>
      </Card>
    );
  }

  return (
    <motion.div layout className="grid grid-cols-1 gap-3 mt-4">
      <AnimatePresence>
        {options.map((option) => {
          const totalLGB = option.amount + (option.amount * (option.bonus / 100));

          return (
            <motion.div
              key={option.key}
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative"
            >
              <Card className="rounded-xl shadow-sm overflow-hidden bg-white w-full">
                 <div className="flex items-center justify-between p-3 relative z-10">
                     <div className="flex items-center gap-4">
                         <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ShoppingCart className="h-6 w-6" />
                         </div>
                         <div>
                            <p className="font-bold text-lg">₹ {option.amount.toLocaleString('en-IN')}</p>
                            <motion.p
                                key={totalLGB} // Animate when bonus changes
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="text-xs text-green-600 font-semibold"
                            >
                                You Get: {option.amount}+{option.bonus}%={totalLGB.toFixed(0)}
                            </motion.p>
                         </div>
                     </div>
                     <Button onClick={() => onBuyClick(option)} className="h-10 px-6 btn-gradient font-bold rounded-lg">
                        Buy
                     </Button>
                  </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
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

  const [isInProgressDialogOpen, setIsInProgressDialogOpen] = useState(false);
  const [inProgressOrder, setInProgressOrder] = useState<any>(null);

  const inProgressBuyOrdersQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'users', user.uid, 'orders'),
        where('status', 'in', ['pending_payment', 'processing'])
    );
  }, [user, firestore]);

  const { data: inProgressBuyOrders } = useCollection(inProgressBuyOrdersQuery);

  const handleBuyClick = (option: { amount: number }) => {
     if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Please log in to continue.' });
      return;
    }

    if (inProgressBuyOrders && inProgressBuyOrders.length > 0) {
        setInProgressOrder(inProgressBuyOrders[0]);
        setIsInProgressDialogOpen(true);
        return;
    }

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
  
  const handleGoToOrder = () => {
    if (!inProgressOrder) return;
    let path = '';
    if (inProgressOrder.status === 'pending_payment') {
        path = `/buy/confirm/${inProgressOrder.id}?type=${inProgressOrder.paymentType}&provider=${inProgressOrder.paymentProvider || ''}`;
    } else if (inProgressOrder.status === 'processing') {
        path = `/order/${inProgressOrder.id}`;
    }
    if (path) {
        router.push(path);
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
            <Tabs defaultValue="small" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="small">Small Amount</TabsTrigger>
                    <TabsTrigger value="high">High Amount</TabsTrigger>
                </TabsList>
                <TabsContent value="small">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={smallPurchaseOptions} activeTab={activeTab} />
                </TabsContent>
                <TabsContent value="high">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={highPurchaseOptions} activeTab={activeTab} />
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
                    <PurchaseGrid onBuyClick={handleBuyClick} options={smallPurchaseOptions} activeTab={activeTab} />
                </TabsContent>
                <TabsContent value="high">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={highPurchaseOptions} activeTab={activeTab} />
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
      <AlertDialog open={isInProgressDialogOpen} onOpenChange={setIsInProgressDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-white shadow-2xl">
          <AlertDialogHeader className="text-center items-center">
              <AlertDialogTitle className="text-xl font-bold text-orange-500">Order Already In Progress</AlertDialogTitle>
              <AlertDialogDescription className="pt-2 font-semibold text-red-500">
                  You can buy your order only after completing your old order, otherwise not.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
              <AlertDialogCancel className="w-full h-12 rounded-full">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                  onClick={handleGoToOrder} 
                  className="w-full h-12 rounded-full btn-gradient font-bold text-base"
              >
                  Complete
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    