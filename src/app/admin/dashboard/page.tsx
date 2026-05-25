
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Users, LayoutDashboard, ShieldCheck, 
  Menu, X, TrendingDown, CheckCircle2, Server, 
  Edit3, Eye, Wallet, Check, RefreshCw,
  Search, ImageIcon, User as UserIcon,
  Clock, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy, where, doc, setDoc, collectionGroup, runTransaction, serverTimestamp, getDocs, limit, addDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Loader } from '@/components/ui/loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
    const [adminId, setAdminId] = useState<string>('SYSTEM');
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        const sessionStr = localStorage.getItem('flex_admin_session');
        if (!sessionStr) { router.replace('/admin/key'); return; }
        
        try {
            const session = JSON.parse(sessionStr);
            if (!session || !session.authenticated || !ALLOWED_ADMINS.includes(session.masterId) || session.expires < Date.now()) {
                localStorage.removeItem('flex_admin_session');
                router.replace('/admin/key');
            } else {
                setAdminId(session.masterId);
            }
        } catch (e) {
            localStorage.removeItem('flex_admin_session');
            router.replace('/admin/key');
        }
    }, [router]);

    const fetchUsers = useCallback(async () => {
        if (!firestore) return;
        setUsersLoading(true);
        try {
            const q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(250));
            const snap = await getDocs(q);
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setUsersLoading(false);
        }
    }, [firestore]);

    const fetchConfirmations = useCallback(async () => {
        if (!firestore) return;
        try {
            const buyOrdersQuery = query(
                collectionGroup(firestore, 'orders'), 
                where('status', '==', 'pending_confirmation'), 
                limit(100)
            );
            const snap = await getDocs(buyOrdersQuery);
            const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });
            setPendingBuyOrders(sorted);
        } catch (e) {}
    }, [firestore]);

    useEffect(() => {
        if (!firestore) return;
        
        fetchUsers();
        fetchConfirmations();

        const unsubSell = onSnapshot(query(collection(firestore, 'sellOrders'), where('status', 'in', ['pending', 'partially_filled', 'processing']), limit(100)), (snap) => {
            setSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubPM = onSnapshot(collection(firestore, 'paymentMethods'), (snap) => {
            setPaymentMethods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubSell(); unsubPM(); };
    }, [firestore, fetchUsers, fetchConfirmations]);

    const filteredUsers = useMemo(() => {
        const s = userSearch.toLowerCase();
        return allUsers.filter(u => u.numericId?.includes(s) || u.phoneNumber?.includes(s) || u.displayName?.toLowerCase().includes(s));
    }, [allUsers, userSearch]);

    const filteredSellOrders = useMemo(() => {
        const s = sellSearch.toLowerCase();
        return sellOrders.filter(o => o.userNumericId?.includes(s) || o.orderId?.toLowerCase().includes(s));
    }, [sellOrders, sellSearch]);

    const filteredConfirmOrders = useMemo(() => {
        const s = confirmSearch.toLowerCase();
        return pendingBuyOrders.filter(o => o.userNumericId?.includes(s) || o.utr?.toLowerCase().includes(s) || o.amount?.toString().includes(s));
    }, [pendingBuyOrders, confirmSearch]);

    const handleLogout = () => {
        localStorage.removeItem('flex_admin_session');
        router.replace('/admin/key');
    };

    const handleApproveBuy = async (order: any) => {
        if (!firestore || isActionLoading) return;
        setIsActionLoading(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const buyerRef = doc(firestore, 'users', order.userId);
                const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
                
                const buyerSnap = await transaction.get(buyerRef);
                const currentOrderSnap = await transaction.get(orderRef);

                if (!buyerSnap.exists()) throw new Error("Buyer missing");
                if (currentOrderSnap.data()?.status === 'completed') throw new Error("Already Approved");

                const buyerData = buyerSnap.data();
                let l1Ref = null, l1Snap = null, l2Ref = null, l2Snap = null;

                if (buyerData.inviterUid) {
                    l1Ref = doc(firestore, 'users', buyerData.inviterUid);
                    l1Snap = await transaction.get(l1Ref);
                    if (l1Snap.exists() && l1Snap.data().inviterUid) {
                        l2Ref = doc(firestore, 'users', l1Snap.data().inviterUid);
                        l2Snap = await transaction.get(l2Ref);
                    }
                }

                let sellOrderRef = null, sellerProfileRef = null, sellSnap = null, sellerSnap = null;
                if (order.matchedSellOrderId && order.sellerId && !['ADMIN', 'SYSTEM_VAULT'].includes(order.sellerId)) {
                    sellOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    sellerProfileRef = doc(firestore, 'users', order.sellerId);
                    sellSnap = await transaction.get(sellOrderRef);
                    sellerSnap = await transaction.get(sellerProfileRef);
                }

                // WRITES
                transaction.update(buyerRef, { balance: (buyerData.balance || 0) + order.amount });
                transaction.update(orderRef, { status: 'completed', completedAt: serverTimestamp(), approvedBy: adminId });
                
                const purchaseAmount = order.baseAmount || order.amount;
                if (l1Ref && l1Snap?.exists()) {
                    const bonus = purchaseAmount * 0.01;
                    transaction.update(l1Ref, { balance: (l1Snap.data().balance || 0) + bonus });
                    transaction.set(doc(collection(firestore, 'users', l1Ref.id, 'transactions')), {
                        userId: l1Ref.id, amount: bonus, type: 'team_bonus', description: `L1 Commission: Buyer ${buyerData.numericId}`, createdAt: serverTimestamp(), orderId: `C1_${order.id}`
                    });
                }
                if (l2Ref && l2Snap?.exists()) {
                    const bonus = purchaseAmount * 0.008;
                    transaction.update(l2Ref, { balance: (l2Snap.data().balance || 0) + bonus });
                    transaction.set(doc(collection(firestore, 'users', l2Ref.id, 'transactions')), {
                        userId: l2Ref.id, amount: bonus, type: 'team_bonus', description: `L2 Commission: Buyer ${buyerData.numericId}`, createdAt: serverTimestamp(), orderId: `C2_${order.id}`
                    });
                }

                if (sellSnap?.exists()) {
                    const matches = (sellSnap.data().matchedBuyOrders || []).map((m: any) => m.buyOrderId === order.id ? { ...m, status: 'completed' } : m);
                    transaction.update(sellOrderRef!, { matchedBuyOrders: matches, status: matches.every((m: any) => m.status === 'completed') ? 'completed' : 'processing' });
                }
                if (sellerSnap?.exists()) {
                    transaction.update(sellerProfileRef!, { holdBalance: Math.max(0, (sellerSnap.data().holdBalance || 0) - purchaseAmount) });
                }
            });
            toast({ title: "Approved" });
            fetchConfirmations();
        } catch (e: any) { 
            toast({ variant: "destructive", title: "Failed", description: e.message }); 
        } finally { setIsActionLoading(false); }
    };

    const handleRejectBuy = async (order: any) => {
        if (!firestore || isActionLoading) return;
        setIsActionLoading(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
                transaction.update(orderRef, { status: 'failed', rejectionReason: 'Invalid proof', rejectedBy: adminId, rejectedAt: serverTimestamp() });
                
                if (order.matchedSellOrderId) {
                    const sRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    const sSnap = await transaction.get(sRef);
                    if (sSnap.exists()) {
                        const matches = (sSnap.data().matchedBuyOrders || []).filter((m: any) => m.buyOrderId !== order.id);
                        transaction.update(sRef, { remainingAmount: (sSnap.data().remainingAmount || 0) + (order.baseAmount || order.amount), matchedBuyOrders: matches, status: 'partially_filled' });
                    }
                }
            });
            toast({ title: "Rejected" });
            fetchConfirmations();
        } catch (e: any) { toast({ variant: "destructive", title: "Failed" }); } finally { setIsActionLoading(false); }
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
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search UID, Name..." 
                                        className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" 
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                    />
                                </div>
                                <Button onClick={fetchUsers} size="icon" variant="outline" className="rounded-xl h-11 w-11"><RefreshCw className={cn("h-4 w-4", usersLoading && "animate-spin")} /></Button>
                            </div>
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="font-black text-[10px] uppercase pl-6 py-4">UID</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase">User Info</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase">Balance</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.map(u => (
                                                <TableRow key={u.id}>
                                                    <TableCell className="font-mono text-xs font-black text-blue-600 pl-6">{u.numericId}</TableCell>
                                                    <TableCell><div className="flex flex-col"><span className="font-bold text-xs">{u.displayName}</span><span className="text-[9px] text-slate-400">+91 {u.phoneNumber}</span></div></TableCell>
                                                    <TableCell className="font-black text-xs">₹{u.balance?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right pr-6"><Button asChild size="sm" variant="ghost" className="h-8 w-8"><Link href={`/admin/users/${u.id}`}><Eye className="h-4 w-4" /></Link></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="confirm" className="space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search UTR, UID..." 
                                        className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" 
                                        value={confirmSearch}
                                        onChange={e => setConfirmSearch(e.target.value)}
                                    />
                                </div>
                                <Button onClick={fetchConfirmations} size="icon" variant="outline" className="rounded-xl h-11 w-11"><RefreshCw className="h-4 w-4" /></Button>
                            </div>

                             <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase pl-6 py-4">Buyer & Amount</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">App</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">UTR</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredConfirmOrders.map(o => (
                                                <TableRow key={o.id}>
                                                    <TableCell className="pl-6 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-blue-600 text-[11px]">UID: {o.userNumericId}</span>
                                                            <span className="font-black text-slate-900 text-lg">₹{o.amount.toFixed(2)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {o.paymentProvider && providerLogos[o.paymentProvider] && <Image src={providerLogos[o.paymentProvider]} alt="" width={20} height={20} className="object-contain" />}
                                                            <span className="text-[10px] font-black text-slate-600 uppercase">{o.paymentProvider || 'UPI'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><span className="font-mono text-[11px] font-black text-primary">{o.utr}</span></TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Dialog>
                                                            <DialogTrigger asChild><Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black rounded-xl">REVIEW</Button></DialogTrigger>
                                                            <DialogContent className="max-w-3xl bg-white rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
                                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                                    <div className="bg-slate-900 p-6 flex flex-col items-center justify-center min-h-[300px]">
                                                                        {o.screenshotURL ? (
                                                                            <div className="relative w-full aspect-[3/4] max-h-[500px] shadow-2xl rounded-2xl overflow-hidden">
                                                                                 <Image src={o.screenshotURL} alt="Proof" fill className="object-contain" unoptimized />
                                                                            </div>
                                                                        ) : <div className="text-white/20 uppercase font-black text-xs">No Image</div>}
                                                                    </div>
                                                                    <div className="p-8 space-y-6">
                                                                        <DialogHeader><DialogTitle className="text-2xl font-black">Review Assets</DialogTitle></DialogHeader>
                                                                        <div className="space-y-4">
                                                                            <div className="p-4 bg-slate-50 rounded-2xl border">
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">UID</p><p className="text-sm font-black text-blue-600">{o.userNumericId}</p></div>
                                                                                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">Amount</p><p className="text-sm font-black">₹{o.amount.toFixed(2)}</p></div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="bg-slate-100 p-3 rounded-xl font-mono text-xs font-black">{o.utr}</div>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-3 pt-4">
                                                                            <Button onClick={() => handleRejectBuy(o)} variant="outline" className="h-12 rounded-2xl font-black text-[11px] text-red-500" disabled={isActionLoading}>REJECT</Button>
                                                                            <Button onClick={() => handleApproveBuy(o)} className="h-12 bg-blue-600 text-white rounded-2xl font-black text-[11px]" disabled={isActionLoading}>APPROVE</Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="server" className="space-y-6">
                            <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
                                <p className="text-slate-400 font-bold text-sm">System Payment Master IDs are configured here.</p>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    )
}
