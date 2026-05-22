
'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { ChevronLeft, Copy, Loader2, Search, X, Download, Check } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useFirestore } from '@/firebase';
import { doc, collection, query, where, getDoc, getDocs, orderBy, limit } from 'firebase/firestore';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

type UserProfile = { id: string; displayName: string; numericId: string; phoneNumber?: string; photoURL?: string; };
type Order = { id: string; orderId: string; amount: number; status: string; utr?: string; screenshotURL?: string; createdAt: any; paymentType: string; adminPaymentMethodId?: string; };
type SellOrder = { id: string; orderId: string; amount: number; status: string; utr?: string; withdrawalMethod: any; createdAt: any; completedAt?: any; failureReason?: string; };
type RewardTransaction = { id: string; description: string; amount: number; createdAt: any; };
type AdminPaymentMethod = { id: string; type: 'bank' | 'upi'; bankName?: string; accountHolderName?: string; accountNumber?: string; ifscCode?: string; upiHolderName?: string; upiId?: string; };

const DetailItem = ({ label, value }: { label: string, value?: string | number }) => (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-dashed">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-semibold text-right break-all">{value || 'N/A'}</span>
    </div>
);

export default function UserHistoryPage() {
    const params = useParams();
    const userId = params.userId as string;
    const { toast } = useToast();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const [user, setUser] = useState<UserProfile | null>(null);
    const [buyOrders, setBuyOrders] = useState<Order[]>([]);
    const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
    const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>([]);
    const [adminPaymentMethods, setAdminPaymentMethods] = useState<AdminPaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!firestore || !userId) return;
        setLoading(true);
        try {
            const userRef = doc(firestore, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) setUser({ id: userSnap.id, ...userSnap.data() } as any);

            const buySnap = await getDocs(query(collection(firestore, 'users', userId, 'orders'), orderBy('createdAt', 'desc'), limit(25)));
            setBuyOrders(buySnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

            const sellSnap = await getDocs(query(collection(firestore, 'users', userId, 'sellOrders'), orderBy('createdAt', 'desc'), limit(25)));
            setSellOrders(sellSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

            const rewardSnap = await getDocs(query(collection(firestore, 'users', userId, 'transactions'), orderBy('createdAt', 'desc'), limit(50)));
            setRewardTransactions(rewardSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

            const adminPMSnap = await getDocs(collection(firestore, 'paymentMethods'));
            setAdminPaymentMethods(adminPMSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        } catch (error: any) {
            console.error("Fetch Error:", error);
            toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [userId, firestore, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon"><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
                <h1 className="text-xl font-bold">History: {user?.displayName}</h1>
            </div>
            
            <Card><CardHeader><CardTitle>Purchase History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {buyOrders.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-mono text-xs">{o.orderId}</TableCell>
                                    <TableCell>₹{o.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{o.status.replace('_', ' ')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card><CardHeader><CardTitle>Sales History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {sellOrders.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-mono text-xs">{o.orderId}</TableCell>
                                    <TableCell>₹{o.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{o.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}
