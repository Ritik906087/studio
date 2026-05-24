
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Users, LayoutDashboard, ShieldCheck, Activity, 
  Menu, X, TrendingDown, CheckCircle2, Server, 
  Edit3, Eye, Wallet, Check, RefreshCw,
  ExternalLink, Ban, BadgeCheck, AlertTriangle, HelpCircle, Search, ImageIcon
} from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy, where, doc, setDoc, collectionGroup, runTransaction, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ALLOWED_ADMINS = ['9955557336', '9060873927'];

const providerLogos: Record<string, string> = {
  PhonePe: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(4).png",
  Paytm: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(5).png",
  MobiKwik: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png",
  Freecharge: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(3).png",
  Airtel: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(2).png",
  Binance: "https://cdn-icons-png.flaticon.com/128/6682/6682016.png",
  TrustWallet: "https://cdn-icons-png.flaticon.com/128/11488/11488057.png"
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Data States
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [sellOrders, setSellOrders] = useState<any[]>([]);
    const [pendingBuyOrders, setPendingBuyOrders] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    
    // Search States
    const [userSearch, setUserSearch] = useState('');
    const [sellSearch, setSellSearch] = useState('');
    const [confirmSearch, setConfirmSearch] = useState('');

    const [editingPayment, setEditingPayment] = useState<string | null>(null);
    const [indexError, setIndexError] = useState<string | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem('flex_admin_session');
        if (!sessionStr) { router.replace('/admin/key'); return; }
        const session = JSON.parse(sessionStr);
        if (!session.authenticated || !ALLOWED_ADMINS.includes(session.masterId) || session.expires < Date.now()) {
            localStorage.removeItem('flex_admin_session');
            router.replace('/admin/key');
        }
    }, [router]);

    const fetchUsers = useCallback(async () => {
        if (!firestore) return;
        setUsersLoading(true);
        try {
            const q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(200));
            const snap = await getDocs(q);
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setUsersLoading(false);
        }
    }, [firestore]);

    useEffect(() => {
        if (!firestore) return;
        
        fetchUsers();

        const unsubSell = onSnapshot(query(collection(firestore, 'sellOrders'), where('status', 'in', ['pending', 'partially_filled', 'processing']), limit(100)), (snap) => {
            setSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const buyOrdersQuery = query(
            collectionGroup(firestore, 'orders'), 
            where('status', '==', 'pending_confirmation'), 
            limit(100)
        );

        const unsubBuy = onSnapshot(buyOrdersQuery, (snap) => {
            const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });
            setPendingBuyOrders(sorted);
            setIndexError(null);
        }, (error: any) => {
            if (error.code === 'failed-precondition') setIndexError(error.message);
        });
        
        const unsubPM = onSnapshot(collection(firestore, 'paymentMethods'), (snap) => {
            setPaymentMethods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubSell(); unsubBuy(); unsubPM(); };
    }, [firestore, fetchUsers]);

    // Computed Filtered Lists
    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => 
            u.numericId?.includes(userSearch) || 
            u.phoneNumber?.includes(userSearch) || 
            u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
        );
    }, [allUsers, userSearch]);

    const filteredSellOrders = useMemo(() => {
        return sellOrders.filter(o => 
            o.userNumericId?.includes(sellSearch) || 
            o.userPhoneNumber?.includes(sellSearch) ||
            o.orderId?.includes(sellSearch)
        );
    }, [sellOrders, sellSearch]);

    const filteredConfirmOrders = useMemo(() => {
        return pendingBuyOrders.filter(o => 
            o.userNumericId?.includes(confirmSearch) || 
            o.utr?.includes(confirmSearch) ||
            o.orderId?.includes(confirmSearch)
        );
    }, [pendingBuyOrders, confirmSearch]);

    const handleLogout = () => {
        localStorage.removeItem('flex_admin_session');
        router.replace('/admin/key');
    };

    const handleUpdateAdminPayment = async (type: string, data: any) => {
        if (!firestore) return;
        try {
            await setDoc(doc(firestore, 'paymentMethods', type), { ...data, type }, { merge: true });
            toast({ title: "Server Updated" });
            setEditingPayment(null);
        } catch (e: any) { toast({ variant: 'destructive', title: "Update Failed" }); }
    };

    const handleApproveBuy = async (order: any) => {
        if (!firestore) return;
        try {
            await runTransaction(firestore, async (transaction) => {
                // 1. ALL READS FIRST
                const buyerRef = doc(firestore, 'users', order.userId);
                const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
                const buyerSnap = await transaction.get(buyerRef);
                const buyerOrderSnap = await transaction.get(orderRef);
                
                let sellSnap = null;
                let sellerSnap = null;
                let sellOrderRef = null;
                let sellerProfileRef = null;
                let sellerUserSellRef = null;

                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'ADMIN') {
                    sellOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    sellerProfileRef = doc(firestore, 'users', order.sellerId);
                    sellerUserSellRef = doc(firestore, 'users', order.sellerId, 'sellOrders', order.matchedSellOrderId);
                    
                    sellSnap = await transaction.get(sellOrderRef);
                    sellerSnap = await transaction.get(sellerProfileRef);
                }

                // 2. ALL WRITES SECOND
                if (!buyerSnap.exists()) throw new Error("Buyer profile missing");
                
                const currentBuyerBalance = buyerSnap.data()?.balance || 0;
                transaction.update(buyerRef, { balance: currentBuyerBalance + order.amount });
                transaction.update(orderRef, { status: 'completed', completedAt: serverTimestamp() });
                
                if (sellSnap && sellSnap.exists()) {
                    const sellData = sellSnap.data();
                    const updatedMatches = (sellData.matchedBuyOrders || []).map((m: any) => 
                        m.buyOrderId === order.id ? { ...m, status: 'completed' } : m
                    );
                    const allCompleted = updatedMatches.every((m: any) => m.status === 'completed') && sellData.remainingAmount === 0;
                    
                    transaction.update(sellOrderRef!, { 
                        matchedBuyOrders: updatedMatches,
                        status: allCompleted ? 'completed' : 'processing'
                    });
                    
                    if (sellerUserSellRef) {
                        transaction.update(sellerUserSellRef, { 
                            matchedBuyOrders: updatedMatches,
                            status: allCompleted ? 'completed' : 'processing'
                        });
                    }
                }

                if (sellerSnap && sellerSnap.exists()) {
                    const currentSellerHold = sellerSnap.data()?.holdBalance || 0;
                    transaction.update(sellerProfileRef!, { holdBalance: Math.max(0, currentSellerHold - order.baseAmount) });
                }
            });
            toast({ title: "Order Approved", description: `Assets credited to ${order.userNumericId}` });
        } catch (e: any) { 
            console.error("Approval error:", e);
            toast({ variant: "destructive", title: "Approval Failed", description: e.message }); 
        }
    };

    const handleRejectBuy = async (order: any) => {
        if (!firestore) return;
        try {
            await runTransaction(firestore, async (transaction) => {
                // 1. ALL READS FIRST
                let sellSnap = null;
                let sellOrderRef = null;
                let sellerUserSellRef = null;

                if (order.matchedSellOrderId && order.sellerId && order.sellerId !== 'ADMIN') {
                    sellOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    sellerUserSellRef = doc(firestore, 'users', order.sellerId, 'sellOrders', order.matchedSellOrderId);
                    sellSnap = await transaction.get(sellOrderRef);
                }

                // 2. ALL WRITES SECOND
                const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
                transaction.update(orderRef, { status: 'failed', rejectionReason: 'Admin Rejected Proof' });
                
                if (sellSnap && sellSnap.exists()) {
                    const sellData = sellSnap.data();
                    const currentRemaining = sellData.remainingAmount || 0;
                    const updatedMatches = (sellData.matchedBuyOrders || []).filter((m: any) => m.buyOrderId !== order.id);
                    
                    transaction.update(sellOrderRef!, { 
                        remainingAmount: currentRemaining + order.baseAmount,
                        status: 'partially_filled',
                        matchedBuyOrders: updatedMatches
                    });
                    
                    if (sellerUserSellRef) {
                        transaction.update(sellerUserSellRef, { 
                            remainingAmount: currentRemaining + order.baseAmount,
                            status: 'partially_filled',
                            matchedBuyOrders: updatedMatches
                        });
                    }
                }
            });
            toast({ title: "Order Rejected" });
        } catch (e: any) { 
            console.error("Rejection error:", e);
            toast({ variant: "destructive", title: "Rejection Failed", description: e.message }); 
        }
    };

    const totalBalance = allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);

    return (
        <div className="flex min-h-screen w-full flex-col bg-[#F8FAFC]">
            <header className="sticky top-0 flex h-16 md:h-20 items-center gap-4 border-b bg-white px-4 md:px-8 z-50 justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X /> : <Menu />}
                    </Button>
                    <Logo className="text-xl" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-[10px] font-black text-blue-700 uppercase">Enterprise Console</span>
                    </div>
                    <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-xl font-bold h-9">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                </div>
            </header>

            <div className="flex flex-1">
                <aside className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r shadow-xl transition-transform duration-300 md:relative md:translate-x-0 md:shadow-none p-4 mt-16 md:mt-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <nav className="space-y-1">
                        {[
                          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                          { id: 'users', label: 'User Registry', icon: Users },
                          { id: 'withdrawal', label: 'Withdrawal', icon: TrendingDown },
                          { id: 'confirm', label: 'Confirmation', icon: CheckCircle2 },
                          { id: 'server', label: 'Payment Server', icon: Server },
                        ].map(item => (
                          <button 
                            key={item.id}
                            className={cn(
                                "flex w-full items-center gap-3 px-4 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                                activeTab === item.id ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-400 hover:bg-slate-50"
                            )}
                            onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                          >
                            <item.icon className="h-5 w-5" /> {item.label}
                          </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 p-4 md:p-8 max-w-full overflow-x-hidden">
                    <Tabs value={activeTab} className="w-full">
                        
                        <TabsContent value="dashboard" className="space-y-6">
                            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                                <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Members</p>
                                    <div className="text-3xl font-black text-slate-900 mt-2">{allUsers.length}</div>
                                </Card>
                                <Card className="border-none shadow-sm rounded-3xl p-6 bg-slate-900 text-white">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Pool</p>
                                    <div className="text-3xl font-black text-primary mt-2">₹{totalBalance.toLocaleString()}</div>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="users" className="space-y-4">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search UID or Mobile..." 
                                    className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" 
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                            </div>
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <div className="overflow-x-auto">
                                    {usersLoading ? (
                                        <div className="p-20 text-center"><Loader size="sm" /></div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow className="border-none">
                                                    <TableHead className="font-black text-[10px] uppercase pl-6 py-4">UID</TableHead>
                                                    <TableHead className="font-black text-[10px] uppercase">User</TableHead>
                                                    <TableHead className="font-black text-[10px] uppercase">Balance</TableHead>
                                                    <TableHead className="font-black text-[10px] uppercase text-right pr-6">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredUsers.map(u => (
                                                    <TableRow key={u.id} className="border-slate-50">
                                                        <TableCell className="font-mono text-xs font-black text-blue-600 pl-6">{u.numericId}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-xs">{u.displayName}</span>
                                                                <span className="text-[9px] text-slate-400">+91 {u.phoneNumber}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-black text-xs text-slate-700">₹{u.balance?.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                                                                <Link href={`/admin/users/${u.id}`}><Eye className="h-4 w-4" /></Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="withdrawal" className="space-y-4">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search Seller UID/Mobile..." 
                                    className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" 
                                    value={sellSearch}
                                    onChange={e => setSellSearch(e.target.value)}
                                />
                            </div>
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase pl-6">UID / Mobile</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Method</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSellOrders.map(o => (
                                                <TableRow key={o.id}>
                                                    <TableCell className="pl-6">
                                                        <p className="font-black text-[11px] text-blue-600">{o.userNumericId}</p>
                                                        <p className="text-[9px] text-slate-400">+91 {o.userPhoneNumber}</p>
                                                    </TableCell>
                                                    <TableCell className="font-black text-xs">₹{o.amount}</TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-[9px] font-black">{o.withdrawalMethod?.upiId}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase">{o.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="confirm" className="space-y-4">
                             <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search Buyer UID or UTR..." 
                                    className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" 
                                    value={confirmSearch}
                                    onChange={e => setConfirmSearch(e.target.value)}
                                />
                            </div>

                             {indexError && (
                                <Alert variant="destructive" className="rounded-2xl border-dashed">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle className="font-black text-xs uppercase">Firestore Index Required</AlertTitle>
                                    <AlertDescription className="text-[10px] font-medium mt-1">
                                        P2P matching needs a collection-group index. 
                                        <a href={`https://console.firebase.google.com/v1/r/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-7114417830-300d7'}/firestore/indexes?create_exemption=Clpwcm9qZWN0cy9zdHVkaW8tNzExNDQxNzgzMC0zMDBkNy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2ZpZWxkcy9zdGF0dXMQAhoKCgZzdGF0dXMQAQ`} target="_blank" className="ml-1 underline font-black text-blue-600">Click here to enable</a>.
                                    </AlertDescription>
                                </Alert>
                             )}

                             <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase pl-6 py-4">Buyer & Amount</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Payment App</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">UTR & Proof</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Recipient (Seller)</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-right pr-6">Decision</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredConfirmOrders.map(o => (
                                                <TableRow key={o.id} className="group hover:bg-slate-50/50">
                                                    <TableCell className="pl-6 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-blue-600 text-[11px] uppercase tracking-wider">UID: {o.userNumericId || 'N/A'}</span>
                                                            <span className="font-black text-slate-900 text-lg tabular-nums">₹{o.amount.toFixed(2)}</span>
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase">ID: {o.orderId}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {o.paymentProvider && providerLogos[o.paymentProvider] ? (
                                                                <div className="h-8 w-8 rounded-lg bg-white border shadow-sm p-1 flex items-center justify-center">
                                                                    <Image src={providerLogos[o.paymentProvider]} alt="" width={20} height={20} className="object-contain" />
                                                                </div>
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"><Wallet className="h-4 w-4 text-slate-400" /></div>
                                                            )}
                                                            <span className="text-[10px] font-black text-slate-600 uppercase">{o.paymentProvider || 'UPI'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-2">
                                                            <span className="font-mono text-[11px] font-black text-primary border-b border-primary/20 pb-0.5 w-fit">{o.utr}</span>
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <button className="flex items-center gap-1.5 text-[9px] text-blue-600 font-black uppercase hover:bg-blue-50 w-fit px-2 py-1 rounded-md transition-colors">
                                                                        <ImageIcon className="h-3 w-3" /> VIEW PROOF
                                                                    </button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl bg-white rounded-[32px] p-0 overflow-hidden border-none">
                                                                    <DialogHeader className="p-6 bg-slate-50 border-b">
                                                                        <DialogTitle className="text-sm font-black uppercase flex items-center gap-2">
                                                                            <ShieldCheck className="h-4 w-4 text-blue-600" /> Payment Evidence: UID {o.userNumericId}
                                                                        </DialogTitle>
                                                                    </DialogHeader>
                                                                    <div className="p-8 bg-white flex justify-center items-center">
                                                                        {o.screenshotURL ? (
                                                                            <div className="relative w-full aspect-[3/4] max-h-[60vh]">
                                                                                 <Image src={o.screenshotURL} alt="Proof" fill className="object-contain rounded-xl" unoptimized />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="h-64 w-full bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                                                                                <ImageIcon className="h-12 w-12 mb-2" />
                                                                                <p className="font-black text-[10px] uppercase">No Screenshot Provided</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="p-4 bg-slate-50 border-t flex justify-between items-center px-8">
                                                                        <p className="font-mono text-xs font-black text-slate-400">UTR: {o.utr}</p>
                                                                        <p className="font-black text-slate-800">₹{o.amount.toFixed(2)}</p>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase">Seller: {o.sellerId === 'ADMIN' ? 'MASTER' : o.sellerId}</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="font-mono text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{o.sellerWithdrawalDetails?.upiId || 'SYSTEM'}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleApproveBuy(o)} className="bg-green-600 hover:bg-green-700 h-9 px-4 text-[9px] font-black rounded-xl shadow-lg shadow-green-100 text-white">
                                                                APPROVE
                                                            </button>
                                                            <button onClick={() => handleRejectBuy(o)} className="bg-red-500 hover:bg-red-600 h-9 px-4 text-[9px] font-black rounded-xl text-white">
                                                                REJECT
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {filteredConfirmOrders.length === 0 && (
                                        <div className="p-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-widest">Zero Matches Found</div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="server" className="space-y-6">
                            <Tabs defaultValue="bank" className="w-full">
                                <TabsList className="bg-white p-1 rounded-2xl border-none shadow-sm inline-flex mb-4">
                                    <TabsTrigger value="bank" className="rounded-xl px-6 font-black text-[10px] uppercase">Bank Link</TabsTrigger>
                                    <TabsTrigger value="upi" className="rounded-xl px-6 font-black text-[10px] uppercase">Master UPI</TabsTrigger>
                                    <TabsTrigger value="usdt" className="rounded-xl px-6 font-black text-[10px] uppercase">Crypto USDT</TabsTrigger>
                                </TabsList>
                                {['bank', 'upi', 'usdt'].map(type => {
                                    const method = paymentMethods.find(m => m.type === type) || { type };
                                    const isEditing = editingPayment === type;
                                    return (
                                        <TabsContent key={type} value={type}>
                                            <Card className="border-none shadow-sm rounded-3xl bg-white max-w-xl overflow-hidden">
                                                <CardHeader className="bg-slate-50 p-4 border-b flex flex-row justify-between items-center">
                                                    <CardTitle className="text-[10px] font-black uppercase text-slate-500">{type} Master Connection</CardTitle>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingPayment(isEditing ? null : type)}><Edit3 className="h-4 w-4" /></Button>
                                                </CardHeader>
                                                <CardContent className="p-8">
                                                    {isEditing ? (
                                                        <div className="space-y-4">
                                                            {type === 'bank' && <><Input placeholder="Bank Name" defaultValue={method.bankName} onChange={e => method.bankName = e.target.value} /><Input placeholder="Holder Name" defaultValue={method.accountHolderName} onChange={e => method.accountHolderName = e.target.value} /><Input placeholder="Account Number" defaultValue={method.accountNumber} onChange={e => method.accountNumber = e.target.value} /><Input placeholder="IFSC Code" defaultValue={method.ifscCode} onChange={e => method.ifscCode = e.target.value} /></>}
                                                            {type === 'upi' && <><Input placeholder="Master UPI ID" defaultValue={method.upiId} onChange={e => method.upiId = e.target.value} /><Input placeholder="Holder Name" defaultValue={method.upiHolderName} onChange={e => method.upiHolderName = e.target.value} /></>}
                                                            {type === 'usdt' && <Input placeholder="TRC20 Wallet" defaultValue={method.usdtWalletAddress} onChange={e => method.usdtWalletAddress = e.target.value} />}
                                                            <div className="pt-4 flex gap-3">
                                                                <Button variant="outline" className="flex-1 rounded-xl font-black text-[10px]" onClick={() => setEditingPayment(null)}>CANCEL</Button>
                                                                <Button className="flex-1 bg-blue-600 rounded-xl font-black text-[10px]" onClick={() => handleUpdateAdminPayment(type, method)}>SAVE</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-6">
                                                            <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center border"><Check className="h-8 w-8 text-primary" /></div>
                                                            <div><p className="text-xl font-black text-slate-800">{method.upiId || method.accountNumber || method.usdtWalletAddress || "Not Linked"}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{method.bankName || method.upiHolderName || "Offline"}</p></div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    );
                                })}
                            </Tabs>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    )
}
