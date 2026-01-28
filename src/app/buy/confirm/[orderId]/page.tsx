
'use client';

import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, useParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Copy, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useDoc, useUser, useFirestore, useStorage } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, updateDoc, serverTimestamp, collection, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


type PaymentMethod = {
    id: string;
    type: 'bank' | 'upi';
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiHolderName?: string;
    upiId?: string;
}

type Order = {
    amount: number;
    status: string;
    createdAt: Timestamp;
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
    const storage = useStorage();

    const orderId = params.orderId as string;
    const type = searchParams.get('type');
    const provider = searchParams.get('provider');

    const [utr, setUtr] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isUpdatingProvider, setIsUpdatingProvider] = useState(false);
    const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const upiMethods = [
        { name: "PhonePe", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae" },
        { name: "Paytm", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8" },
        { name: "MobiKwik", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f" },
    ];

    const paymentMethodsQuery = useMemo(() => firestore ? collection(firestore, 'paymentMethods') : null, [firestore]);
    const { data: allPaymentMethods, loading: allPaymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsQuery);


    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);
    
     const handleCancelOrder = async (isAutoCancel = false) => {
        if (!orderRef) return;
        
        const currentOrder = await getDoc(orderRef);
        if (currentOrder.data()?.status !== 'pending_payment') return;

        try {
            await updateDoc(orderRef, { status: 'cancelled' });
            if (!isAutoCancel) {
                toast({ title: 'Order Cancelled' });
                router.push('/home');
            } else {
                toast({ variant: 'destructive', title: 'Order Expired', description: 'You did not complete the payment in time.' });
                setTimeout(() => router.push('/home'), 1000);
            }
        } catch (e: any) {
            console.error("Error cancelling order:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the order.' });
        }
    };

    const handlePaymentMethodChange = async (newProvider: string) => {
        if (!orderRef) return;
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
        if (!order || order.status !== 'pending_payment' || !order.createdAt) {
            setTimeLeft(0);
            return;
        }

        const createdAt = order.createdAt.toDate();
        const expiryTime = new Date(createdAt.getTime() + 30 * 60 * 1000); // 30 minutes

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);

            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleCancelOrder(true);
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [order]);


    const details = useMemo(() => {
        if (!allPaymentMethods || allPaymentMethods.length === 0) return null;

        if (type === 'bank') {
            const bankAccount = allPaymentMethods.find(m => m.type === 'bank');
            if (!bankAccount) return null;
            return {
                'Bank Name': bankAccount.bankName,
                'Account Holder': bankAccount.accountHolderName,
                'Account Number': bankAccount.accountNumber,
                'IFSC Code': bankAccount.ifscCode,
            };
        }
        if (type === 'upi') {
            const upiAccount = allPaymentMethods.find(m => m.type === 'upi');
            if (!upiAccount) return null;
            return {
                'Recipient Name': upiAccount.upiHolderName,
                'UPI ID': upiAccount.upiId,
            }
        }
        return null;
    }, [allPaymentMethods, type]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Copied to clipboard!' });
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
             if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({
                    variant: 'destructive',
                    title: 'File is too large',
                    description: 'Please upload an image smaller than 5MB.'
                });
                if(fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                setScreenshot(null);
                setScreenshotPreview(null);
                return;
            }
            setScreenshot(file);
            setScreenshotPreview(URL.createObjectURL(file));
            toast({
                title: 'File selected successfully!',
                description: 'The payment proof is attached and ready to submit.',
            });
        }
    };
    
    const handleConfirm = async () => {
        if (!utr || utr.length !== 12) {
            toast({ variant: 'destructive', title: 'Invalid UTR', description: 'Please provide a valid 12-digit UTR.' });
            return;
        }
        if (!screenshot) {
            toast({ variant: 'destructive', title: 'Missing Screenshot', description: 'Please upload a payment screenshot.' });
            return;
        }
        if (!orderRef || !storage || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not initialize required services. Please try again.' });
            return;
        }

        setIsConfirming(true);

        try {
            const sanitizedFileName = screenshot.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const screenshotPath = `screenshots/${user.uid}/${orderId}/${sanitizedFileName}`;
            const fileRef = storageRef(storage, screenshotPath);

            const snapshot = await uploadBytes(fileRef, screenshot);
            const screenshotURL = await getDownloadURL(snapshot.ref);

            await updateDoc(orderRef, {
                utr,
                screenshotURL,
                status: 'processing',
                submittedAt: serverTimestamp()
            });
            
            toast({ title: 'Payment Submitted!', description: 'Your order is now processing.' });
            router.push(`/order/${orderId}`);

        } catch (error: any) {
            console.error("Error confirming payment: ", error);
            let errorMessage = 'An unexpected error occurred during submission.';
             if (error && error.code) {
                switch (error.code) {
                    case 'storage/unauthorized':
                        errorMessage = 'Permission denied. Please check your storage security rules.';
                        break;
                    case 'storage/canceled':
                        errorMessage = 'The file upload was canceled.';
                        break;
                    case 'permission-denied': // Firestore error
                        errorMessage = 'Permission denied. Please check your Firestore security rules.';
                        break;
                    default:
                        errorMessage = `An error occurred: ${error.code}. Please try again.`
                        break;
                }
            }
            toast({ 
                variant: 'destructive', 
                title: 'Submission Failed', 
                description: errorMessage,
                duration: 9000,
            });
        } finally {
            setIsConfirming(false);
        }
    }

    const loading = allPaymentMethodsLoading || orderLoading;
    const currentProviderDetails = provider ? paymentMethodDetails[provider] : null;

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
                {currentProviderDetails && provider && (
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
                                disabled={isConfirming || isUpdatingProvider}
                            >
                                {isUpdatingProvider ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Change'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
                
                <Card>
                    <CardHeader>
                        <CardTitle>{type === 'bank' ? 'Bank Transfer' : 'Pay via UPI'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        {Object.entries(details).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                                <span className="text-muted-foreground">{key}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{value}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(value!)} disabled={isConfirming || isUpdatingProvider}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <div className="border-t border-dashed -mx-4 my-4"></div>
                        <div className="flex justify-between items-center pt-0">
                            <span className="text-muted-foreground text-base">Amount to be paid</span>
                            <span className="font-bold text-2xl text-primary">₹{order?.amount}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="utr">UTR / Reference Number</Label>
                            <Input id="utr" placeholder="Enter 12-digit UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={12} disabled={isConfirming || isUpdatingProvider} />
                        </div>
                        <div className="space-y-2">
                             <Label>Upload Screenshot</Label>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={isConfirming || isUpdatingProvider} />
                             <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full flex items-center justify-center gap-2 border-dashed h-24" disabled={isConfirming || isUpdatingProvider}>
                                {screenshotPreview ? (
                                    <Image src={screenshotPreview} alt="Screenshot preview" width={80} height={80} className="object-contain h-full" />
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4"/>
                                        Click to upload payment proof
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <footer className="p-4 grid grid-cols-2 gap-4 bg-white border-t sticky bottom-0">
                <Button onClick={() => handleCancelOrder(false)} variant="destructive" className="h-12 text-base font-bold bg-red-500 hover:bg-red-600 text-white" disabled={isConfirming || isUpdatingProvider}>CANCEL</Button>
                <Button onClick={handleConfirm} className="h-12 text-base font-bold bg-green-500 hover:bg-green-600 text-white" disabled={isConfirming || isUpdatingProvider}>
                    {isConfirming ? <Loader2 className="h-6 w-6 animate-spin"/> : 'CONFIRM'}
                </Button>
            </footer>

            <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
              <DialogContent className="sm:max-w-md p-0">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle className="text-lg font-semibold text-center">Change Payment Method</DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-3">
                  {upiMethods.map((method) => (
                      <button 
                          key={method.name}
                          onClick={() => handlePaymentMethodChange(method.name)}
                          disabled={isUpdatingProvider}
                          className="w-full flex items-center p-3 rounded-lg border hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                          {isUpdatingProvider && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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

    