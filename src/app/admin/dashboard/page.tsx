'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Users, LayoutDashboard, Server, 
  Eye, Wallet, Check, RefreshCw,
  Search, ImageIcon, Clock, ArrowDownLeft, Trash2, Plus, CreditCard, Landmark, Zap,
  Banknote, History, CheckCircle2, X, Menu, ArrowUpRight, Copy, AlertTriangle, ArrowRight, User, ShieldCheck
} from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, collectionGroup, onSnapshot, query, where, doc, runTransaction, serverTimestamp, getDocs, limit, addDoc, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALLOWED_ADMINS = ['9955557336', '9060873927', '7307081891', '9199604613'];
const FULL_ACCESS_ADMINS = ['9955557336', '9060873927'];

export default function AdminDashboardPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [sellOrders, setSellOrders] = useState<any[]>([]);
    const [pendingBuyOrders, setPendingBuyOrders] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    
    const [userSearch, setUserSearch] = useState('');
    const [confirmSearch, setConfirmSearch] = useState('');
    const [withdrawalSearch, setWithdrawalSearch] = useState('');

    const [adminId, setAdminId] = useState<string>('SYSTEM');
    const [isActionLoading, setIsActionLoading] = useState(false);

    const isFullAdmin = useMemo(() => FULL_ACCESS_ADMINS.includes(adminId), [adminId]);

    const [isAddPMOpen, setIsAddPMOpen] = useState(false);
    const [newPM, setNewPM] = useState<any>({ type: 'upi', upiId: '', upiHolderName: '', usdtWalletAddress: '', bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' });

    const totalPool = useMemo(() => {
        return allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);
    }, [allUsers]);

    // --- ROBUST INDEX-FREE AUTO-CLEANUP ---
    const cleanupExpiredOrders = useCallback(async () => {
        if (!firestore) return;
        
        try {
            const now = Date.now();
            const cutoffTime = now - (30 * 60 * 1000); // 30 mins ago

            // Simplified query to avoid composite index
            const q = query(
                collectionGroup(firestore, 'orders'),
                where('status', '==', 'pending_payment')
            );

            const snap = await getDocs(q);
            if (snap.empty) return;

            for (const orderDoc of snap.docs) {
                const data = orderDoc.data();
                const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;

                // Check expiration in memory logic
                if (createdAt > 0 && createdAt < cutoffTime) {
                    const userId = data.userId;
                    
                    await runTransaction(firestore, async (transaction) => {
                        const buyerOrderRef = doc(firestore, 'users', userId, 'orders', orderDoc.id);
                        
                        // Release Seller Hold if it was a P2P match
                        if (data.matchedSellOrderId && data.sellerId && !['SYSTEM_VAULT', 'ADMIN'].includes(data.sellerId)) {
                            const sellerOrderRef = doc(firestore, 'sellOrders', data.matchedSellOrderId);
                            const sellerUserOrderRef = doc(firestore, 'users', data.sellerId, 'sellOrders', data.matchedSellOrderId);

                            const sellerSnap = await transaction.get(sellerOrderRef);
                            if (sellerSnap.exists()) {
                                const sData = sellerSnap.data();
                                const matchedOrders = (sData.matchedBuyOrders || []).filter((m: any) => m.buyOrderId !== orderDoc.id);
                                const restoredAmount = data.baseAmount || data.amount;
                                
                                transaction.update(sellerOrderRef, { 
                                    matchedBuyOrders: matchedOrders,
                                    remainingAmount: (sData.remainingAmount || 0) + restoredAmount,
                                    status: 'partially_filled'
                                });
                                transaction.update(sellerUserOrderRef, { 
                                    matchedBuyOrders: matchedOrders,
                                    remainingAmount: (sData.remainingAmount || 0) + restoredAmount,
                                    status: 'partially_filled'
                                });

                                // Return balance to seller profile
                                const sellerRef = doc(firestore, 'users', data.sellerId);
                                const sellerProfileSnap = await transaction.get(sellerRef);
                                if (sellerProfileSnap.exists()) {
                                    const spData = sellerProfileSnap.data();
                                    transaction.update(sellerRef, {
                                        balance: (spData.balance || 0) + restoredAmount,
                                        holdBalance: Math.max(0, (spData.holdBalance || 0) - restoredAmount)
                                    });
                                }
                            }
                        }

                        transaction.update(buyerOrderRef, {
                            status: 'cancelled',
                            cancellationReason: 'System: 30m Session Timeout',
                            cancelledAt: serverTimestamp()
                        });
                    });
                }
            }
        } catch (e) {
            console.error("Cleanup Protocol Error:", e);
        }
    }, [firestore]);

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

        cleanupExpiredOrders();
        const cleanupInterval = setInterval(cleanupExpiredOrders, 45000); 
        return () => clearInterval(cleanupInterval);
    }, [router, cleanupExpiredOrders]);

    const fetchUsers = useCallback(async () => {
        if (!firestore) return;
        setUsersLoading(true);
        try {
            const snap = await getDocs(collection(firestore, 'users'));
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
            const pendingQuery = query(
                collectionGroup(firestore, 'orders'),
                where('status', '==', 'pending_confirmation')
            );
            const snap = await getDocs(pendingQuery);
            const allPending = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Memory sorting to avoid index requirement
            const sorted = allPending.sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });
            setPendingBuyOrders(sorted);
        } catch (e) {
            console.error("Fetch Confirmations Error:", e);
        }
    }, [firestore]);

    useEffect(() => {
        if (!firestore) return;
        
        fetchUsers();
        fetchConfirmations();

        const unsubSell = onSnapshot(collection(firestore, 'sellOrders'), (snap) => {
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

    const filteredConfirmOrders = useMemo(() => {
        const s = confirmSearch.toLowerCase();
        return pendingBuyOrders.filter(o => 
            o.userNumericId?.includes(s) || 
            o.utr?.toLowerCase().includes(s) || 
            o.amount?.toString().includes(s)
        );
    }, [pendingBuyOrders, confirmSearch]);

    const filteredWithdrawals = useMemo(() => {
        const s = withdrawalSearch.toLowerCase();
        const activeOnly = sellOrders.filter(o => !['completed', 'failed', 'cancelled'].includes(o.status));
        
        return activeOnly.filter(o => 
            o.userNumericId?.includes(s) || 
            o.orderId?.toLowerCase().includes(s) || 
            o.status?.toLowerCase().includes(s)
        );
    }, [sellOrders, withdrawalSearch]);

    const handleLogout = () => {
        localStorage.removeItem('flex_admin_session');
        router.replace('/admin/key');
    };

    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast({ title: "Copied: " + text });
    };

    const handleApproveBuy = async (order: any) => {
        if (!firestore || isActionLoading) return;
        setIsActionLoading(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const buyerRef = doc(firestore, 'users', order.userId);
                const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
                
                const buyerSnap = await transaction.get(buyerRef);
                if (!buyerSnap.exists()) throw new Error("Buyer profile missing");
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

                let sellOrderRef = null, sellOrderSnap = null;
                if (order.matchedSellOrderId) {
                    sellOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    sellOrderSnap = await transaction.get(sellOrderRef);
                }

                let sellerProfileRef = null, sellerProfileSnap = null;
                if (order.sellerId && !['ADMIN', 'SYSTEM_VAULT'].includes(order.sellerId)) {
                    sellerProfileRef = doc(firestore, 'users', order.sellerId);
                    sellerProfileSnap = await transaction.get(sellerProfileRef);
                }

                const purchaseAmount = order.baseAmount || order.amount;

                transaction.update(buyerRef, { balance: (buyerData.balance || 0) + order.amount });
                transaction.update(orderRef, { status: 'completed', completedAt: serverTimestamp(), approvedBy: adminId });
                
                if (l1Snap?.exists() && l1Ref) {
                    const bonus1 = purchaseAmount * 0.01;
                    transaction.update(l1Ref, { balance: (l1Snap.data().balance || 0) + bonus1 });
                    const tx1Ref = doc(collection(firestore, 'users', l1Snap.id, 'transactions'));
                    transaction.set(tx1Ref, {
                        userId: l1Snap.id, amount: bonus1, type: 'team_bonus', description: `L1 Commission: UID ${buyerData.numericId}`, createdAt: serverTimestamp(), orderId: `C1_${order.id}`
                    });

                    if (l2Snap?.exists() && l2Ref) {
                        const bonus2 = purchaseAmount * 0.008;
                        transaction.update(l2Ref, { balance: (l2Snap.data().balance || 0) + bonus2 });
                        const tx2Ref = doc(collection(firestore, 'users', l2Snap.id, 'transactions'));
                        transaction.set(tx2Ref, {
                            userId: l2Snap.id, amount: bonus2, type: 'team_bonus', description: `L2 Commission: UID ${buyerData.numericId}`, createdAt: serverTimestamp(), orderId: `C2_${order.id}`
                        });
                    }
                }

                if (sellOrderSnap?.exists() && sellOrderRef) {
                    const sData = sellOrderSnap.data();
                    const matches = (sData.matchedBuyOrders || []).map((m: any) => 
                        m.buyOrderId === order.id ? { ...m, status: 'completed' } : m
                    );
                    const isAllDone = matches.every((m: any) => ['completed', 'failed', 'cancelled'].includes(m.status)) && sData.remainingAmount === 0;
                    
                    transaction.update(sellOrderRef, { 
                        matchedBuyOrders: matches, 
                        status: isAllDone ? 'completed' : 'processing' 
                    });

                    if (sData.userId) {
                        const userSRef = doc(firestore, 'users', sData.userId, 'sellOrders', sellOrderSnap.id);
                        transaction.update(userSRef, { 
                            matchedBuyOrders: matches, 
                            status: isAllDone ? 'completed' : 'processing' 
                        });
                    }
                }
                
                if (sellerProfileSnap?.exists() && sellerProfileRef) {
                    transaction.update(sellerProfileRef, { 
                        holdBalance: Math.max(0, (sellerProfileSnap.data().holdBalance || 0) - purchaseAmount) 
                    });
                }
            });
            toast({ title: "Approved Successfully" });
            fetchConfirmations();
        } catch (e: any) { 
            toast({ variant: "destructive", title: "Approval Failed", description: e.message }); 
        } finally { setIsActionLoading(false); }
    };

    const handleRejectBuy = async (order: any) => {
        if (!firestore || isActionLoading) return;
        setIsActionLoading(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
                
                let sellOrderRef = null, sellOrderSnap = null;
                if (order.matchedSellOrderId) {
                    sellOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    sellOrderSnap = await transaction.get(sellOrderRef);
                }

                transaction.update(orderRef, { 
                    status: 'failed', 
                    rejectionReason: 'Verification failed or UTR mismatch', 
                    rejectedBy: adminId, 
                    rejectedAt: serverTimestamp() 
                });
                
                if (sellOrderSnap?.exists() && sellOrderRef) {
                    const sData = sellOrderSnap.data();
                    const matches = (sData.matchedBuyOrders || []).filter((m: any) => m.buyOrderId !== order.id);
                    const restoredAmount = order.baseAmount || order.amount;
                    const newRemaining = (sData.remainingAmount || 0) + restoredAmount;
                    
                    transaction.update(sellerOrderRef, { 
                        remainingAmount: newRemaining, 
                        matchedBuyOrders: matches, 
                        status: 'partially_filled' 
                    });

                    if (sData.userId) {
                        const userSRef = doc(firestore, 'users', sData.userId, 'sellOrders', sellOrderSnap.id);
                        transaction.update(userSRef, { 
                            remainingAmount: newRemaining, 
                            matchedBuyOrders: matches, 
                            status: 'partially_filled' 
                        });

                        const sellerRef = doc(firestore, 'users', sData.userId);
                        const sellerProfileSnap = await transaction.get(sellerRef);
                        if (sellerProfileSnap.exists()) {
                            const spData = sellerProfileSnap.data();
                            transaction.update(sellerRef, {
                                balance: (spData.balance || 0) + restoredAmount,
                                holdBalance: Math.max(0, (spData.holdBalance || 0) - restoredAmount)
                            });
                        }
                    }
                }
            });
            toast({ title: "Order Rejected" });
            fetchConfirmations();
        } catch (e: any) { 
            toast({ variant: "destructive", title: "Action Failed", description: e.message }); 
        } finally { setIsActionLoading(false); }
    };

    const handleAddPaymentMethod = async () => {
        if (!firestore || !newPM.type) return;
        setIsActionLoading(true);
        try {
            await addDoc(collection(firestore, 'paymentMethods'), {
                ...newPM,
                createdAt: serverTimestamp()
            });
            toast({ title: "Node Injected" });
            setIsAddPMOpen(false);
            setNewPM({ type: 'upi', upiId: '', upiHolderName: '', usdtWalletAddress: '', bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' });
        } catch (e) { toast({ variant: 'destructive', title: 'Injection Failed' }); }
        finally { setIsActionLoading(false); }
    };

    const handleDeletePaymentMethod = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'paymentMethods', id));
            toast({ title: "Node Terminated" });
        } catch (e) { toast({ variant: 'destructive', title: 'Failed to delete' }); }
    };

    const sidebarItems = useMemo(() => {
        const items = [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'users', label: 'User Registry', icon: Users },
            { id: 'confirm', label: 'Confirmation', icon: CheckCircle2 },
            { id: 'withdrawals', label: 'Withdrawals', icon: Landmark },
        ];
        if (isFullAdmin) items.push({ id: 'server', label: 'Payment Nodes', icon: Server });
        return items;
    }, [isFullAdmin]);

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
                    <div className="hidden sm:flex items-center gap-2 text-xs font-black uppercase text-blue-600">
                        <Zap className="h-4 w-4" /> System: {adminId}
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
                        {sidebarItems.map(item => (
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
                            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Members</p>
                                    <div className="text-3xl font-black text-slate-900 mt-2">{allUsers.length}</div>
                                </Card>
                                <Card className="border-none shadow-sm rounded-3xl p-6 bg-slate-900 text-white">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Pool</p>
                                    <div className="text-3xl font-black text-primary mt-2">₹{totalPool.toLocaleString()}</div>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="users" className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Search UID, Name..." className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                                </div>
                                <Button onClick={fetchUsers} size="icon" variant="outline" className="rounded-xl h-11 w-11"><RefreshCw className={cn("h-4 w-4", usersLoading && "animate-spin")} /></Button>
                            </div>
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow><TableHead className="font-black text-[10px] uppercase pl-6 py-4">Identity</TableHead><TableHead className="font-black text-[10px] uppercase">Balance</TableHead><TableHead className="font-black text-[10px] uppercase text-right pr-6">Action</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="pl-6"><div className="flex flex-col"><div className="flex items-center gap-2"><span className="font-black text-xs text-blue-600">UID: {u.numericId}</span><button onClick={() => handleCopy(u.numericId)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button></div><span className="text-[10px] font-bold text-slate-400">{u.displayName}</span></div></TableCell>
                                                <TableCell className="font-black text-xs">₹{u.balance?.toFixed(2)}</TableCell>
                                                <TableCell className="text-right pr-6"><Button asChild size="sm" variant="ghost" className="h-8 w-8"><Link href={`/admin/users/${u.id}`}><Eye className="h-4 w-4" /></Link></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>

                        <TabsContent value="confirm" className="space-y-4 focus-visible:ring-0 outline-none">
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Search Amount, UTR..." className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" value={confirmSearch} onChange={e => setConfirmSearch(e.target.value)} />
                                </div>
                                <Button onClick={fetchConfirmations} size="icon" variant="outline" className="rounded-xl h-11 w-11"><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid gap-6">
                                {filteredConfirmOrders.map(order => (
                                    <Card key={order.id} className="border-none shadow-sm rounded-[32px] bg-white p-0 overflow-hidden group hover:shadow-md transition-all">
                                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="h-20 w-20" /></div>
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="h-11 w-11 bg-white/10 rounded-[18px] flex items-center justify-center border border-white/5 shadow-inner"><User className="h-6 w-6 text-blue-400" /></div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase text-blue-400/70 tracking-widest mb-0.5">Buyer Passport</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-base font-black tracking-tight">UID: {order.userNumericId}</p>
                                                        <button onClick={() => handleCopy(order.userNumericId)} className="text-white/30 hover:text-white transition-colors"><Copy className="h-3 w-3" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[9px] font-black uppercase tracking-widest py-1 px-3 rounded-full">{order.paymentType?.replace('_', ' ')}</Badge>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-blue-50/50 rounded-[24px] border border-blue-100/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Source (Sender)</p>
                                                        <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center"><ArrowUpRight className="h-3.5 w-3.5 text-blue-600" /></div>
                                                    </div>
                                                    <p className="text-[13px] font-black text-blue-900 uppercase flex items-center gap-2">
                                                        <Zap className="h-3.5 w-3.5 text-blue-500" /> {order.buyerSelectedProvider || "Direct Gateway"}
                                                    </p>
                                                    <p className="text-[9px] font-mono font-bold text-blue-500/70 mt-1 truncate">{order.buyerSelectedUpi || "Internal-Link"}</p>
                                                </div>
                                                <div className="p-4 bg-teal-50/50 rounded-[24px] border border-teal-100/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest">Target (Receiver)</p>
                                                        <div className="h-6 w-6 rounded-lg bg-teal-100 flex items-center justify-center"><ArrowDownLeft className="h-3.5 w-3.5 text-teal-600" /></div>
                                                    </div>
                                                    <p className="text-[13px] font-black text-teal-900 uppercase flex items-center gap-2">
                                                        <Landmark className="h-3.5 w-3.5 text-teal-500" /> {order.sellerWithdrawalDetails?.name || "Flex Vault"}
                                                    </p>
                                                    <p className="text-[9px] font-mono font-bold text-teal-500/70 mt-1 truncate">{order.sellerWithdrawalDetails?.upiId || "N/A"}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-2">
                                                <div className="w-full md:w-auto space-y-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Asset Audit</p>
                                                    <div className="flex flex-col">
                                                        <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">₹{(order.baseAmount || order.amount).toLocaleString()}</span>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <div className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-2">
                                                                <p className="text-[10px] font-mono font-black text-slate-600 uppercase tracking-tight">UTR: {order.utr}</p>
                                                                <button onClick={() => handleCopy(order.utr)} className="text-slate-400 hover:text-blue-500 transition-colors"><Copy className="h-3 w-3" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 w-full md:w-auto">
                                                    <Dialog>
                                                        <DialogTrigger asChild><Button variant="outline" className="flex-1 md:flex-none rounded-2xl h-12 border-slate-200 font-bold"><ImageIcon className="mr-2 h-4 w-4" /> Proof</Button></DialogTrigger>
                                                        <DialogContent className="max-w-[400px] rounded-[32px] p-0 border-none overflow-hidden shadow-2xl">
                                                            <div className="relative aspect-[4/5] bg-slate-900"><img src={order.screenshotURL} alt="Proof" className="w-full h-full object-contain" /></div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button onClick={() => handleApproveBuy(order)} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 h-12 rounded-2xl font-black px-8 uppercase text-[11px] tracking-widest shadow-lg shadow-green-600/20" disabled={isActionLoading}><Check className="mr-2 h-4 w-4" /> Approve</Button>
                                                    <Button onClick={() => handleRejectBuy(order)} variant="destructive" className="flex-1 md:flex-none h-12 rounded-2xl font-black px-8 uppercase text-[11px] tracking-widest shadow-lg shadow-red-600/20" disabled={isActionLoading}><X className="mr-2 h-4 w-4" /> Reject</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {filteredConfirmOrders.length === 0 && <div className="text-center py-32 opacity-20 font-black uppercase text-[11px] tracking-[0.3em]">Registry Secure • No pending audits</div>}
                            </div>
                        </TabsContent>

                        <TabsContent value="withdrawals" className="space-y-4 focus-visible:ring-0 outline-none">
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Search UID, Order ID..." className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" value={withdrawalSearch} onChange={e => setWithdrawalSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-4">
                                {filteredWithdrawals.map(o => (
                                    <Card key={o.id} className="border-none shadow-sm rounded-3xl bg-white p-5 group hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center"><ArrowDownLeft className="h-5 w-5 text-emerald-600" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Withdrawal Node</p>
                                                    <p className="text-xs font-black text-slate-900">UID: {o.userNumericId}</p>
                                                </div>
                                            </div>
                                            <Badge className={cn("text-[8px] font-black uppercase rounded-lg", o.status === 'processing' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}>
                                                {o.status.replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        {o.matchedBuyOrders && o.matchedBuyOrders.length > 0 && (
                                            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                                    <span className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">Match P2P Detected</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {o.matchedBuyOrders.map((m: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between bg-white/50 p-2 rounded-xl border border-blue-50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[8px] font-black text-slate-400">Buyer:</span>
                                                                <span className="text-[10px] font-bold text-blue-900">{m.buyerNumericId || "UID_PENDING"}</span>
                                                                <button onClick={() => handleCopy(m.buyerNumericId)} className="text-slate-300 hover:text-blue-500 transition-colors"><Copy className="h-3 w-3" /></button>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-slate-800">₹{m.amount}</span>
                                                                <span className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 rounded", m.status === 'completed' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}>{m.status}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 py-3 border-t border-dashed">
                                            <div>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Payout Amount</p>
                                                <p className="text-lg font-black text-slate-900">₹{o.amount.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Receiver Method</p>
                                                <p className="text-[10px] font-black text-slate-800 uppercase">{o.withdrawalMethod?.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[10px] font-mono font-bold text-blue-600">{o.withdrawalMethod?.upiId || o.withdrawalMethod?.accountNumber}</p>
                                                    <button onClick={() => handleCopy(o.withdrawalMethod?.upiId || o.withdrawalMethod?.accountNumber)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {filteredWithdrawals.length === 0 && <div className="text-center py-32 opacity-20 font-black uppercase text-[11px] tracking-widest">No active payouts</div>}
                            </div>
                        </TabsContent>

                        <TabsContent value="server" className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Node Configuration</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Collection Gateways</p>
                                </div>
                                <Button onClick={() => setIsAddPMOpen(true)} className="rounded-xl btn-gradient font-black uppercase text-[10px] h-11 px-6 shadow-blue-500/20"><Plus className="mr-2 h-4 w-4" /> Inject Node</Button>
                            </div>
                            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {paymentMethods.map(pm => (
                                    <Card key={pm.id} className="border-none shadow-sm rounded-3xl bg-white p-6 relative overflow-hidden group">
                                        <div className={cn("absolute top-0 left-0 w-1.5 h-full", pm.type === 'usdt' ? "bg-amber-500" : "bg-blue-500")} />
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center p-2 shadow-inner">
                                                {pm.type === 'usdt' ? <div className="font-black text-amber-500 text-lg">$</div> : <Landmark className="h-6 w-6 text-blue-500" />}
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeletePaymentMethod(pm.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Provider Type</p>
                                                <p className="text-sm font-black text-slate-800 uppercase">{pm.type === 'usdt' ? 'Digital Asset (USDT)' : pm.bankName || 'UPI Gateway'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Terminal Address</p>
                                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 transition-all">
                                                    <span className="text-[11px] font-mono font-black text-slate-600 truncate mr-2">{pm.upiId || pm.usdtWalletAddress || pm.accountNumber}</span>
                                                    <button onClick={() => handleCopy(pm.upiId || pm.usdtWalletAddress || pm.accountNumber)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>

            {/* ADD PAYMENT NODE DIALOG */}
            <Dialog open={isAddPMOpen} onOpenChange={setIsAddPMOpen}>
                <DialogContent className="rounded-[32px] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Inject Gateway Node</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase">Deploy new collection endpoint</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Node Protocol</Label>
                            <Select value={newPM.type} onValueChange={(v) => setNewPM({ ...newPM, type: v })}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold uppercase"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    <SelectItem value="upi" className="font-bold">UPI GATEWAY</SelectItem>
                                    <SelectItem value="usdt" className="font-bold">USDT TRC20</SelectItem>
                                    <SelectItem value="bank" className="font-bold">BANK WIRE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {newPM.type === 'upi' && (
                            <>
                                <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-400 ml-1">VPA / UPI ID</Label><Input className="h-12 bg-slate-50 border-none rounded-xl font-black" placeholder="name@bank" value={newPM.upiId} onChange={e => setNewPM({...newPM, upiId: e.target.value})} /></div>
                                <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Holder Identity</Label><Input className="h-12 bg-slate-50 border-none rounded-xl font-black uppercase" placeholder="Verified Name" value={newPM.upiHolderName} onChange={e => setNewPM({...newPM, upiHolderName: e.target.value})} /></div>
                            </>
                        )}
                        {newPM.type === 'usdt' && (
                            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-400 ml-1">TRC20 Wallet Hash</Label><Input className="h-12 bg-slate-50 border-none rounded-xl font-mono font-bold" placeholder="T..." value={newPM.usdtWalletAddress} onChange={e => setNewPM({...newPM, usdtWalletAddress: e.target.value})} /></div>
                        )}
                    </div>
                    <DialogFooter><Button onClick={handleAddPaymentMethod} className="w-full h-12 btn-gradient rounded-xl uppercase font-black text-[10px] tracking-widest shadow-blue-500/20" disabled={isActionLoading}>{isActionLoading ? "Syncing..." : "Inject Node"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
