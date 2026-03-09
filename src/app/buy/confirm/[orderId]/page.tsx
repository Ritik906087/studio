

'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, useParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Copy, Upload, Loader2, Info, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useDoc, useUser, useFirestore, useStorage } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, updateDoc, serverTimestamp, collection, Timestamp, runTransaction } from 'firebase/firestore';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { sendOrderConfirmationToTelegram } from '@/lib/telegram';


type PaymentMethod = {
    id: string;
    type: 'bank' | 'upi' | 'usdt';
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiHolderName?: string;
    upiId?: string;
    usdtWalletAddress?: string;
}

type Order = {
    id: string;
    amount: number;
    status: string;
    createdAt: Timestamp;
    orderId: string;
    paymentType: 'bank' | 'upi' | 'usdt' | 'p2p_upi';
    paymentProvider: string;
    adminPaymentMethodId?: string;
    sellerId?: string;
    sellerUpiDetails?: { name: string; upiId: string };
    matchedSellOrderId?: string;
    matchedSellOrderPath?: string;
};

type UserProfile = {
    paymentMethods?: { name: string; upiId: string }[];
    numericId?: string;
};


const paymentMethodDetails: { [key: string]: { logo: string; bgColor: string } } = {
  PhonePe: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Phonepay.png?alt=media&token=579a228d-121f-4d5b-933d-692d791dec2f",
    bgColor: "bg-violet-600",
  },
  Paytm: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8",
    bgColor: "bg-sky-500",
  },
  MobiKwik: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7",
    bgColor: "bg-blue-600",
  },
  Freecharge: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4",
    bgColor: "bg-orange-500",
  },
  Airtel: {
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Airtel%2001.png?alt=media&token=357342fd-85df-43c1-a7fb-d9d57315df1d",
    bgColor: "bg-red-500",
  },
};


const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

function PaymentDetailsContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const orderId = params.orderId as string;
    const type = searchParams.get('type') as Order['paymentType'];
    const provider = searchParams.get('provider');

    const [utr, setUtr] = useState('');
    const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isUpdatingProvider, setIsUpdatingProvider] = useState(false);
    const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
    const [methodToVerify, setMethodToVerify] = useState<string | null>(null);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [otherReason, setOtherReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const isUSDT = type === 'usdt';

    const cancellationReasons = [
        "I don't want to continue payment",
        "Want to use another payment method",
        "Bank system is under maintenance",
        "UPI payment error",
        "Other reasons"
    ];

    const paymentMethodsQuery = useMemo(() => firestore ? collection(firestore, 'paymentMethods') : null, [firestore]);
    const { data: allPaymentMethods, loading: allPaymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsQuery);


    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);
    
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const verifiedBuyUpiMethods = useMemo(() => {
        if (!userProfile?.paymentMethods) return [];
        return userProfile.paymentMethods.filter(pm => 
            ['MobiKwik', 'Freecharge'].includes(pm.name)
        );
    }, [userProfile]);

    const paymentTargetDetails = useMemo(() => {
        if (orderLoading) return null;

        if (type === 'p2p_upi') {
            if (order && order.sellerUpiDetails) {
                return {
                    type: 'upi',
                    upiHolderName: order.sellerUpiDetails.name,
                    upiId: order.sellerUpiDetails.upiId,
                }
            }
            return null;
        }

        if (!allPaymentMethods || allPaymentMethods.length === 0 || !type) return null;
        return allPaymentMethods.find(m => m.type === type);
    }, [order, orderLoading, type, allPaymentMethods]);

    useEffect(() => {
        if (orderRef && paymentTargetDetails?.id && order && !order.adminPaymentMethodId && type !== 'p2p_upi') {
            updateDoc(orderRef, { adminPaymentMethodId: paymentTargetDetails.id })
                .catch(err => console.error("Failed to set admin payment method ID on order", err));
        }
    }, [orderRef, paymentTargetDetails, order, type]);


     const handleCancelOrder = useCallback(async (isAutoCancel = false, reason = "Order expired") => {
        if (!orderRef || !firestore || !order) return;

        const currentOrderSnap = await getDoc(orderRef);
        if (currentOrderSnap.data()?.status !== 'pending_payment') return;

        setIsCancelling(true);

        try {
            await runTransaction(firestore, async (transaction) => {
                const buyOrderSnap = await transaction.get(orderRef);
                if (!buyOrderSnap.exists() || buyOrderSnap.data()?.status !== 'pending_payment') {
                    return;
                }
                const buyOrderData = buyOrderSnap.data();

                if (buyOrderData.paymentType === 'p2p_upi' && buyOrderData.matchedSellOrderPath) {
                    const sellOrderRef = doc(firestore, buyOrderData.matchedSellOrderPath);
                    const sellOrderSnap = await transaction.get(sellOrderRef);

                    if (sellOrderSnap.exists()) {
                        const sellOrderData = sellOrderSnap.data();
                        
                        const newRemainingAmount = (sellOrderData.remainingAmount || 0) + buyOrderData.amount;
                        
                        let newSellOrderStatus = 'partially_filled';
                        if (newRemainingAmount >= sellOrderData.amount) {
                            newSellOrderStatus = 'pending';
                        }

                        const updatedMatchedBuyOrders = (sellOrderData.matchedBuyOrders || []).map((matched: any) => {
                            if (matched.buyOrderId === orderId) {
                                return { ...matched, status: isAutoCancel ? 'failed' : 'cancelled' };
                            }
                            return matched;
                        });
                        
                        transaction.update(sellOrderRef, {
                            remainingAmount: newRemainingAmount,
                            status: newSellOrderStatus,
                            matchedBuyOrders: updatedMatchedBuyOrders
                        });
                    }
                }

                transaction.update(orderRef, {
                    status: isAutoCancel ? 'failed' : 'cancelled',
                    cancellationReason: isAutoCancel ? 'Order timed out' : reason,
                });
            });

            if (!isAutoCancel) {
                toast({ title: 'Order Cancelled' });
                router.push('/order');
            } else {
                toast({ title: 'Order Timeout', variant: 'destructive' });
                router.push('/order');
            }

        } catch (e: any) {
            console.error("Error cancelling order:", e);
            toast({ variant: 'destructive', title: 'Error', description: `Could not cancel the order. ${e.message}` });
        } finally {
            setIsCancelling(false);
            setIsCancelDialogOpen(false);
        }
    }, [firestore, order, orderRef, router, toast, orderId]);
    
    const handleConfirmCancellation = async () => {
        let finalReason = cancelReason;
        if (cancelReason === 'Other reasons') {
            if (!otherReason.trim()) {
                toast({ variant: 'destructive', title: 'Please provide a reason.' });
                return;
            }
            finalReason = otherReason.trim();
        }
        if (!finalReason) {
            toast({ variant: 'destructive', title: 'Please select a reason.' });
            return;
        }
        await handleCancelOrder(false, finalReason);
    };

    const handlePaymentMethodChange = async (newProvider: string) => {
        if (!orderRef) return;
        
        const isVerified = userProfile?.paymentMethods?.some(pm => pm.name === newProvider);

        if (!isVerified) {
            setMethodToVerify(newProvider);
            setIsChangeDialogOpen(false);
            setIsVerificationDialogOpen(true);
            return;
        }

        setIsUpdatingProvider(true);
        try {
            await updateDoc(orderRef, { paymentProvider: newProvider });
            
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.set('provider', newProvider);
            router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });

            setIsChangeDialogOpen(false);
            toast({ title: 'Payment method updated!' });
        } catch (e: any) {
            console.error("Error changing payment method:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not change payment method.' });
        } finally {
            setIsUpdatingProvider(false);
        }
    };
    
    useEffect(() => {
        if (order && order.status !== 'pending_payment') {
            router.push(`/order/${orderId}`);
            return;
        }

        if (!order || !order.createdAt) {
            setTimeLeft(0);
            return;
        }

        const createdAt = order.createdAt.toDate();
        const expiryTime = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 minutes

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);

            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleCancelOrder(true, 'Order timed out');
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order, router, orderId, handleCancelOrder]);


    const details = useMemo(() => {
        if (!paymentTargetDetails) return null;

        if (paymentTargetDetails.type === 'bank') {
            return {
                'Bank Name': paymentTargetDetails.bankName,
                'Account Holder': paymentTargetDetails.accountHolderName,
                'Account Number': paymentTargetDetails.accountNumber,
                'IFSC Code': paymentTargetDetails.ifscCode,
            };
        }
        if (paymentTargetDetails.type === 'upi') {
            return {
                'Recipient Name': paymentTargetDetails.upiHolderName,
                'UPI ID': paymentTargetDetails.upiId,
            }
        }
        if (paymentTargetDetails.type === 'usdt') {
            return {
                'USDT Address (TRC20)': paymentTargetDetails.usdtWalletAddress,
            }
        }
        return null;
    }, [paymentTargetDetails]);

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Copied to clipboard!' });
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 950 * 1024) { 
                toast({
                    variant: 'destructive',
                    title: 'File is too large',
                    description: 'Please upload an image smaller than 950KB.'
                });
                if(fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                setScreenshotDataUrl(null);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target?.result as string;
                setScreenshotDataUrl(url);
            };
            reader.readAsDataURL(file);

            toast({
                title: 'Screenshot selected!',
                description: 'The payment proof is attached and ready to submit.',
            });
        }
    };
    
    const handleConfirm = async () => {
        if (isUSDT) {
            if (!utr || utr.length < 50) { // A loose validation for TxHash
                toast({ variant: 'destructive', title: 'Invalid Transaction Hash', description: 'Please provide a valid TxID.' });
                return;
            }
        } else {
            if (!utr || utr.length !== 12 || !/^\d+$/.test(utr)) {
                toast({ variant: 'destructive', title: 'Invalid UTR', description: 'Please provide a valid 12-digit UTR.' });
                return;
            }
        }
        
        if (!screenshotDataUrl) {
            toast({ variant: 'destructive', title: 'Missing Screenshot', description: 'Please upload your payment proof screenshot.' });
            return;
        }
        
        if (!orderRef || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not initialize. Please try again.' });
            return;
        }
    
        setIsConfirming(true);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                // --- READ PHASE ---
                const buyOrderDoc = await transaction.get(orderRef);
                if (!buyOrderDoc.exists()) {
                    throw new Error("Order not found.");
                }
                const buyOrderData = buyOrderDoc.data() as Order;

                let sellOrderRef: any = null;
                let sellOrderDoc: any = null;
                if (buyOrderData.paymentType === 'p2p_upi' && buyOrderData.matchedSellOrderPath) {
                    sellOrderRef = doc(firestore, buyOrderData.matchedSellOrderPath);
                    sellOrderDoc = await transaction.get(sellOrderRef);
                }

                // --- WRITE PHASE ---
                const updateData: any = {
                    utr,
                    status: 'pending_confirmation',
                    submittedAt: serverTimestamp(),
                    screenshotURL: screenshotDataUrl
                };
                transaction.update(orderRef, updateData);
    
                if (sellOrderRef && sellOrderDoc?.exists()) {
                    const sellOrderData = sellOrderDoc.data();
                    const updatedMatchedBuyOrders = (sellOrderData.matchedBuyOrders || []).map((bo: any) => {
                        if (bo.buyOrderId === orderId) {
                            return { ...bo, status: 'pending_confirmation', utr: utr };
                        }
                        return bo;
                    });
                    transaction.update(sellOrderRef, { matchedBuyOrders: updatedMatchedBuyOrders });
                }
            });
    
            if (order && userProfile && details) {
                try {
                    const receiverDetailsForTg = Object.fromEntries(
                        Object.entries(details).map(([key, value]) => [key, String(value)])
                    );
                    await sendOrderConfirmationToTelegram({
                        orderId: order.orderId,
                        userNumericId: userProfile.numericId,
                        amount: order.amount,
                        utr: utr,
                        receiverDetails: receiverDetailsForTg,
                    });
                } catch (tgError) {
                    console.error("Failed to send Telegram notification:", tgError);
                }
            }

            toast({ title: 'Payment Submitted!', description: 'Your proof is under review.' });
            router.push(`/order/${orderId}`);
        } catch (error) {
            console.error("Error submitting payment proof: ", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Failed to save order details.' });
            setIsConfirming(false);
        }
    };

    const loading = allPaymentMethodsLoading || orderLoading || profileLoading;
    const currentProviderDetails = provider ? paymentMethodDetails[provider] : null;
    
    const usdtAmount = useMemo(() => {
        if (order && type === 'usdt') {
            return order.amount / 110;
        }
        return 0;
    }, [order, type]);


    if (loading) {
        return (
             <div className="flex flex-col min-h-screen">
                <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-6 w-32 mx-auto" />
                </header>
                 <main className="flex-grow p-4 space-y-4">
                    <Card>
                        <CardHeader>
                           <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                 </main>
                 <footer className="p-4 grid grid-cols-2 gap-4 bg-white border-t sticky bottom-0">
                    <Skeleton className="h-12 w-full"/>
                    <Skeleton className="h-12 w-full"/>
                 </footer>
            </div>
        )
    }

    if (!details) {
        return (
             <div className="flex flex-col min-h-screen">
                <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                    <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                    </Button>
                    <h1 className="text-xl font-bold mx-auto pr-8">Payment Error</h1>
                </header>
                 <main className="flex-grow p-4">
                    <Card>
                        <CardContent className="p-8 text-center text-destructive">
                           Payment details are not configured by the admin yet. Please try again later.
                        </CardContent>
                    </Card>
                 </main>
            </div>
        )
    }

    if (isUSDT) {
        return (
            <div className="flex flex-col min-h-screen">
                <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
                    <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8" disabled={isConfirming}>
                        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                    </Button>
                    <h1 className="text-xl font-bold">USDT Buy</h1>
                    <div className="w-8"></div>
                </header>

                <main className="flex-grow p-4 space-y-4">
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center gap-2">
                             <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/InShot_20260307_173853268.png?alt=media&token=3cf559c6-bf02-46f1-93cc-6df9cf306657" width={48} height={48} alt="USDT Logo" />
                             <p className="text-3xl font-bold">{usdtAmount.toFixed(2)} USDT</p>
                             <p className="text-sm text-destructive text-center">The amount received is subject to the actual transfer amount. No less than 5.00 USDT</p>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch bg-secondary/30 p-4 space-y-3">
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Countdown</span>
                                {timeLeft !== null && timeLeft > 0 && <span className="font-mono font-bold text-destructive">{formatTime(timeLeft)}</span>}
                             </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Order Number</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono" style={{wordBreak: 'break-all'}}>{order?.orderId}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(order?.orderId ?? '')}><Copy className="h-4 w-4" /></Button>
                                </div>
                             </div>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex flex-col items-center gap-4">
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(details['USDT Address (TRC20)']!)}&size=200x200&qzone=2`}
                                width={200}
                                height={200}
                                alt="Payment QR Code"
                                className="rounded-lg border p-1 bg-white"
                            />
                            <div className="text-center w-full space-y-2">
                                <p className="text-sm text-muted-foreground">Wallet Address</p>
                                <div className="flex items-center gap-2 bg-secondary p-2 rounded-lg">
                                    <p className="font-mono text-xs flex-1" style={{wordBreak: 'break-all'}}>{details['USDT Address (TRC20)']}</p>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(details['USDT Address (TRC20)']!)}><Copy className="h-4 w-4" /></Button>
                                </div>
                                 <p className="text-sm text-muted-foreground pt-2">Network</p>
                                <p className="font-semibold">USDT-TRC20</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
                            <p>• Minimum deposit amount: 5 USDT. Deposits less than the minimum amount will not be credited to the account.</p>
                            <p>• Please do not deposit any non-currency assets to the above address, otherwise the assets will be irrecoverable.</p>
                            <p>• Please make sure that the operating environment is safe to prevent the information from being tampered with or leaked.</p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 space-y-4">
                          <div className="space-y-2">
                              <Label htmlFor="utr">Transaction Hash (TxID)</Label>
                              <Input id="utr" placeholder={'Enter 64-character TxID'} value={utr} onChange={(e) => setUtr(e.target.value)} disabled={isConfirming} />
                          </div>
                          <div className="space-y-2">
                               <Label>Upload Screenshot</Label>
                               <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isConfirming} accept="image/*" />
                               <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full flex items-center justify-center gap-2 border-dashed h-24" disabled={isConfirming}>
                                  {screenshotDataUrl ? (
                                      <Image src={screenshotDataUrl} alt="Screenshot preview" width={80} height={80} className="object-contain h-full" />
                                  ) : (
                                      <>
                                          <Upload className="h-4 w-4"/>
                                          Click to upload screenshot
                                      </>
                                  )}
                              </Button>
                          </div>
                      </CardContent>
                    </Card>
                </main>
                
                <footer className="p-4 grid grid-cols-2 gap-4 bg-white border-t sticky bottom-0">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="destructive" 
                                className="h-12 text-base font-bold bg-red-500 hover:bg-red-600 text-white" 
                                disabled={isConfirming}
                            >CANCEL</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure to cancel?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently cancel your order.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => setIsCancelDialogOpen(true)}
                                className='bg-red-500 hover:bg-red-600'
                                >Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Button onClick={handleConfirm} className="h-12 text-base font-bold bg-green-500 hover:bg-green-600 text-white" disabled={isConfirming || !utr || !screenshotDataUrl}>
                        {isConfirming ? <Loader2 className="h-6 w-6 animate-spin"/> : 'CONFIRM'}
                    </Button>
                </footer>

                 <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cancel Order</DialogTitle>
                            <DialogDescription>Please select a reason for cancellation.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <RadioGroup value={cancelReason} onValueChange={setCancelReason} className="space-y-2">
                                {cancellationReasons.map(reason => (
                                    <div key={reason} className="flex items-center space-x-3">
                                        <RadioGroupItem value={reason} id={reason} />
                                        <Label htmlFor={reason} className="font-normal">{reason}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            {cancelReason === 'Other reasons' && (
                                <Textarea 
                                    placeholder="Please fill in other reasons" 
                                    value={otherReason} 
                                    onChange={(e) => setOtherReason(e.target.value)} 
                                    className="mt-2"
                                />
                            )}
                            <div className="flex items-start gap-3 rounded-lg bg-yellow-100 p-3 text-yellow-900 text-xs mt-4">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    If you have already transferred money to the other party's collection account, please do not cancel the order to avoid causing losses to you.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} disabled={isCancelling}>Back</Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleConfirmCancellation}
                                disabled={isCancelling || !cancelReason || (cancelReason === 'Other reasons' && !otherReason.trim())}
                            >
                                {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Cancellation
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8" disabled={isConfirming || isUpdatingProvider}>
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold">Confirm Payment</h1>
                <div className="flex flex-col items-center">
                    {timeLeft !== null && timeLeft > 0 && (
                        <>
                            <p className="text-xs text-muted-foreground">Expires in</p>
                            <p className="text-lg font-mono font-bold text-destructive">{formatTime(timeLeft)}</p>
                        </>
                    )}
                </div>
            </header>

            <main className="flex-grow p-4 space-y-4">
                {(type === 'upi' || type === 'p2p_upi') && currentProviderDetails && provider && (
                    <Card className={cn("text-white shadow-md", currentProviderDetails.bgColor)}>
                        <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
                                    <Image
                                        src={currentProviderDetails.logo}
                                        alt={`${provider} logo`}
                                        width={32}
                                        height={32}
                                        className="object-contain"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs">Paying with</p>
                                    <p className="font-bold text-lg">{provider}</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => setIsChangeDialogOpen(true)}
                                variant="ghost" 
                                className="bg-white/20 text-white hover:bg-white/30 h-auto px-4 py-1.5 rounded-full"
                                disabled={isConfirming || isUpdatingProvider || type === 'p2p_upi'}
                            >
                                {isUpdatingProvider ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Change'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
                
                <Card>
                    <CardHeader>
                        <CardTitle>{type === 'bank' ? 'Bank Transfer' : type === 'usdt' ? 'USDT (TRC20) Payment' : 'Pay via UPI'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between items-center pt-0">
                            <span className="text-muted-foreground text-base">Amount to be paid</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-2xl text-primary">₹{order?.amount}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    onClick={() => copyToClipboard(order?.amount?.toString() ?? '')}
                                    disabled={isConfirming || isUpdatingProvider}
                                >
                                    <Copy className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Order Number</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono" style={{wordBreak: 'break-all'}}>{order?.orderId}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(order?.orderId ?? '')} disabled={isConfirming || isUpdatingProvider}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="border-t border-dashed -mx-4 my-4"></div>
                        {details && Object.entries(details).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                                <span className="text-muted-foreground">{key}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-right" style={{wordBreak: 'break-all'}}>{value}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => copyToClipboard(value!)} disabled={isConfirming || isUpdatingProvider}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {(type === 'upi' || type === 'p2p_upi') && details && order && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Scan QR to Pay</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-2">
                             <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                                    `upi://pay?pa=${details['UPI ID']}&pn=${encodeURIComponent(details['Recipient Name']!)}&am=${order.amount}&tn=${order.orderId}`
                                )}&size=200x200&qzone=2`}
                                width={200}
                                height={200}
                                alt="Payment QR Code"
                                className="rounded-lg border p-1 bg-white"
                            />
                            <p className="text-sm text-muted-foreground text-center">
                                Scan with any UPI app to pay.
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="utr">{isUSDT ? 'Transaction Hash (TxID)' : 'UTR / Reference Number'}</Label>
                            <Input 
                                id="utr"
                                type={isUSDT ? "text" : "tel"}
                                inputMode={isUSDT ? "text" : "numeric"}
                                placeholder={isUSDT ? 'Enter 64-character TxID' : 'Enter 12-digit UTR number'} 
                                value={utr}
                                onChange={(e) => {
                                    if (!isUSDT) {
                                        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                        setUtr(value);
                                    } else {
                                        setUtr(e.target.value);
                                    }
                                }}
                                maxLength={isUSDT ? 64 : 12} 
                                disabled={isConfirming || isUpdatingProvider} 
                            />
                        </div>
                        <div className="space-y-2">
                             <Label>Upload Screenshot</Label>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isConfirming || isUpdatingProvider} accept="image/*" />
                             <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full flex items-center justify-center gap-2 border-dashed h-24" disabled={isConfirming || isUpdatingProvider}>
                                {screenshotDataUrl ? (
                                    <Image src={screenshotDataUrl} alt="Screenshot preview" width={80} height={80} className="object-contain h-full" />
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4"/>
                                        Click to upload screenshot
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <footer className="p-4 grid grid-cols-2 gap-4 bg-white border-t sticky bottom-0">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="destructive" 
                            className="h-12 text-base font-bold bg-red-500 hover:bg-red-600 text-white" 
                            disabled={isConfirming || isUpdatingProvider}
                        >CANCEL</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure to cancel?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently cancel your order.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => setIsCancelDialogOpen(true)}
                            className='bg-red-500 hover:bg-red-600'
                            >Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>


                <Button onClick={handleConfirm} className="h-12 text-base font-bold bg-green-500 hover:bg-green-600 text-white" disabled={isConfirming || isUpdatingProvider || !utr || !screenshotDataUrl}>
                    {isConfirming ? <Loader2 className="h-6 w-6 animate-spin"/> : 'CONFIRM'}
                </Button>
            </footer>

            <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
              <DialogContent className="sm:max-w-md p-0">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle className="text-lg font-semibold text-center">Change Payment Method</DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-3">
                  {verifiedBuyUpiMethods.map((method) => {
                      const details = paymentMethodDetails[method.name];
                      if (!details) return null;
                      return (
                          <button 
                              key={method.upiId}
                              onClick={() => handlePaymentMethodChange(method.name)}
                              disabled={isUpdatingProvider}
                              className="w-full flex items-center p-3 rounded-lg border hover:bg-secondary transition-colors disabled:opacity-50"
                          >
                              {isUpdatingProvider ? (
                                <Loader2 className="h-5 w-5 mr-4 animate-spin" />
                              ) : (
                                <Image src={details.logo} alt={method.name} width={32} height={32} className="mr-4" />
                              )}
                              <div className="text-left">
                                  <span className="font-medium">{method.name}</span>
                                  <p className="text-xs font-mono text-muted-foreground">{method.upiId}</p>
                              </div>
                          </button>
                      )
                  })}
                   {verifiedBuyUpiMethods.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground p-4">
                          <p>No MobiKwik or Freecharge accounts linked.</p>
                          <Button asChild variant="link" className="mt-2">
                              <Link href="/my/collection/add">Link an account</Link>
                          </Button>
                      </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-bold text-orange-500">Verification Required</AlertDialogTitle>
                        <AlertDialogDescription className="text-red-500">
                            To use {methodToVerify}, you need to link it to your account first. Please complete the verification.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => router.push('/my/collection/add')}
                            className="bg-green-600 hover:bg-green-700">
                            Verify
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
             <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Order</DialogTitle>
                        <DialogDescription>Please select a reason for cancellation.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <RadioGroup value={cancelReason} onValueChange={setCancelReason} className="space-y-2">
                            {cancellationReasons.map(reason => (
                                <div key={reason} className="flex items-center space-x-3">
                                    <RadioGroupItem value={reason} id={reason} />
                                    <Label htmlFor={reason} className="font-normal">{reason}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                        {cancelReason === 'Other reasons' && (
                            <Textarea 
                                placeholder="Please fill in other reasons" 
                                value={otherReason} 
                                onChange={(e) => setOtherReason(e.target.value)} 
                                className="mt-2"
                            />
                        )}
                        <div className="flex items-start gap-3 rounded-lg bg-yellow-100 p-3 text-yellow-900 text-xs mt-4">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                                If you have already transferred money to the other party's collection account, please do not cancel the order to avoid causing losses to you.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} disabled={isCancelling}>Back</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleConfirmCancellation}
                            disabled={isCancelling || !cancelReason || (cancelReason === 'Other reasons' && !otherReason.trim())}
                        >
                            {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Cancellation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


export default function ConfirmPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin"/>
        </div>
    }>
      <PaymentDetailsContent />
    </Suspense>
  )
}
