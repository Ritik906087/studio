
'use client';

import React, { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Copy, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

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

function PaymentDetailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const { data: paymentMethods, loading } = useCollection<PaymentMethod>('paymentMethods');

    const amount = searchParams.get('amount');
    const type = searchParams.get('type');

    const details = useMemo(() => {
        if (!paymentMethods || paymentMethods.length === 0) return null;

        if (type === 'bank') {
            const bankAccount = paymentMethods.find(m => m.type === 'bank');
            if (!bankAccount) return null;
            return {
                'Bank Name': bankAccount.bankName,
                'Account Holder': bankAccount.accountHolderName,
                'Account Number': bankAccount.accountNumber,
                'IFSC Code': bankAccount.ifscCode,
            };
        }
        if (type === 'upi') {
            const upiAccount = paymentMethods.find(m => m.type === 'upi');
            if (!upiAccount) return null;
            return {
                'Recipient Name': upiAccount.upiHolderName,
                'UPI ID': upiAccount.upiId,
            }
        }
        return null;
    }, [paymentMethods, type]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Copied to clipboard!' });
        });
    };
    
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
                            <span className="font-bold text-2xl text-primary">₹{amount}</span>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="utr">UTR / Reference Number</Label>
                            <Input id="utr" placeholder="Enter 12-digit UTR number" />
                        </div>
                        <div className="space-y-2">
                            <Label>Upload Screenshot</Label>
                             <Button variant="outline" className="w-full flex items-center justify-center gap-2 border-dashed">
                                <Upload className="h-4 w-4"/>
                                Click to upload payment proof
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <footer className="p-4 grid grid-cols-2 gap-4 bg-white border-t sticky bottom-0">
                <Button onClick={() => router.push('/home')} variant="destructive" className="h-12 text-base font-bold bg-red-500 hover:bg-red-600 text-white">CANCEL</Button>
                <Button className="h-12 text-base font-bold bg-green-500 hover:bg-green-600 text-white">CONFIRM</Button>
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
