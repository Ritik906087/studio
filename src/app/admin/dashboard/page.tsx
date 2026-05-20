
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
import { LogOut, Users, LayoutDashboard, Wallet, FileClock } from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, useAuth } from '@/firebase';
import { useUser } from '@/hooks/use-user';
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const ADMIN_PHONE = '9060873927';

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

function AdminDashboard() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const auth = useAuth();
    const { user, profile, loading: authLoading } = useUser();
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        // Ensure user is logged in
        if (!user) {
            router.replace('/admin/key');
            return;
        }

        // Check if the user is the admin
        // We check both the profile phone number and the current user's email/logic
        const isAdminEmail = user.email?.includes(ADMIN_PHONE);
        const isAdminProfile = profile?.phoneNumber === ADMIN_PHONE;

        if (isAdminEmail || isAdminProfile) {
            setIsMasterAdmin(true);
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Access Denied", 
                description: "You do not have permission to access the admin panel." 
            });
            router.replace('/home');
        }
    }, [user, profile, authLoading, router, toast]);

    useEffect(() => {
        if (!firestore || !isMasterAdmin) return;

        setUsersLoading(true);
        // Listen for all users - ONLY if authenticated as admin
        const unsubUsers = onSnapshot(collection(firestore, 'users'), (snap) => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
            setUsersLoading(false);
        }, (error) => {
            console.error("Admin Users Listener Error:", error);
            if (error.code === 'permission-denied') {
                toast({ variant: 'destructive', title: "Permission Error", description: "Unable to fetch users. Check Security Rules." });
            }
            setUsersLoading(false);
        });

        return () => {
            unsubUsers();
        };
    }, [firestore, isMasterAdmin, toast]);

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            router.replace('/admin/key');
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    if (authLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader size="md" /></div>;
    }

    if (!isMasterAdmin) {
        return <div className="flex h-screen items-center justify-center font-bold text-destructive text-xl">
            Access Denied
        </div>;
    }

    const totalUsers = allUsers.length;
    const totalBalance = allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);

    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10 justify-between">
                <Logo className="text-2xl" />
                <div className="flex items-center gap-4">
                    <span className="hidden md:inline text-sm font-medium text-muted-foreground">Admin: {profile?.displayName || 'Master'}</span>
                    <Button onClick={handleLogout} variant="outline" size="sm">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </header>
            <main className="flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Tabs defaultValue="dashboard" className="w-full md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-6">
                    <TabsList className="w-full h-auto flex-row justify-start overflow-x-auto md:flex-col md:items-stretch md:justify-start">
                        <TabsTrigger value="dashboard" className="justify-start p-3"><LayoutDashboard className="mr-2" /> Dashboard</TabsTrigger>
                        <TabsTrigger value="users" className="justify-start p-3"><Users className="mr-2"/> Users</TabsTrigger>
                        <TabsTrigger value="withdrawals" className="justify-start p-3"><Wallet className="mr-2"/> Withdrawals</TabsTrigger>
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
                                    {usersLoading ? <div className="flex justify-center p-8"><Loader /></div> : (
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
                                                {allUsers.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No users found.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    )}
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
