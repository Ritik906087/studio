'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDoc } from '@/firebase';
import { useParams } from 'next/navigation';
import { Wallet, ChevronLeft, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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

type UserProfile = {
    id: string;
    displayName: string;
    numericId: string;
    balance: number;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
    paymentMethods?: { name: string; upiId: string }[];
};

type Transaction = {
  id: string;
  type: 'Buy' | 'Sell' | 'Rebate';
  amount: number;
  timestamp: string;
};


const BalanceActionDialog = ({ userId, currentBalance }: { userId: string, currentBalance: number }) => {
    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'add' | 'deduct'>('add');
    const [open, setOpen] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleUpdateBalance = async () => {
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount' });
            return;
        }

        if (!firestore || !userId) return;

        const newBalance = action === 'add' ? currentBalance + value : currentBalance - value;

        if (newBalance < 0) {
            toast({ variant: 'destructive', title: 'Insufficient Balance' });
            return;
        }

        const userRef = doc(firestore, 'users', userId);
        try {
            await updateDoc(userRef, { balance: newBalance });
            toast({ title: 'Balance Updated' });
            setOpen(false);
            setAmount('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };


    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Manage Balance</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update User Balance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                     <div className="flex items-center gap-4">
                        <Label>Action</Label>
                        <Button variant={action === 'add' ? 'default' : 'outline'} onClick={() => setAction('add')}>Add</Button>
                        <Button variant={action === 'deduct' ? 'default' : 'outline'} onClick={() => setAction('deduct')}>Deduct</Button>
                    </div>
                    <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 100" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateBalance}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function UserDetailsPage() {
    const params = useParams();
    const userId = params.userId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const userRef = React.useMemo(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);
    
    const { data: user, loading, error } = useDoc<UserProfile>(userRef);

    // Transactions will be fetched from Firestore in a real app
    const transactions: Transaction[] = [];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: 'UID Copied!' });
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Skeleton className="h-24 w-full" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (error || !user) {
        return (
             <div className="p-8">
                <Card className="bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription className="text-destructive/80">
                            Could not load user data.
                        </CardDescription>
                    </CardHeader>
                </Card>
             </div>
        )
    }


    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon" className="h-8 w-8">
                    <Link href="/admin/dashboard">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold">User Details</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Profile Card */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-col items-center text-center">
                         <Avatar className="h-24 w-24 border-4 border-primary/20">
                            <AvatarImage src={user.photoURL} alt={user.displayName} />
                            <AvatarFallback className="text-3xl bg-muted">
                                {user.displayName?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl mt-4">{user.displayName}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" onClick={() => copyToClipboard(user.numericId)}>
                            <span>UID: {user.numericId}</span>
                            <Copy className="h-3 w-3" />
                        </div>
                        <p className="text-sm text-muted-foreground">{user.phoneNumber || 'No phone number'}</p>
                    </CardHeader>
                </Card>

                {/* Balance Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>User Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">{(user.balance || 0).toFixed(2)} <span className="text-lg text-muted-foreground">LGB</span></div>
                    </CardContent>
                    <CardFooter>
                         <BalanceActionDialog userId={userId} currentBalance={user.balance || 0} />
                    </CardFooter>
                </Card>
            </div>

            {/* Transaction History */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount (LGB)</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="font-medium">{tx.type}</TableCell>
                                    <TableCell className={tx.type === 'Sell' ? 'text-destructive' : 'text-green-600'}>
                                        {tx.type === 'Sell' ? '-' : '+'} {tx.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">{tx.timestamp}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             {/* Linked UPIs Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Linked UPI Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                    {user.paymentMethods && user.paymentMethods.length > 0 ? (
                        <div className="space-y-3">
                            {user.paymentMethods.map((method) => {
                                const details = paymentMethodDetails[method.name];
                                return (
                                    <div
                                        key={method.name}
                                        className={`flex h-20 w-full items-center justify-between gap-4 rounded-xl px-4 py-2 text-white shadow-md ${details?.bgColor || 'bg-gray-500'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {details && (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
                                                    <Image
                                                        src={details.logo}
                                                        alt={`${method.name} logo`}
                                                        width={32}
                                                        height={32}
                                                        className="object-contain"
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-lg font-semibold">{method.name}</span>
                                                <p className="text-sm font-mono text-white/80">{method.upiId}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center rounded-md bg-green-500/80 px-3 py-1.5 text-xs font-bold uppercase text-white">
                                            ACTIVATED
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground">
                            <Wallet className="h-8 w-8 opacity-50 mb-2" />
                            <p>No UPI accounts linked.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </main>
    )
}
