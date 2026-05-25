
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Users, LayoutDashboard, Server, 
  Eye, Wallet, Check, RefreshCw,
  Search, ImageIcon, Clock, ArrowDownLeft, Trash2, Plus, CreditCard, Landmark, Zap,
  Banknote, History, CheckCircle2, X, Menu, ArrowUpRight, Copy
} from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, collectionGroup, onSnapshot, query, orderBy, where, doc, deleteDoc, runTransaction, serverTimestamp, getDocs, limit, addDoc } from 'firebase/firestore';
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
    
    const [settleUTR, setSettleUTR] = useState('');
    const [settleOrder, setSettleOrder] = useState<any>(null);

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
            // Using collectionGroup to find all pending_confirmation orders across all users
            const pendingQuery = query(
                collectionGroup(firestore, 'orders'),
                where('status', '==', 'pending_confirmation')
            );
            const snap = await getDocs(pendingQuery);
            const allPending = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        // Listen for all sell orders
        const unsubSell = onSnapshot(query(collection(firestore, 'sellOrders'), orderBy('createdAt', 'desc'), limit(150)), (snap) => {
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

    const handleAddPaymentMethod = async () => {
        if (!firestore || !isFullAdmin) return;
        setIsActionLoading(true);
        try {
            await addDoc(collection(firestore, 'paymentMethods'), {
                ...newPM,
                createdAt: serverTimestamp()
            });
            toast({ title: "Payment Node Added" });
            setIsAddPMOpen(false);
            setNewPM({ type: 'upi', upiId: '', upiHolderName: '', usdtWalletAddress: '', bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to add" });
        } finally {
            setIsAddPMOpen(false);
            setIsActionLoading(false);
        }
    };

    const handleDeletePaymentMethod = async (id: string) => {
        if (!firestore || !isFullAdmin) return;
        try {
            await deleteDoc(doc(firestore, 'paymentMethods', id));
            toast({ title: "Node Removed" });
        } catch (e) {}
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

                let l1Ref = null;
                let l1Snap = null;
                let l2Ref = null;
                let l2Snap = null;

                if (buyerData.inviterUid) {
                    l1Ref = doc(firestore, 'users', buyerData.inviterUid);
                    l1Snap = await transaction.get(l1Ref);
                    if (l1Snap.exists() && l1Snap.data().inviterUid) {
                        l2Ref = doc(firestore, 'users', l1Snap.data().inviterUid);
                        l2Snap = await transaction.get(l2Ref);
                    }
                }

                let sellOrderRef = null;
                let sellOrderSnap = null;
                if (order.matchedSellOrderId) {
                    sellOrderRef = doc(firestore, 'sellOrders', order.matchedSellOrderId);
                    sellOrderSnap = await transaction.get(sellOrderRef);
                }

                let sellerProfileRef = null;
                let sellerProfileSnap = null;
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
                
                let sellOrderRef = null;
                let sellOrderSnap = null;
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
                    
                    transaction.update(sellOrderRef, { 
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
                    }
                }
            });
            toast({ title: "Order Rejected" });
            fetchConfirmations();
        } catch (e: any) { 
            toast({ variant: "destructive", title: "Action Failed", description: e.message }); 
        } finally { setIsActionLoading(false); }
    };

    const handleSettleSell = async () => {
        if (!settleOrder || !settleUTR || !firestore) return;
        setIsActionLoading(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const sellRef = doc(firestore, 'sellOrders', settleOrder.id);
                const userSellRef = doc(firestore, 'users', settleOrder.userId, 'sellOrders', settleOrder.id);
                const userRef = doc(firestore, 'users', settleOrder.userId);
                
                const userSnap = await transaction.get(userRef);
                const currentHold = userSnap.data()?.holdBalance || 0;
                
                transaction.update(sellRef, {
                    status: 'completed',
                    utr: settleUTR,
                    completedAt: serverTimestamp(),
                    remainingAmount: 0
                });
                
                transaction.update(userSellRef, {
                    status: 'completed',
                    utr: settleUTR,
                    completedAt: serverTimestamp(),
                    remainingAmount: 0
                });

                transaction.update(userRef, {
                    holdBalance: Math.max(0, currentHold - (settleOrder.remainingAmount || 0))
                });
            });
            toast({ title: "Withdrawal Completed" });
            setSettleOrder(null);
            setSettleUTR('');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Update Failed", description: e.message });
        } finally {
            setIsActionLoading(false);
        }
    };

    const totalBalance = allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);

    const sidebarItems = useMemo(() => {
        const items = [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'users', label: 'User Registry', icon: Users },
            { id: 'confirm', label: 'Confirmation', icon: CheckCircle2 },
            { id: 'withdrawals', label: 'Withdrawals', icon: Landmark },
        ];
        if (isFullAdmin) {
            items.push({ id: 'server', label: 'Payment Nodes', icon: Server });
        }
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
                                    <div className="text-3xl font-black text-primary mt-2">₹{totalBalance.toLocaleString()}</div>
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
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Identity</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Balance</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-right pr-6">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="pl-6">
                                                  <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-black text-xs text-blue-600">UID: {u.numericId}</span>
                                                      <button onClick={() => handleCopy(u.numericId)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400">{u.displayName}</span>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="font-black text-xs">₹{u.balance?.toFixed(2)}</TableCell>
                                                <TableCell className="text-right pr-6"><Button asChild size="sm" variant="ghost" className="h-8 w-8"><Link href={`/admin/users/${u.id}`}><Eye className="h-4 w-4" /></Link></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>

                        <TabsContent value="confirm" className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Search Amount, UTR..." className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" value={confirmSearch} onChange={e => setConfirmSearch(e.target.value)} />
                                </div>
                                <Button onClick={fetchConfirmations} size="icon" variant="outline" className="rounded-xl h-11 w-11"><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid gap-4">
                                {filteredConfirmOrders.map(order => (
                                    <Card key={order.id} className="border-none shadow-sm rounded-3xl bg-white p-5 group hover:shadow-md transition-all">
                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                    {order.paymentType === 'usdt' ? <Zap className="h-6 w-6 text-amber-500" /> : <Wallet className="h-6 w-6" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[9px] uppercase font-black">{order.paymentType}</Badge>
                                                        <div className="flex items-center gap-1.5">
                                                          <span className="text-xs font-black text-slate-800">UID: {order.userNumericId}</span>
                                                          <button onClick={() => handleCopy(order.userNumericId)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-lg font-black text-slate-900">₹{order.baseAmount || order.amount}</p>
                                                    <div className="flex items-center gap-2">
                                                      <p className="text-[10px] font-mono font-bold text-slate-400">UTR/TXID: {order.utr}</p>
                                                      <button onClick={() => handleCopy(order.utr)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Dialog>
                                                    <DialogTrigger asChild><Button variant="outline" className="rounded-xl h-11"><ImageIcon className="mr-2 h-4 w-4" /> Proof</Button></DialogTrigger>
                                                    <DialogContent className="max-w-md rounded-3xl"><div className="relative aspect-auto max-h-[70vh] overflow-hidden rounded-xl"><img src={order.screenshotURL} alt="Proof" className="w-full h-full object-contain" /></div></DialogContent>
                                                </Dialog>
                                                <Button onClick={() => handleApproveBuy(order)} className="bg-green-600 hover:bg-green-700 h-11 rounded-xl font-black px-6" disabled={isActionLoading}><Check className="mr-2 h-4 w-4" /> Approve</Button>
                                                <Button onClick={() => handleRejectBuy(order)} variant="destructive" className="h-11 rounded-xl font-black px-6" disabled={isActionLoading}><X className="mr-2 h-4 w-4" /> Reject</Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {filteredConfirmOrders.length === 0 && <div className="text-center py-24 opacity-30 font-black uppercase text-[10px] tracking-widest">No pending audits</div>}
                            </div>
                        </TabsContent>

                        <TabsContent value="withdrawals" className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Search UID, ID..." className="pl-10 h-11 bg-white rounded-xl border-none shadow-sm" value={withdrawalSearch} onChange={e => setWithdrawalSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-4">
                                {filteredWithdrawals.map(order => (
                                    <Card key={order.id} className="border-none shadow-sm rounded-3xl bg-white p-5 group hover:shadow-md transition-all">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                                        <ArrowDownLeft className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={cn("text-[9px] uppercase font-black", order.status === 'completed' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600")}>
                                                                {order.status}
                                                            </Badge>
                                                            <div className="flex items-center gap-1.5">
                                                              <span className="text-xs font-black text-slate-800">UID: {order.userNumericId}</span>
                                                              <button onClick={() => handleCopy(order.userNumericId)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                                                            </div>
                                                        </div>
                                                        <p className="text-lg font-black text-slate-900">₹{order.amount}</p>
                                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] space-y-1">
                                                            <p className="font-black text-slate-400 uppercase">Target Node</p>
                                                            <p className="font-bold text-slate-800">App: {order.withdrawalMethod?.name}</p>
                                                            <div className="flex items-center gap-2">
                                                              <p className="font-mono text-blue-600 font-black">{order.withdrawalMethod?.upiId || order.withdrawalMethod?.accountNumber}</p>
                                                              <button onClick={() => handleCopy(order.withdrawalMethod?.upiId || order.withdrawalMethod?.accountNumber)} className="text-slate-300 hover:text-blue-500"><Copy className="h-2.5 w-2.5" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 self-end md:self-center">
                                                    <Button onClick={() => setSettleOrder(order)} className="bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-black px-6" disabled={isActionLoading}>
                                                        <Banknote className="mr-2 h-4 w-4" /> Settle Payout
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            {/* P2P MATCHING INFO */}
                                            {order.matchedBuyOrders && order.matchedBuyOrders.length > 0 && (
                                                <div className="mt-2 border-t pt-4">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Live P2P Sub-Orders</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {order.matchedBuyOrders.map((m: any, idx: number) => (
                                                            <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-400">₹{m.amount}</p>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                      <p className="text-[10px] font-bold text-slate-700 uppercase">Buyer: {m.buyerNumericId || m.buyerId?.slice(-6)}</p>
                                                                      <button onClick={() => handleCopy(m.buyerNumericId || m.buyerId)} className="text-slate-300 hover:text-blue-500"><Copy className="h-2 w-2" /></button>
                                                                    </div>
                                                                </div>
                                                                <Badge variant="outline" className={cn("text-[7px] h-4 uppercase", 
                                                                    m.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                                                )}>
                                                                    {m.status?.replace('_', ' ')}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                                {filteredWithdrawals.length === 0 && <div className="text-center py-24 opacity-30 font-black uppercase text-[10px] tracking-widest">No active withdrawal requests</div>}
                            </div>
                        </TabsContent>

                        {isFullAdmin && (
                            <TabsContent value="server" className="space-y-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Active Payment Nodes</h2>
                                    <Button onClick={() => setIsAddPMOpen(true)} className="rounded-xl h-11 btn-gradient uppercase font-black text-[10px] tracking-widest px-6"><Plus className="mr-2 h-4 w-4" /> Add Node</Button>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {paymentMethods.map(pm => (
                                        <Card key={pm.id} className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden relative group">
                                            <div className={cn("h-1.5 w-full", pm.type === 'usdt' ? "bg-amber-500" : "bg-blue-600")} />
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                                            {pm.type === 'usdt' ? <Zap className="h-5 w-5 text-amber-500" /> : <CreditCard className="h-5 w-5 text-blue-600" />}
                                                        </div>
                                                        <span className="font-black text-xs uppercase text-slate-800">{pm.type} Node</span>
                                                    </div>
                                                    <Button onClick={() => handleDeletePaymentMethod(pm.id)} variant="ghost" size="icon" className="text-red-400 h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                                <div className="space-y-2">
                                                    {pm.type === 'usdt' ? (
                                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">TRC20 Wallet</p>
                                                            <div className="flex items-center justify-between mt-1">
                                                              <p className="text-[11px] font-black text-slate-800 truncate max-w-[80%]">{pm.usdtWalletAddress}</p>
                                                              <button onClick={() => handleCopy(pm.usdtWalletAddress)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Access ID</p>
                                                            <div className="flex items-center justify-between mt-1">
                                                              <p className="text-[11px] font-black text-slate-800">{pm.upiId}</p>
                                                              <button onClick={() => handleCopy(pm.upiId)} className="text-slate-300 hover:text-blue-500"><Copy className="h-3 w-3" /></button>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{pm.upiHolderName}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </main>
            </div>

            {/* Settle Payout Dialog */}
            <Dialog open={!!settleOrder} onOpenChange={(o) => !o && setSettleOrder(null)}>
                <DialogContent className="rounded-[32px] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Complete Settlement</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase text-slate-400">Mark withdrawal as paid</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-1 text-center">
                            <p className="text-[9px] font-black text-blue-400 uppercase">Payout Amount</p>
                            <p className="text-2xl font-black text-blue-700 tracking-tighter">₹{settleOrder?.amount}</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Payment Reference (UTR)</Label>
                            <Input value={settleUTR} onChange={e => setSettleUTR(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-100 font-mono font-black" placeholder="12-digit UTR" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSettleSell} className="w-full h-12 btn-gradient rounded-xl font-black uppercase text-[10px] tracking-widest" disabled={isActionLoading || !settleUTR}>
                            {isActionLoading ? "Processing..." : "Confirm Settlement"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddPMOpen} onOpenChange={setIsAddPMOpen}>
                <DialogContent className="rounded-[32px] max-w-sm">
                    <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Register Node</DialogTitle><DialogDescription className="text-[10px] font-bold uppercase text-slate-400">Add secure payment entry point</DialogDescription></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Node Type</Label>
                            <Select value={newPM.type} onValueChange={(v) => setNewPM({ ...newPM, type: v })}>
                                <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl"><SelectItem value="upi">UPI / Local QR</SelectItem><SelectItem value="usdt">USDT (TRC-20)</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem></SelectContent>
                            </Select>
                        </div>
                        {newPM.type === 'usdt' ? (
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-slate-400">TRC20 Address</Label>
                                <Input value={newPM.usdtWalletAddress} onChange={e => setNewPM({ ...newPM, usdtWalletAddress: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-100 font-mono text-xs" placeholder="T..." />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase text-slate-400">Access ID / Text</Label>
                                    <Input value={newPM.upiId} onChange={e => setNewPM({ ...newPM, upiId: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-100 font-black" placeholder="Identifier" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase text-slate-400">Holder Identity</Label>
                                    <Input value={newPM.upiHolderName} onChange={e => setNewPM({ ...newPM, upiHolderName: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-100 font-black uppercase" placeholder="Verified Name" />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter><Button onClick={handleAddPaymentMethod} className="w-full h-12 btn-gradient rounded-xl uppercase font-black text-[10px] tracking-widest shadow-blue-500/20" disabled={isActionLoading}>{isActionLoading ? "Syncing..." : "Inject Node"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
