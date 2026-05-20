
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader } from '@/components/ui/loader';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

export default function UserDetailsPage() {
    const params = useParams();
    const userId = params.userId as string;
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Simple local session check for admin
        const sessionStr = localStorage.getItem('flex_admin_session');
        if (!sessionStr) {
            router.replace('/admin/key');
            return;
        }
        setIsAdmin(true);

        if (!firestore || !userId) return;

        const unsub = onSnapshot(doc(firestore, 'users', userId), (snap) => {
            if (snap.exists()) {
                setUser({ id: snap.id, ...snap.data() });
            }
            setLoading(false);
        });

        return () => unsub();
    }, [firestore, userId, router]);

    const handleUpdateBalance = async (type: 'add' | 'deduct') => {
        const val = parseFloat(amount);
        if (!val || val <= 0) return;
        if (!firestore || !user) return;

        setIsUpdating(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.id);
                const userSnap = await transaction.get(userRef);
                const currentBalance = userSnap.data()?.balance || 0;
                const newBalance = type === 'add' ? currentBalance + val : currentBalance - val;

                if (newBalance < 0) throw new Error("Insufficient balance");

                transaction.update(userRef, { balance: newBalance });
                
                // Add system transaction record
                const txRef = doc(collection(firestore, 'users', user.id, 'transactions'));
                transaction.set(txRef, {
                    amount: val,
                    type: 'system_adjustment',
                    description: `Admin ${type === 'add' ? 'Added' : 'Deducted'} Balance`,
                    createdAt: serverTimestamp(),
                });
            });
            toast({ title: "Success", description: "Balance updated successfully." });
            setAmount('');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsUpdating(false);
        }
    };

    if (!isAdmin) return null;
    if (loading) return <div className="p-8 flex justify-center"><Loader /></div>;
    if (!user) return <div className="p-8 text-center">User not found</div>;

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon" className="h-8 w-8">
                    <Link href="/admin/dashboard"><ChevronLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold">User Details</h1>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.photoURL || defaultAvatarUrl} />
                            <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{user.displayName}</CardTitle>
                            <CardDescription>UID: {user.numericId} | {user.phoneNumber}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">₹{user.balance?.toFixed(2)}</div>
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Manage Wallet</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateBalance('add')} disabled={isUpdating}>
                                Add Balance
                            </Button>
                            <Button variant="destructive" onClick={() => handleUpdateBalance('deduct')} disabled={isUpdating}>
                                Deduct Balance
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
