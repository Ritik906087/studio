'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Users, LayoutDashboard, FileClock, ShieldCheck, Activity, 
  Menu, X, TrendingDown, CheckCircle2, Server, 
  Edit3, Eye, Trash2, Smartphone, DollarSign, Wallet
} from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy, where, doc, setDoc, collectionGroup } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const ALLOWED_ADMINS = ['9955557336', '9060873927'];

const providerLogos: any = {
  PhonePe: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Phonepay.png?alt=media&token=579a228d-121f-4d5b-933d-692d791dec2f",
  Paytm: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8",
  MobiKwik: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7",
  Freecharge: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4",
  Airtel: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Airtel%2001.png?alt=media&token=357342fd-85df-43c1-a7fb-d9d57315df1d",
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [sellOrders, setSellOrders] = useState<any[]>([]);
    const [pendingBuyOrders, setPendingBuyOrders] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem('flex_admin_session');
        if (!sessionStr) { router.replace('/admin/key'); return; }
        const session = JSON.parse(sessionStr);
        if (!session.authenticated || !ALLOWED_ADMINS.includes(session.masterId) || session.expires < Date.now()) {
            localStorage.removeItem('flex_admin_session');
            router.replace('/admin/key');
        }
    }, [router]);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);

        const unsubUsers = onSnapshot(query(collection(firestore, 'users'), orderBy('createdAt', 'desc')), (snap) => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubSell = onSnapshot(query(collection(firestore, 'sellOrders'), orderBy('createdAt', 'desc')), (snap) => {
            setSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Use collectionGroup to find buy orders awaiting confirmation across all users
        const buyOrdersQuery = query(collectionGroup(firestore, 'orders'), where('status', '==', 'pending_confirmation'));
        const unsubBuy = onSnapshot(buyOrdersQuery, (snap) => {
            setPendingBuyOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        const unsubPM = onSnapshot(collection(firestore, 'paymentMethods'), (snap) => {
            setPaymentMethods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);
        return () => { unsubUsers(); unsubSell(); unsubBuy(); unsubPM(); };
    }, [firestore]);

    const handleLogout = () => {
        localStorage.removeItem('flex_admin_session');
        router.replace('/admin/key');
    };

    const handleUpdateAdminPayment = async (type: string, data: any) => {
        if (!firestore) return;
        try {
            await setDoc(doc(firestore, 'paymentMethods', type), { ...data, type }, { merge: true });
            toast({ title: "Updated", description: "Payment server link refreshed." });
            setEditingPayment(null);
        } catch (e: any) { toast({ variant: 'destructive', title: "Update Failed", description: e.message }); }
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
                        <span className="text-[10px] font-black text-blue-700 uppercase">Enterprise 4.0</span>
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
                          <Button 
                            key={item.id}
                            variant="ghost" 
                            className={cn(
                                "w-full justify-start h-12 rounded-xl font-black uppercase text-[10px] tracking-widest",
                                activeTab === item.id ? "bg-blue-50 text-blue-600" : "text-slate-400"
                            )}
                            onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                          >
                            <item.icon className="mr-3 h-5 w-5" /> {item.label}
                          </Button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 p-4 md:p-8 max-w-full overflow-x-hidden">
                    <Tabs value={activeTab} className="w-full">
                        
                        {/* TAB 1: DASHBOARD */}
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
                                <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Buy</p>
                                    <div className="text-3xl font-black text-green-600 mt-2">₹0</div>
                                </Card>
                                <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Sell</p>
                                    <div className="text-3xl font-black text-red-600 mt-2">₹0</div>
                                </Card>
                            </div>
                            <Card className="border-none shadow-sm rounded-3xl bg-white p-12 text-center">
                                <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
                                <h3 className="font-black text-lg">System Pulse Active</h3>
                                <p className="text-slate-400 text-sm mt-1">Monitoring P2P rotation and Admin Fallback Server.</p>
                            </Card>
                        </TabsContent>

                        {/* TAB 2: USERS */}
                        <TabsContent value="users">
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <CardHeader className="p-6 border-b"><CardTitle className="text-sm font-black uppercase">Registry</CardTitle></CardHeader>
                                <div className="overflow-x-auto">
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
                                            {allUsers.map(u => (
                                                <TableRow key={u.id} className="border-slate-50">
                                                    <TableCell className="font-mono text-xs font-black text-blue-600 pl-6">{u.numericId}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8"><AvatarImage src={u.photoURL} /><AvatarFallback>U</AvatarFallback></Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-xs">{u.displayName}</span>
                                                                <span className="text-[9px] text-slate-400">+91 {u.phoneNumber}</span>
                                                            </div>
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
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB 3: WITHDRAWAL (SELL ORDERS) */}
                        <TabsContent value="withdrawal">
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <CardHeader className="p-6 border-b"><CardTitle className="text-sm font-black uppercase">Sell Orders (Withdrawals)</CardTitle></CardHeader>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase pl-6">UID / Mobile</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Method</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-right pr-6">Control</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sellOrders.map(o => (
                                                <TableRow key={o.id}>
                                                    <TableCell className="pl-6">
                                                        <p className="font-black text-[11px] text-blue-600">{o.userNumericId}</p>
                                                        <p className="text-[9px] text-slate-400 font-medium">+91 {o.userPhoneNumber}</p>
                                                    </TableCell>
                                                    <TableCell className="font-black text-xs">₹{o.amount}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-lg bg-slate-50 p-1 flex items-center justify-center">
                                                                <Image src={providerLogos[o.withdrawalMethod?.name] || ""} alt="logo" width={14} height={14} />
                                                            </div>
                                                            <span className="font-mono text-[9px] font-black">{o.withdrawalMethod?.upiId}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase">{o.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase rounded-lg">View Matches</Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB 4: CONFIRMATION (BUY PROOF) */}
                        <TabsContent value="confirm">
                             <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <CardHeader className="p-6 border-b"><CardTitle className="text-sm font-black uppercase">Pending Buy Proofs</CardTitle></CardHeader>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase pl-6">Order ID</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">UTR Number</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Proof</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingBuyOrders.map(o => (
                                                <TableRow key={o.id}>
                                                    <TableCell className="font-mono text-xs font-bold text-slate-500 pl-6">{o.orderId}</TableCell>
                                                    <TableCell className="font-mono text-xs font-black text-primary">{o.utr}</TableCell>
                                                    <TableCell>
                                                        {o.screenshotURL ? (
                                                            <a href={o.screenshotURL} target="_blank" className="flex items-center gap-2 text-blue-600 hover:underline">
                                                                <ShieldCheck className="h-3 w-3" /> <span className="text-[10px] font-black">VIEW IMAGE</span>
                                                            </a>
                                                        ) : <span className="text-[9px] text-slate-300">NO PROOF</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" className="bg-green-600 h-7 text-[9px] font-black">APPROVE</Button>
                                                            <Button size="sm" variant="destructive" className="h-7 text-[9px] font-black">REJECT</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {pendingBuyOrders.length === 0 && (
                                        <div className="p-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.2em]">All Proofs Cleared</div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB 5: PAYMENT SERVER (ADMIN CONFIG) */}
                        <TabsContent value="server" className="space-y-6">
                            <Tabs defaultValue="bank" className="w-full">
                                <TabsList className="bg-white p-1 rounded-2xl border-none shadow-sm inline-flex mb-4">
                                    <TabsTrigger value="bank" className="rounded-xl px-6 font-black text-[10px] uppercase">Bank Server</TabsTrigger>
                                    <TabsTrigger value="upi" className="rounded-xl px-6 font-black text-[10px] uppercase">UPI Server</TabsTrigger>
                                    <TabsTrigger value="usdt" className="rounded-xl px-6 font-black text-[10px] uppercase">USDT Node</TabsTrigger>
                                </TabsList>

                                {['bank', 'upi', 'usdt'].map(type => {
                                    const method = paymentMethods.find(m => m.id === type) || { type };
                                    const isEditing = editingPayment === type;
                                    return (
                                        <TabsContent key={type} value={type}>
                                            <Card className="border-none shadow-sm rounded-3xl bg-white max-w-xl overflow-hidden">
                                                <CardHeader className="bg-slate-50 p-4 border-b flex flex-row justify-between items-center">
                                                    <CardTitle className="text-[10px] font-black uppercase text-slate-500">{type} Configuration</CardTitle>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingPayment(isEditing ? null : type)}>
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>
                                                </CardHeader>
                                                <CardContent className="p-8 space-y-4">
                                                    {isEditing ? (
                                                        <div className="space-y-4">
                                                            {type === 'bank' && (
                                                                <>
                                                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">Bank Name</p><Input defaultValue={method.bankName} onChange={e => method.bankName = e.target.value} /></div>
                                                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">Holder Name</p><Input defaultValue={method.accountHolderName} onChange={e => method.accountHolderName = e.target.value} /></div>
                                                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">Account Number</p><Input defaultValue={method.accountNumber} onChange={e => method.accountNumber = e.target.value} /></div>
                                                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">IFSC Code</p><Input defaultValue={method.ifscCode} onChange={e => method.ifscCode = e.target.value} /></div>
                                                                </>
                                                            )}
                                                            {type === 'upi' && (
                                                                <>
                                                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">Master UPI ID</p><Input defaultValue={method.upiId} onChange={e => method.upiId = e.target.value} /></div>
                                                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">Holder Name</p><Input defaultValue={method.upiHolderName} onChange={e => method.upiHolderName = e.target.value} /></div>
                                                                </>
                                                            )}
                                                            {type === 'usdt' && (
                                                                <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">TRC20 Wallet Address</p><Input defaultValue={method.usdtWalletAddress} onChange={e => method.usdtWalletAddress = e.target.value} /></div>
                                                            )}
                                                            <div className="pt-4 flex gap-3">
                                                                <Button variant="outline" className="flex-1 rounded-xl font-black text-[10px]" onClick={() => setEditingPayment(null)}>CANCEL</Button>
                                                                <Button className="flex-1 bg-blue-600 rounded-xl font-black text-[10px]" onClick={() => handleUpdateAdminPayment(type, method)}>SAVE LINK</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-6">
                                                            <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center">
                                                                <ShieldCheck className="h-8 w-8 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xl font-black text-slate-800 tracking-tight">{method.upiId || method.accountNumber || method.usdtWalletAddress || "NOT LINKED"}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{method.bankName || method.upiHolderName || "MASTER CHANNEL"}</p>
                                                            </div>
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
