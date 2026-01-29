

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
import { useDoc, useCollection } from '@/firebase';
import { useParams } from 'next/navigation';
import { Wallet, ChevronLeft, Copy, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { doc, updateDoc, collection, query, orderBy, Timestamp, runTransaction } from 'firebase/firestore';
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
import React, { useState, useMemo } from 'react';
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
    holdBalance: number;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
    paymentMethods?: { name: string; upiId: string }[];
};

type Order = {
  id: string;
  amount: number;
  status: 'pending_payment' | 'processing' | 'completed' | 'cancelled' | 'failed';
  utr?: string;
  screenshotURL?: string;
  createdAt: Timestamp;
};

type SellOrder = {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  utr?: string;
  withdrawalMethod: { name: string, upiId: string };
  createdAt: Timestamp;
  completedAt?: Timestamp;
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

        const newBalance = action === 'add' ? Number(currentBalance) + value : Number(currentBalance) - value;

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
            console.error("Balance update error: ", error)
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

const HoldBalanceActionDialog = ({ userId, currentBalance, currentHoldBalance }: { userId: string, currentBalance: number, currentHoldBalance: number }) => {
    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'add' | 'remove'>('add');
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleUpdateHoldBalance = async () => {
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount' });
            return;
        }

        if (!firestore || !userId) return;
        setIsLoading(true);

        const userRef = doc(firestore, 'users', userId);

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) {
                    throw new Error("User not found");
                }

                const data = userDoc.data() as UserProfile;
                const balance = Number(data.balance) || 0;
                const holdBalance = Number(data.holdBalance) || 0;

                let newBalance: number;
                let newHoldBalance: number;

                if (action === 'add') {
                    if (balance < value) {
                        throw new Error("Insufficient main balance to put on hold.");
                    }
                    newBalance = balance - value;
                    newHoldBalance = holdBalance + value;
                } else { // remove
                    if (holdBalance < value) {
                        throw new Error("Insufficient hold balance to release.");
                    }
                    newBalance = balance + value;
                    newHoldBalance = holdBalance - value;
                }
                
                transaction.update(userRef, { balance: newBalance, holdBalance: newHoldBalance });
            });

            toast({ title: 'Hold Balance Updated' });
            setOpen(false);
            setAmount('');
        } catch (error: any) {
            console.error("Hold balance update error: ", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };


    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Manage Hold</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Hold Balance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">Current Main Balance: <span className="font-bold text-foreground">{(currentBalance || 0).toFixed(2)}</span></p>
                    <p className="text-sm text-muted-foreground">Current Hold Balance: <span className="font-bold text-foreground">{(currentHoldBalance || 0).toFixed(2)}</span></p>
                     <div className="flex items-center gap-4">
                        <Label>Action</Label>
                        <Button variant={action === 'add' ? 'default' : 'outline'} onClick={() => setAction('add')}>Add to Hold</Button>
                        <Button variant={action === 'remove' ? 'default' : 'outline'} onClick={() => setAction('remove')}>Remove from Hold</Button>
                    </div>
                    <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 100" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleUpdateHoldBalance} disabled={isLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm
                    </Button>
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

    const ordersQuery = useMemo(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'orders'), orderBy('createdAt', 'desc'));
    }, [firestore, userId]);

    const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersQuery);

    const sellOrdersQuery = useMemo(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'sellOrders'), orderBy('createdAt', 'desc'));
    }, [firestore, userId]);

    const { data: sellOrders, loading: sellOrdersLoading } = useCollection<SellOrder>(sellOrdersQuery);

    const stats = React.useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
        const completedBuyOrders = orders?.filter(o => o.status === 'completed') || [];
        const completedSellOrders = sellOrders?.filter(o => o.status === 'completed') || [];
    
        // Total stats
        const totalBuyAmount = completedBuyOrders.reduce((acc, order) => acc + order.amount, 0);
        const totalBuyCount = completedBuyOrders.length;
        const totalSellAmount = completedSellOrders.reduce((acc, order) => acc + order.amount, 0);
        const totalSellCount = completedSellOrders.length;
    
        // Today's stats
        const todayBuyOrders = completedBuyOrders.filter(o => o.createdAt && o.createdAt.toDate() >= startOfToday);
        const todayBuyAmount = todayBuyOrders.reduce((acc, order) => acc + order.amount, 0);
        const todayBuyCount = todayBuyOrders.length;
    
        const todaySellOrders = completedSellOrders.filter(o => o.completedAt && o.completedAt.toDate() >= startOfToday);
        const todaySellAmount = todaySellOrders.reduce((acc, order) => acc + order.amount, 0);
        const todaySellCount = todaySellOrders.length;
    
        return { totalBuyAmount, totalBuyCount, totalSellAmount, totalSellCount, todayBuyAmount, todayBuyCount, todaySellAmount, todaySellCount };
    }, [orders, sellOrders]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: 'UID Copied!' });
        });
    };

    const copyUpiToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: 'UPI ID Copied!' });
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
                <Card>
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
                <Card>
                    <CardHeader>
                        <CardTitle>User Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">{(Number(user.balance) || 0).toFixed(2)} <span className="text-lg text-muted-foreground">LGB</span></div>
                        <p className="text-sm text-muted-foreground">This is the user's available balance for transactions.</p>
                    </CardContent>
                    <CardFooter>
                         <BalanceActionDialog userId={userId} currentBalance={Number(user.balance) || 0} />
                    </CardFooter>
                </Card>
                
                {/* Hold Balance Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Hold Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">{(Number(user.holdBalance) || 0).toFixed(2)} <span className="text-lg text-muted-foreground">LGB</span></div>
                         <p className="text-sm text-muted-foreground">This balance is frozen and cannot be used by the user.</p>
                    </CardContent>
                    <CardFooter>
                         <HoldBalanceActionDialog userId={userId} currentBalance={Number(user.balance) || 0} currentHoldBalance={Number(user.holdBalance) || 0} />
                    </CardFooter>
                </Card>
            </div>

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
                                if (!details) return null;
                                return (
                                    <div
                                        key={method.name}
                                        className={`flex items-center justify-between gap-4 rounded-xl p-3 text-white shadow-md ${details?.bgColor || 'bg-gray-500'}`}
                                    >
                                        <div className="flex items-center gap-3">
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
                                            <div className="flex-grow">
                                                <span className="text-base font-semibold">{method.name}</span>
                                                <p className="text-xs font-mono text-white/80">{method.upiId}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center justify-center rounded-md bg-green-500/80 px-2 py-1 text-[10px] font-bold uppercase text-white">
                                                ACTIVATED
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-white/80 hover:bg-white/20 hover:text-white"
                                                onClick={() => copyUpiToClipboard(method.upiId || '')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
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

            {/* User Stats Card */}
            <Card>
                <CardHeader>
                    <CardTitle>User Stats</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                    <div className="rounded-lg bg-blue-100 p-3">
                        <p className="text-sm font-medium text-blue-800">Total Buy</p>
                        <p className="text-2xl font-bold text-blue-900">₹{stats.totalBuyAmount.toFixed(2)}</p>
                        <p className="text-xs text-blue-800">{stats.totalBuyCount} orders</p>
                    </div>
                    <div className="rounded-lg bg-green-100 p-3">
                        <p className="text-sm font-medium text-green-800">Total Sell</p>
                        <p className="text-2xl font-bold text-green-900">₹{stats.totalSellAmount.toFixed(2)}</p>
                        <p className="text-xs text-green-800">{stats.totalSellCount} orders</p>
                    </div>
                    <div className="rounded-lg bg-blue-100 p-3">
                        <p className="text-sm font-medium text-blue-800">Today's Buy</p>
                        <p className="text-2xl font-bold text-blue-900">₹{stats.todayBuyAmount.toFixed(2)}</p>
                        <p className="text-xs text-blue-800">{stats.todayBuyCount} orders</p>
                    </div>
                    <div className="rounded-lg bg-green-100 p-3">
                        <p className="text-sm font-medium text-green-800">Today's Sell</p>
                        <p className="text-2xl font-bold text-green-900">₹{stats.todaySellAmount.toFixed(2)}</p>
                        <p className="text-xs text-green-800">{stats.todaySellCount} orders</p>
                    </div>
                </CardContent>
            </Card>

            {/* Buy Order History */}
            <Card>
                <CardHeader>
                    <CardTitle>Buy Order History</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>UTR</TableHead>
                                <TableHead>Screenshot</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ordersLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Loading orders...
                                    </TableCell>
                                </TableRow>
                            ) : orders && orders.length > 0 ? orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">₹{order.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{order.status.replace('_', ' ')}</TableCell>
                                    <TableCell>{order.utr || 'N/A'}</TableCell>
                                    <TableCell>
                                        {order.screenshotURL ? (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="link" className="p-0 h-auto text-primary">View</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Payment Proof</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="flex justify-center py-4">
                                                        <img
                                                            src={order.screenshotURL}
                                                            alt="Payment proof"
                                                            className="max-h-[70vh] w-auto object-contain rounded-md"
                                                        />
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        ): 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">{order.createdAt.toDate().toLocaleString()}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No buy orders found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             {/* Sell Order History */}
            <Card>
                <CardHeader>
                    <CardTitle>Sell Order History</CardTitle>
                    <CardDescription>
                       Successful: {sellOrders?.filter(o => o.status === 'completed').length || 0} | Failed/Cancelled: {sellOrders?.filter(o => o.status === 'failed').length || 0}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>To UPI</TableHead>
                                <TableHead>UTR</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sellOrdersLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Loading sell orders...
                                    </TableCell>
                                </TableRow>
                            ) : sellOrders && sellOrders.length > 0 ? sellOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">₹{order.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{order.status}</TableCell>
                                    <TableCell className="text-xs">{order.withdrawalMethod.name} ({order.withdrawalMethod.upiId})</TableCell>
                                    <TableCell>{order.utr || 'N/A'}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{order.createdAt.toDate().toLocaleString()}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No sell orders found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    )
}

    
