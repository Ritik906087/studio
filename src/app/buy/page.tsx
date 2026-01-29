
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
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
import { motion, AnimatePresence } from 'framer-motion';

import { ChevronLeft, ShoppingCart, Wallet, ArrowDownUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


const purchaseConfig = {
    "100": 5, "200": 6, "300": 7, "400": 5, "500": 6, "600": 5, "700": 4, "800": 3, "1000": 4,
    "2000": 3, "3000": 3, "4000": 5, "5000": 4, "6000": 3, "7000": 2, "8000": 3, "10000": 2
};

const removalConfig = {
    "100": 2, "200": 3, "300": 3, "400": 2, "500": 3, "600": 4, "700": 2, "800": 1, "1000": 2,
    "2000": 1, "3000": 1, "4000": 3, "5000": 2, "6000": 1, "7000": 1, "8000": 1, "10000": 1
};

const generateOptionsFromConfig = (config: Record<string, number>) => {
    let idCounter = 1;
    return Object.entries(config).flatMap(([amountStr, count]) => {
        const amount = parseInt(amountStr);
        return Array.from({ length: count }, () => ({
            id: idCounter++,
            amount,
        }));
    });
};

const allPurchaseOptions = generateOptionsFromConfig(purchaseConfig);


const upiMethods = [
    { name: "PhonePe", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae" },
    { name: "Paytm", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8" },
    { name: "MobiKwik", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f" },
];

const PurchaseGrid = ({ onBuyClick, options, bonusPercentage }: { onBuyClick: (option: any) => void; options: any[]; bonusPercentage: number; }) => {
  return (
    <div className="grid grid-cols-1 gap-3 mt-4">
      <AnimatePresence>
        {options.map((option) => {
          const totalLGB = option.amount + (option.amount * (bonusPercentage / 100));

          return (
            <motion.div
              key={option.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <Card className="rounded-xl shadow-sm overflow-hidden bg-white w-full">
                 <div className="flex items-center justify-between p-3 relative z-10">
                     <div className="flex items-center gap-4">
                         <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ShoppingCart className="h-6 w-6" />
                         </div>
                         <div>
                            <p className="font-bold text-lg">₹ {option.amount.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-green-600 font-semibold">
                                You Get: {option.amount}+{bonusPercentage}%={totalLGB.toFixed(0)}
                            </p>
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
    </div>
  );
};

const UsdtPurchaseForm = ({ onBuyClick, bonusPercentage }: { onBuyClick: (option: { amount: number }) => void, bonusPercentage: number }) => {
    const { toast } = useToast();
    const [usdtAmount, setUsdtAmount] = useState('5');
    
    const lgbAmount = useMemo(() => {
        const numValue = parseFloat(usdtAmount);
        if (!isNaN(numValue) && numValue > 0) {
            return numValue * 110;
        }
        return 0;
    }, [usdtAmount]);
    
    const finalLgbAmount = lgbAmount + (lgbAmount * (bonusPercentage / 100));

    const [isProcessing, setIsProcessing] = useState(false);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
            setUsdtAmount(value);
        }
    };

    const handleRecharge = () => {
        const amount = parseFloat(usdtAmount);
        if (isNaN(amount) || amount < 5) {
            toast({
                variant: 'destructive',
                title: 'Invalid Amount',
                description: 'Minimum deposit amount is 5 USDT.',
            });
            return; 
        }
        setIsProcessing(true);
        onBuyClick({ amount: lgbAmount }); 
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center text-sm font-semibold px-2">
                <span>Main Network: TRC-20</span>
                <span className="text-primary">1 USDT = 110 LGB</span>
            </div>

            <Card className="bg-green-500/10 border-green-500 shadow-none">
                <CardContent className="p-4">
                    <Label htmlFor="usdt-amount" className="text-sm text-green-900/80">Deposit amount (minimum 5 USDT)</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/usdt-logo.png?alt=media&token=16c8f93a-832a-43c2-8419-2479e394f451" width={28} height={28} alt="USDT" />
                        <Input 
                            id="usdt-amount"
                            type="number"
                            placeholder="5"
                            value={usdtAmount}
                            onChange={handleAmountChange}
                            className="bg-transparent border-none text-3xl font-bold text-green-900 focus-visible:ring-0 p-0 h-auto shadow-none"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-center items-center my-2">
                 <div className="bg-background rounded-full p-1 border-2 border-primary/50 shadow-md z-10">
                    <ArrowDownUp className="h-5 w-5 text-primary"/>
                 </div>
            </div>
            
            <Card className="bg-yellow-500/10 border-yellow-500 shadow-none">
                <CardContent className="p-4">
                    <Label htmlFor="lgb-amount" className="text-sm text-yellow-900/80">Recharge quantity</Label>
                     <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-bold text-3xl text-yellow-900">{lgbAmount.toFixed(0)}</span>
                        <span className="font-semibold text-yellow-900/90">LGB</span>
                    </div>
                    {bonusPercentage > 0 && <p className="text-xs text-green-600 font-semibold mt-1">You Get: {lgbAmount.toFixed(0)} + {bonusPercentage}% = {finalLgbAmount.toFixed(0)} LGB</p>}
                </CardContent>
            </Card>

            <Button onClick={handleRecharge} disabled={isProcessing} className="w-full h-12 text-lg font-bold btn-gradient rounded-full">
                {isProcessing ? <Loader2 className="animate-spin" /> : "Buy"}
            </Button>
            
            <Card className="bg-secondary/50 shadow-none">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />LG Pay Wallet Exchange Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                    Please ensure that the amount of USDT you pay matches the amount stated in your order. Otherwise, the order will not be processed and no refund will be issued.
                </CardContent>
            </Card>
        </div>
    );
};


export default function BuyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'otp-upi' | 'bank' | 'usdt'>('otp-upi');
  const [activeSubTab, setActiveSubTab] = useState('small');
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isInProgressDialogOpen, setIsInProgressDialogOpen] = useState(false);
  const [inProgressOrder, setInProgressOrder] = useState<any>(null);
  
  const [allOptions, setAllOptions] = useState(() => [...allPurchaseOptions]);

  const inProgressBuyOrdersQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'users', user.uid, 'orders'),
        where('status', 'in', ['pending_payment', 'processing'])
    );
  }, [user, firestore]);

  const { data: inProgressBuyOrders } = useCollection(inProgressBuyOrdersQuery);
  
  useEffect(() => {
    const removalInterval = setInterval(() => {
        setAllOptions(prevOptions => {
            if (prevOptions.length <= 20) return prevOptions;
            let currentOpts = [...prevOptions];
            for (let i = 0; i < 20; i++) {
                if (currentOpts.length === 0) break;
                const removeIndex = Math.floor(Math.random() * currentOpts.length);
                currentOpts.splice(removeIndex, 1);
            }
            return currentOpts;
        });
    }, 2000);

    const additionInterval = setInterval(() => {
        setAllOptions(prevOptions => {
            let currentOpts = [...prevOptions];
            const baseOptions = generateOptionsFromConfig(purchaseConfig);
            
            for (let i = 0; i < 30; i++) {
                const addIndex = Math.floor(Math.random() * baseOptions.length);
                const itemToAdd = { ...baseOptions[addIndex], id: Math.random() }; 
                
                const insertAtIndex = Math.floor(Math.random() * (currentOpts.length + 1));
                currentOpts.splice(insertAtIndex, 0, itemToAdd);
            }
            return currentOpts;
        });
    }, 4000);

    return () => {
      clearInterval(removalInterval);
      clearInterval(additionInterval);
    };
  }, []); 


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

    if (activeTab === 'usdt') {
        createOrder('TRC20', option.amount);
    } else {
        setIsDialogOpen(true);
    }
  };
  
  const createOrder = async (provider: string, orderAmount: number) => {
    if (!user || !firestore || !orderAmount) return;

    const orderId = `LGPAY${Date.now()}`;
    const paymentType = activeTab === 'otp-upi' ? 'upi' : activeTab;

    try {
        const ordersRef = collection(firestore, 'users', user.uid, 'orders');
        const newOrderRef = await addDoc(ordersRef, {
            userId: user.uid,
            amount: orderAmount,
            orderId,
            status: 'pending_payment',
            createdAt: serverTimestamp(),
            paymentType: paymentType,
            paymentProvider: provider,
        });
        router.push(`/buy/confirm/${newOrderRef.id}?type=${paymentType}&provider=${provider}`);
    } catch (error) {
        console.error('Error creating order: ', error);
        toast({ variant: 'destructive', title: 'Could not create order.' });
    }
  }

  const handleProviderSelect = async (methodName: string) => {
    setIsDialogOpen(false);
    if (selectedAmount) {
      await createOrder(methodName, selectedAmount);
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

  const bonusPercentage = activeTab === 'bank' ? 6 : activeTab === 'usdt' ? 7 : 5;
  
  const displayedOptions = useMemo(() => {
      if (activeSubTab === 'small') {
          return allOptions.filter(opt => opt.amount <= 1000).sort((a,b) => a.amount - b.amount);
      } else {
          return allOptions.filter(opt => opt.amount > 1000).sort((a,b) => b.amount - a.amount);
      }
  }, [allOptions, activeSubTab]);
  
  return (
    <div className="text-foreground pb-4 min-h-screen flex flex-col">
       <header className="flex items-center justify-between p-4 bg-white border-b">
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
        <Tabs value={activeTab} className="w-full" onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3 gap-2 h-auto p-0 bg-transparent">
             <TabsTrigger value="otp-upi" className="flex flex-col items-center justify-center p-3 h-auto rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all space-y-1">
                <span className="font-bold text-base text-foreground">OTP-UPI</span>
                <span className="text-xs text-green-600 font-semibold">+5% Bonus</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex flex-col items-center justify-center p-3 h-auto rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all space-y-1">
                <span className="font-bold text-base text-foreground">BANK</span>
                <span className="text-xs text-green-600 font-semibold">+6% Bonus</span>
            </TabsTrigger>
             <TabsTrigger value="usdt" className="flex flex-col items-center justify-center p-3 h-auto rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all space-y-1">
                <span className="font-bold text-base text-foreground">USDT</span>
                <span className="text-xs text-primary font-semibold">1$ = 110₹</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {activeTab === 'usdt' ? (
             <UsdtPurchaseForm onBuyClick={handleBuyClick} bonusPercentage={bonusPercentage} />
        ) : (
            <Tabs defaultValue="small" className="w-full mt-4" onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="small">Small Amount</TabsTrigger>
                    <TabsTrigger value="high">High Amount</TabsTrigger>
                </TabsList>
                <TabsContent value="small" className="mt-0">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={displayedOptions} bonusPercentage={bonusPercentage} />
                </TabsContent>
                <TabsContent value="high" className="mt-0">
                    <PurchaseGrid onBuyClick={handleBuyClick} options={displayedOptions} bonusPercentage={bonusPercentage} />
                </TabsContent>
            </Tabs>
        )}
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
                    onClick={() => handleProviderSelect(method.name)}
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

    