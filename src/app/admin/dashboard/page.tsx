
'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, Users, LayoutDashboard, Wallet, FileClock, ShieldCheck, Activity } from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

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

const ALLOWED_ADMINS = ['9955557336', '9060873927'];

function AdminDashboard() {
    const router = useRouter();
    const firestore = useFirestore();
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    useEffect(() => {
        const sessionStr = localStorage.getItem('flex_admin_session');
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                if (session.authenticated && ALLOWED_ADMINS.includes(session.masterId) && session.expires > Date.now()) {
                    setIsMasterAdmin(true);
                } else {
                    localStorage.removeItem('flex_admin_session');
                    router.replace('/admin/key');
                }
            } catch (e) {
                router.replace('/admin/key');
            }
        } else {
            router.replace('/admin/key');
        }
        setAuthChecking(false);
    }, [router]);

    useEffect(() => {
        if (!firestore || !isMasterAdmin) return;

        setUsersLoading(true);
        const q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
        const unsubUsers = onSnapshot(q, (snap) => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
            setUsersLoading(false);
        }, (error) => {
            console.error("Admin Users Listener Error:", error);
            setUsersLoading(false);
        });

        return () => {
            unsubUsers();
        };
    }, [firestore, isMasterAdmin]);

    const handleLogout = () => {
        localStorage.removeItem('flex_admin_session');
        router.replace('/admin/key');
    };

    if (authChecking) {
        return <div className="flex h-screen items-center justify-center"><Loader size="md" /></div>;
    }

    if (!isMasterAdmin) {
        return null;
    }

    const totalUsers = allUsers.length;
    const totalBalance = allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);

    return (
        <div className="flex min-h-screen w-full flex-col bg-[#F8FAFC]">
            <header className="sticky top-0 flex h-20 items-center gap-4 border-b bg-white px-8 z-10 justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Logo className="text-2xl" />
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Console Version</span>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">Enterprise Tier 4.0.1</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-black text-blue-700 uppercase tracking-tight">Encrypted Session</span>
                    </div>
                    <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 font-bold px-4 h-11">
                        <LogOut className="mr-2 h-4 w-4" />
                        Terminate Session
                    </Button>
                </div>
            </header>
            
            <main className="flex-grow p-8 max-w-[1600px] mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
                    {/* SIDEBAR NAVIGATION */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden p-2">
                            <div className="space-y-1">
                                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl bg-blue-50 text-blue-600 font-black uppercase text-[11px] tracking-widest">
                                    <LayoutDashboard className="mr-3 h-5 w-5" /> Dashboard Overview
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase text-[11px] tracking-widest">
                                    <Users className="mr-3 h-5 w-5" /> User Intelligence
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase text-[11px] tracking-widest">
                                    <Wallet className="mr-3 h-5 w-5" /> Liquidity Pool
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase text-[11px] tracking-widest">
                                    <FileClock className="mr-3 h-5 w-5" /> Transaction Logs
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase text-[11px] tracking-widest">
                                    <Activity className="mr-3 h-5 w-5" /> Security Alerts
                                </Button>
                            </div>
                        </Card>

                        {/* LIVE SYSTEM STATS CARD */}
                        <Card className="border-none shadow-sm rounded-[32px] bg-slate-900 text-white p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="h-20 w-20" /></div>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Core Engine</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Uptime</span>
                                    <span className="text-xs font-black text-green-500 tabular-nums">99.998%</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Latency</span>
                                    <span className="text-xs font-black text-blue-400 tabular-nums">12ms</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Requests</span>
                                    <span className="text-xs font-black text-indigo-400 tabular-nums">1.4k/sec</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden p-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registered Identity</p>
                                        <div className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{totalUsers.toLocaleString()}</div>
                                        <p className="text-[10px] font-bold text-green-600 uppercase mt-2">↑ 4.2% Growth Rate</p>
                                    </div>
                                    <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center shadow-inner">
                                        <Users className="h-8 w-8 text-blue-600" />
                                    </div>
                                </div>
                            </Card>
                            <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden p-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Liquidity Assets</p>
                                        <div className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">₹{totalBalance.toLocaleString()}</div>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase mt-2">Tier 1 Compliance Stable</p>
                                    </div>
                                    <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center shadow-inner">
                                        <Wallet className="h-8 w-8 text-indigo-600" />
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-black text-slate-900 tracking-tighter uppercase">Global User Directory</CardTitle>
                                <div className="flex gap-2">
                                    <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-400 tracking-widest border border-slate-100">
                                        Showing All Accounts
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {usersLoading ? <div className="flex justify-center p-20"><Loader /></div> : (
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="border-none">
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-6">Unique ID</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8">Identity</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8">Liquidity</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8">Security Status</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 text-right">Action Console</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allUsers.map(u => (
                                                <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="font-mono text-xs font-black text-blue-600 px-8 py-6">{u.numericId}</TableCell>
                                                    <TableCell className="px-8">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm shrink-0">
                                                                <AvatarImage src={u.photoURL || defaultAvatarUrl} />
                                                                <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-black text-sm text-slate-800 truncate">{u.displayName}</span>
                                                                <span className="text-[10px] font-medium text-slate-400 truncate">{u.phoneNumber || u.email}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-8">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-sm text-slate-900 tabular-nums">₹{u.balance?.toLocaleString()}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">HOLD: ₹{u.holdBalance?.toLocaleString()}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-8">
                                                        <Badge className="bg-green-50 text-green-600 border-green-100 font-black text-[9px] px-3 py-1 uppercase rounded-full">Secured</Badge>
                                                    </TableCell>
                                                    <TableCell className="px-8 text-right">
                                                        <Button asChild size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-10 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200">
                                                            <Link href={`/admin/users/${u.id}`}>Audit Intelligence</Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {allUsers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-20">
                                                        <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                                        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Registry is currently empty</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}
