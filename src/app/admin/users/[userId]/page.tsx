
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
import { useParams } from 'next/navigation';
import { Wallet, ChevronLeft, Copy, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader } from '@/components/ui/loader';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/use-user';


const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

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

type UserProfile = {
    id: string;
    uid: string;
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
  createdAt: string;
};

type SellOrder = {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  utr?: string;
  withdrawalMethod: { name: string, upiId: string };
  createdAt: string;
  completedAt?: string;
};


const BalanceActionDialog = ({ userId, currentBalance, onUpdate }: { userId: string, currentBalance: number, onUpdate: () => void }) => {
    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'add' | 'deduct'>('add');
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdateBalance = async () => {
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount' });
            return;
        }

        const newBalance = action === 'add' ? Number(currentBalance) + value : Number(currentBalance) - value;

        if (newBalance < 0) {
            toast({ variant: 'destructive', title: 'Insufficient Balance' });
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
        setIsLoading(false);

        if (error) {
            console.error("Balance update error: ", error)
            toast({ variant: 'destructive', title: 'Update Failed' });
        } else {
            toast({ title: 'Balance Updated' });
            setOpen(false);
            setAmount('');
            onUpdate();
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
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleUpdateBalance} disabled={isLoading}>
                        {isLoading && <Loader size="xs" className="mr-2" />}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const HoldBalanceActionDialog = ({ userId, currentBalance, currentHoldBalance, onUpdate }: { userId: string, currentBalance: number, currentHoldBalance: number, onUpdate: () => void }) => {
    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'add' | 'remove'>('add');
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleUpdateHoldBalance = async () => {
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount' });
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.rpc('manage_hold_balance', {
            p_user_id: userId,
            p_amount: value,
            p_action: action
        });
        setIsLoading(false);

        if (error) {
            console.error("Hold balance update error: ", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } else {
            toast({ title: 'Hold Balance Updated' });
            setOpen(false);
            setAmount('');
            onUpdate();
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
                         {isLoading && <Loader size="xs" className="mr-2" />}
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
    const { toast } = useToast();
    
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    
    const [user, setUser] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
    const [l1Agents, setL1Agents] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [userRes, ordersRes, sellOrdersRes, l1AgentsRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', userId).single(),
                supabase.from('orders').select('*').eq('userId', userId).order('created_at', { ascending: false }),
                supabase.from('sell_orders').select('*').eq('userId', userId).order('created_at', { ascending: false }),
                supabase.from('users').select('*').eq('inviterUid', userId)
            ]);

            if (userRes.error) throw userRes.error;
            setUser(userRes.data as UserProfile);

            if (ordersRes.error) throw ordersRes.error;
            setOrders(ordersRes.data as Order[]);

            if (sellOrdersRes.error) throw sellOrdersRes.error;
            setSellOrders(sellOrdersRes.data as SellOrder[]);

            if (l1AgentsRes.error) throw l1AgentsRes.error;
            setL1Agents(l1AgentsRes.data as UserProfile[]);

        } catch (error: any) {
            console.error("Error fetching user details: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load user data.' });
        } finally {
            setLoading(false);
        }
    }, [userId, toast]);

    useEffect(() => {
        fetchData();
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        }
        const adminPhone = getCookie('admin-phone');
        if (adminPhone === '9060873927') {
            setIsMasterAdmin(true);
        }
    }, [fetchData]);
    
    const stats = React.useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
        const completedBuyOrders = orders?.filter(o => o.status === 'completed') || [];
        const completedSellOrders = sellOrders?.filter(o => o.status === 'completed') || [];
    
        const totalBuyAmount = completedBuyOrders.reduce((acc, order) => acc + order.amount, 0);
        const totalBuyCount = completedBuyOrders.length;
        const totalSellAmount = completedSellOrders.reduce((acc, order) => acc + order.amount, 0);
        const totalSellCount = completedSellOrders.length;
    
        const todayBuyOrders = completedBuyOrders.filter(o => o.createdAt && new Date(o.createdAt) >= startOfToday);
        const todayBuyAmount = todayBuyOrders.reduce((acc, order) => acc + order.amount, 0);
        const todayBuyCount = todayBuyOrders.length;
    
        const todaySellOrders = completedSellOrders.filter(o => o.completedAt && new Date(o.completedAt) >= startOfToday);
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

    if (!user) {
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
                            <AvatarImage src={defaultAvatarUrl} alt={user.displayName} />
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
                         {isMasterAdmin ? (
                            <BalanceActionDialog userId={userId} currentBalance={Number(user.balance) || 0} onUpdate={fetchData} />
                         ) : (
                            <Button disabled>Manage Balance (Master only)</Button>
                         )}
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
                         <HoldBalanceActionDialog userId={userId} currentBalance={Number(user.balance) || 0} currentHoldBalance={Number(user.holdBalance) || 0} onUpdate={fetchData} />
                    </CardFooter>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invite Stats</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 rounded-lg bg-purple-100 p-4">
                        <div className="rounded-full bg-purple-200 p-3">
                            <Users className="h-6 w-6 text-purple-700" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-purple-800">Invited Users</p>
                            {loading ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-2xl font-bold text-purple-900">{l1Agents?.length || 0}</p>}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href={`/admin/invites/${userId}`}>View Invites</Link>
                    </Button>
                </CardFooter>
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
                            {loading ? (
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
                                    <TableCell className="text-right font-mono text-xs">{new Date(order.createdAt).toLocaleString()}</TableCell>
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
                            {loading ? (
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
                                    <TableCell className="text-right font-mono text-xs">{new Date(order.createdAt).toLocaleString()}</TableCell>
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
