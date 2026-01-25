
'use client';

import React, { Suspense, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Copy, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useDoc, useUser, useFirestore, useStorage } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

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
}

function PaymentDetailsContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();

    const orderId = params.orderId as string;
    const type = searchParams.get('type');

    const [utr, setUtr] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: paymentMethods, loading: paymentMethodsLoading } = useCollection<PaymentMethod>(firestore ? doc(firestore, 'paymentMethods', 'all') : null); // A bit of a hack to use useCollection for a single doc path
    const { data: allPaymentMethods, loading: allPaymentMethodsLoading } = useCollection<PaymentMethod>(firestore ? collection(firestore, 'paymentMethods'): null);


    const orderRef = useMemo(() => {
        if (!firestore || !user || !orderId) return null;
        return doc(firestore, 'users', user.uid, 'orders', orderId);
    }, [firestore, user, orderId]);

    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

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
            setScreenshot(file);
            setScreenshotPreview(URL.createObjectURL(file));
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
        if (!orderRef || !storage || !user) return;

        setIsConfirming(true);
        try {
            const screenshotPath = `screenshots/${user.uid}/${orderId}/${screenshot.name}`;
            const fileRef = storageRef(storage, screenshotPath);
            await uploadBytes(fileRef, screenshot);
            const screenshotURL = await getDownloadURL(fileRef);

            await updateDoc(orderRef, {
                utr,
                screenshotURL,
                status: 'processing',
                submittedAt: serverTimestamp()
            });

            toast({ title: 'Payment Submitted!', description: 'Your order is now processing.' });
            router.push('/home');

        } catch (error) {
            console.error("Error confirming payment: ", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'There was a problem submitting your payment proof.' });
            setIsConfirming(false);
        }
    }
    
    const handleCancel = async () => {
        if (!orderRef) return;
        await updateDoc(orderRef, { status: 'cancelled' });
        router.push('/home');
    }

    const loading = allPaymentMethodsLoading || orderLoading;

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
            <header className="flex items-center p-4 bg-white sticky top-0 z-10 border-b">
                <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <h1 className="text-xl font-bold mx-auto pr-8">Confirm Payment</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
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
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(value!)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-4">
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Amount to be paid</span>
                            <span className="font-bold text-2xl text-primary">₹{order?.amount}</span>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="utr">UTR / Reference Number</Label>
                            <Input id="utr" placeholder="Enter 12-digit UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={12} />
                        </div>
                        <div className="space-y-2">
                             <Label>Upload Screenshot</Label>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                             <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full flex items-center justify-center gap-2 border-dashed h-24">
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
                <Button onClick={handleCancel} variant="destructive" className="h-12 text-base font-bold bg-red-500 hover:bg-red-600 text-white" disabled={isConfirming}>CANCEL</Button>
                <Button onClick={handleConfirm} className="h-12 text-base font-bold bg-green-500 hover:bg-green-600 text-white" disabled={isConfirming}>
                    {isConfirming ? <Loader2 className="h-6 w-6 animate-spin"/> : 'CONFIRM'}
                </Button>
            </footer>
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
