
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronLeft, Info, Wallet } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, addDoc, collection, serverTimestamp, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader } from '@/components/ui/loader';

type UserProfile = {
  id: string;
  balance: number;
  holdBalance: number;
  numericId: string;
  phoneNumber: string;
  paymentMethods?: { name: string; upiId: string }[];
};

type WithdrawalMethod = {
    name: string;
    upiId: string;
}

const paymentMethodDetails: { [key: string]: { logo: string; bgColor: string } } = {
  PhonePe: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae",
    bgColor: "bg-violet-600",
  },
  Paytm: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8",
    bgColor: "bg-sky-500",
  },
  MobiKwik: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f",
    bgColor: "bg-blue-600",
  },
  Freecharge: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4",
    bgColor: "bg-orange-500",
  },
};

export default function SellPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [amount, setAmount] = useState('');
  const [selectedUpi, setSelectedUpi] = useState<WithdrawalMethod | null>(null);
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [isSelling, setIsSelling] = useState(false);

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    if (/^\d*$/.test(value)) {
      setAmount(value);
      const numValue = parseInt(value, 10);
      if (value === '' || (numValue > 0 && numValue % 100 === 0)) {
        setIsAmountValid(true);
      } else {
        setIsAmountValid(false);
      }
    }
  };

  const handleSell = async () => {
    const sellAmount = parseInt(amount, 10);
    
    if (!isAmountValid || !sellAmount || sellAmount <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid amount ending in 00.' });
        return;
    }
    
    if (!selectedUpi) {
        toast({ variant: 'destructive', title: 'No UPI selected', description: 'Please select a UPI account for withdrawal.' });
        return;
    }

    if (!userProfile || (userProfile.balance < sellAmount)) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You do not have enough balance to make this transaction.' });
        return;
    }
    
    if (!user || !firestore || !userProfileRef) return;

    setIsSelling(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const userProfileSnap = await transaction.get(userProfileRef);
            if (!userProfileSnap.exists()) {
                throw "User profile does not exist!";
            }

            const profileData = userProfileSnap.data() as UserProfile;
            const currentBalance = profileData.balance;

            if (currentBalance < sellAmount) {
                throw "Insufficient balance.";
            }

            const newBalance = currentBalance - sellAmount;
            
            const sellOrdersRef = collection(firestore, 'users', user.uid, 'sellOrders');
            const newSellOrderRef = doc(sellOrdersRef); // Auto-generate ID
            
            const orderId = `LGPAY${Date.now()}`;

            transaction.set(newSellOrderRef, {
                userId: user.uid,
                orderId: orderId,
                amount: sellAmount,
                remainingAmount: sellAmount, // For P2P matching
                withdrawalMethod: selectedUpi,
                status: 'pending',
                createdAt: serverTimestamp(),
                userNumericId: profileData.numericId,
                userPhoneNumber: profileData.phoneNumber
            });

            transaction.update(userProfileRef, { balance: newBalance });
        });

        toast({
            title: 'Sell Order Placed!',
            description: `Your request to sell ${sellAmount} LGB is being processed.`,
        });
        router.push('/order');

    } catch (error: any) {
        console.error('Sell transaction failed:', error);
        toast({ variant: 'destructive', title: 'Sell Failed', description: error.toString() });
    } finally {
        setIsSelling(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Sell LG</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 text-primary" />
              Withdrawal Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Minimum withdrawal amount is ₹100.</p>
            <p>2. Withdrawal amount must be a multiple of 100 (e.g., 100, 500, 1200).</p>
            <p>3. Funds will be transferred to your selected UPI account within 24 hours.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sell Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold">
                ₹
              </span>
              <Input
                placeholder="0.00"
                className={cn(
                  'h-14 pl-8 text-2xl font-bold tracking-wider',
                  !isAmountValid && amount !== '' && 'border-destructive ring-2 ring-destructive/50'
                )}
                value={amount}
                onChange={handleAmountChange}
                type="text" 
                inputMode="numeric"
              />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                <p>Balance: {profileLoading ? '...' : (userProfile?.balance || 0).toFixed(2)}</p>
               </div>
            </div>
            {!isAmountValid && amount !== '' && (
              <p className="mt-2 text-xs text-destructive">
                Amount must be a multiple of 100.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-base">Withdrawal Method</CardTitle>
            </CardHeader>
            <CardContent>
                {profileLoading ? (
                    <Skeleton className="h-24 w-full" />
                ) : userProfile?.paymentMethods && userProfile.paymentMethods.length > 0 ? (
                    <RadioGroup 
                        onValueChange={(value) => setSelectedUpi(JSON.parse(value))}
                        className="space-y-3"
                    >
                        {userProfile.paymentMethods.map((method) => {
                            const details = paymentMethodDetails[method.name];
                            if (!details) return null;
                            return (
                                <Label key={method.upiId} htmlFor={method.upiId} className={cn("flex items-center gap-4 rounded-xl p-3 border-2 border-transparent has-[:checked]:border-primary", details.bgColor)}>
                                    <RadioGroupItem value={JSON.stringify(method)} id={method.upiId} className="border-white text-white ring-offset-0" />
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
                                        <Image
                                            src={details.logo}
                                            alt={`${method.name} logo`}
                                            width={32}
                                            height={32}
                                            className="object-contain"
                                        />
                                    </div>
                                    <div className="text-white">
                                        <span className="text-lg font-semibold">{method.name}</span>
                                        <p className="text-sm font-mono text-white/80">{method.upiId}</p>
                                    </div>
                                </Label>
                            )
                        })}
                    </RadioGroup>
                ) : (
                    <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground">
                        <Wallet className="h-8 w-8 opacity-50 mb-2" />
                        <p>No withdrawal method active</p>
                        <Button asChild variant="link" className="mt-1">
                            <Link href="/my/collection">Add UPI Account</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>

       <CardFooter className="p-4 bg-white border-t sticky bottom-14">
        <Button 
            className="w-full h-12 btn-gradient font-bold text-base"
            onClick={handleSell}
            disabled={isSelling || !isAmountValid || !amount || !selectedUpi}
        >
          {isSelling ? <Loader size="sm" className="mr-2" /> : 'Sell Now'}
        </Button>
      </CardFooter>
    </div>
  );
}
