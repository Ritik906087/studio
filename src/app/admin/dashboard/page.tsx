
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut, Users, LayoutDashboard, Wallet, Eye, Search, Landmark, Banknote, Trash2, Clock, History, CheckCircle, Download, XCircle, MessageSquare, Send, Paperclip, X, FileClock, AlertCircle, FileWarning, MessageCircleQuestion, RefreshCw, Copy, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp, runTransaction, where, limit } from 'firebase/firestore';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

type UserProfile = {
    id: string;
    displayName: string;
    numericId: string;
    balance: number;
    holdBalance: number;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
    inviterUid?: string;
};

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
    userId: string;
    orderId: string;
    amount: number;
    status: 'pending_confirmation' | 'in_applied' | 'completed' | 'failed';
    submittedAt?: any;
    utr?: string;
    screenshotURL?: string;
    createdAt: any;
    displayName?: string;
    userNumericId?: string;
    paymentType?: 'bank' | 'upi' | 'usdt' | 'p2p_upi' | 'p2p_bank';
    paymentProvider?: string;
    adminPaymentMethodId?: string;
};

type SellOrder = {
    id: string;
    userId: string;
    userNumericId: string;
    userPhoneNumber: string;
    orderId: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    withdrawalMethod: { 
        type: 'upi' | 'bank';
        name: string;
        upiId?: string;
        bankName?: string;
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
    };
    createdAt: any;
}

const CountdownTimer = ({ expiryTimestamp, className }: { expiryTimestamp: string, className?: string }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const expiryTime = new Date(expiryTimestamp).getTime();
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = expiryTime - now;
            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("Expired");
                return;
            }
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [expiryTimestamp]);

    return (
        <div className={cn("flex items-center gap-1 text-xs font-mono", timeLeft === "Expired" ? "text-red-500" : "text-yellow-600", className)}>
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
        </div>
    );
};

function AdminDashboard() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);

    useEffect(() => {
        if (!firestore) return;

        // Listen for all users
        const unsubUsers = onSnapshot(collection(firestore, 'users'), (snap) => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
            setLoading(false);
        });

        // Listen for all orders (Collection Group)
        const unsubOrders = onSnapshot(query(collection(firestore, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
            // This is just a placeholder, in a real scenario you'd use collectionGroup or a central orders collection
        });

        // Check master admin from cookie (prototype logic)
        const adminPhone = document.cookie.split('; ').find(row => row.startsWith('admin-phone='))?.split('=')[1];
        if (adminPhone === '9060873927') setIsMasterAdmin(true);

        return () => {
            unsubUsers();
        };
    }, [firestore]);

    const handleLogout = () => {
        document.cookie = 'admin-phone=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/admin/login');
    };

    const totalUsers = allUsers.length;
    const totalBalance = allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);

    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10 justify-between">
                <Logo className="text-2xl" />
                <Button onClick={handleLogout} variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Tabs defaultValue="dashboard" className="w-full md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-6">
                    <TabsList className="w-full h-auto flex-row justify-start overflow-x-auto md:flex-col md:items-stretch md:justify-start">
                        <TabsTrigger value="dashboard" className="justify-start p-3"><LayoutDashboard className="mr-2" /> Dashboard</TabsTrigger>
                        <TabsTrigger value="users" className="justify-start p-3"><Users className="mr-2"/> Users</TabsTrigger>
                        <TabsTrigger value="withdrawals" className="justify-start p-3"><Banknote className="mr-2"/> Withdrawals</TabsTrigger>
                        <TabsTrigger value="confirmations" className="justify-start p-3"><FileClock className="mr-2"/> Confirmations</TabsTrigger>
                    </TabsList>
                    <div className="mt-4 md:mt-0">
                        <TabsContent value="dashboard" className="mt-0">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{totalUsers}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total System Balance</CardTitle>
                                        <Wallet className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">₹{totalBalance.toFixed(2)}</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                        <TabsContent value="users" className="mt-0">
                            <Card>
                                <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>UID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Balance</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allUsers.map(u => (
                                                <TableRow key={u.id}>
                                                    <TableCell className="font-mono">{u.numericId}</TableCell>
                                                    <TableCell>{u.displayName}</TableCell>
                                                    <TableCell>₹{u.balance?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button asChild size="sm" variant="outline"><Link href={`/admin/users/${u.id}`}>View</Link></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="withdrawals" className="mt-0">
                            <Card>
                                <CardHeader><CardTitle>Pending Withdrawals</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-8 text-center text-muted-foreground">
                                        Use 'Search by User' to process specific withdrawals in this prototype.
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </main>
        </div>
    )
}

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}
