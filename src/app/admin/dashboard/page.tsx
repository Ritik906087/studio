'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, Users, LayoutDashboard, Wallet, FileClock, ShieldCheck, Activity, Menu, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

function AdminDashboard() {
    const router = useRouter();
    const firestore = useFirestore();
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
            {/* HEADER */}
            <header className="sticky top-0 flex h-16 md:h-20 items-center gap-4 border-b bg-white px-4 md:px-8 z-50 justify-between shadow-sm">
                <div className="flex items-center gap-3 md:gap-4">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X /> : <Menu />}
                    </Button>
                    <Logo className="text-xl md:text-2xl" />
                    <div className="hidden sm:flex flex-col border-l pl-4 border-slate-200 ml-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Console</span>
                        <span className="text-xs font-black text-slate-800 uppercase">Enterprise 4.0</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-6">
                    <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-[10px] font-black text-blue-700 uppercase">Secure</span>
                    </div>
                    <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 font-bold px-3 md:px-4 h-9 md:h-11 text-xs">
                        <LogOut className="mr-2 h-4 w-4 hidden sm:inline" />
                        Logout
                    </Button>
                </div>
            </header>
            
            <div className="flex flex-1">
                {/* SIDEBAR NAVIGATION - RESPONSIVE */}
                <aside className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r shadow-xl transition-transform duration-300 md:relative md:translate-x-0 md:shadow-none p-4 mt-16 md:mt-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <nav className="space-y-1">
                        <Button variant="ghost" className="w-full justify-start h-12 rounded-xl bg-blue-50 text-blue-600 font-black uppercase text-[10px] tracking-widest">
                            <LayoutDashboard className="mr-3 h-5 w-5" /> Dashboard
                        </Button>
                        <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest">
                            <Users className="mr-3 h-5 w-5" /> User List
                        </Button>
                        <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest">
                            <Wallet className="mr-3 h-5 w-5" /> Assets
                        </Button>
                        <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest">
                            <FileClock className="mr-3 h-5 w-5" /> Logs
                        </Button>
                    </nav>

                    <Card className="mt-8 border-none shadow-sm rounded-2xl bg-slate-900 text-white p-4 relative overflow-hidden">
                        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">System</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Uptime</span>
                                <span className="text-[10px] font-black text-green-500">99.9%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Latency</span>
                                <span className="text-[10px] font-black text-blue-400">12ms</span>
                            </div>
                        </div>
                    </Card>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 p-4 md:p-8 max-w-full overflow-x-hidden">
                    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 mb-6">
                        <Card className="border-none shadow-sm rounded-3xl bg-white p-6 md:p-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Users</p>
                                    <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{totalUsers.toLocaleString()}</div>
                                </div>
                                <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </Card>
                        <Card className="border-none shadow-sm rounded-3xl bg-white p-6 md:p-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pool Assets</p>
                                    <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">₹{totalBalance.toLocaleString()}</div>
                                </div>
                                <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                    <Wallet className="h-6 w-6 text-indigo-600" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                        <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-base md:text-lg font-black text-slate-900 uppercase">User Registry</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {usersLoading ? <div className="flex justify-center p-12 md:p-20"><Loader /></div> : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="border-none">
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-6 md:pl-8 py-4 md:py-6">UID</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">User</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Balance</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-6 md:pr-8">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allUsers.map(u => (
                                                <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/50">
                                                    <TableCell className="font-mono text-xs font-black text-blue-600 pl-6 md:pl-8 py-4 md:py-6">{u.numericId}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 md:gap-3">
                                                            <Avatar className="h-8 w-8 border shadow-sm">
                                                                <AvatarImage src={u.photoURL || defaultAvatarUrl} />
                                                                <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-black text-xs md:text-sm text-slate-800 truncate">{u.displayName}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-black text-xs md:text-sm text-slate-900">₹{u.balance?.toLocaleString()}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 md:pr-8">
                                                        <Button asChild size="sm" className="rounded-lg font-black text-[10px] uppercase tracking-widest px-3 md:px-4 h-8 md:h-9 bg-slate-900">
                                                            <Link href={`/admin/users/${u.id}`}>Audit</Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>
            {/* OVERLAY FOR MOBILE SIDEBAR */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}
        </div>
    )
}

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}
