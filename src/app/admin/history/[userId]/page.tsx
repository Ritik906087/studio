
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
import { ChevronLeft, Copy, Loader2, Search, X, Download, Check, Eye, ImageIcon, Info } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type UserProfile = { id: string; displayName: string; numericId: string; phoneNumber?: string; photoURL?: string; };
type Order = { id: string; orderId: string; amount: number; baseAmount?: number; status: string; utr?: string; screenshotURL?: string; createdAt: any; paymentType: string; adminPaymentMethodId?: string; approvedBy?: string; completedAt?: any; rejectionReason?: string; };
type SellOrder = { id: string; orderId: string; amount: number; remainingAmount?: number; status: string; utr?: string; withdrawalMethod: any; createdAt: any; completedAt?: any; failureReason?: string; matchedBuyOrders?: any[]; };

const DetailItem = ({ label, value, isMono = false, isCopyable = false }: { label: string, value?: string | number, isMono?: boolean, isCopyable?: boolean }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value.toString());
        toast({ title: "Copied" });
    };

    return (
        <div className="flex justify-between items-start gap-4 py-2.5 border-b border-dashed border-slate-100 last:border-0">
            <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">{label}</span>
            <div className="flex items-center gap-2 max-w-[70%]">
                <span className={cn("text-xs font-black text-slate-800 text-right break-all", isMono && "font-mono")}>
                    {value || 'N/A'}
                </span>
                {isCopyable && value && (
                    <button onClick={handleCopy} className="text-blue-500 hover:text-blue-700"><Copy className="h-3 w-3" /></button>
                )}
            </div>
        </div>
    );
};

export default function UserHistoryPage() {
    const params = useParams();
    const userId = params.userId as string;
    const { toast } = useToast();
    const firestore = useFirestore();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [buyOrders, setBuyOrders] = useState<Order[]>([]);
    const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!firestore || !userId) return;
        setLoading(true);
        try {
            const userRef = doc(firestore, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) setUser({ id: userSnap.id, ...userSnap.data() } as any);

            const buySnap = await getDocs(query(collection(firestore, 'users', userId, 'orders'), orderBy('createdAt', 'desc'), limit(50)));
            setBuyOrders(buySnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

            const sellSnap = await getDocs(query(collection(firestore, 'users', userId, 'sellOrders'), orderBy('createdAt', 'desc'), limit(50)));
            setSellOrders(sellSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        } catch (error: any) {
            console.error("Fetch Error:", error);
            toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [userId, firestore, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleViewDetail = (order: any, type: 'buy' | 'sell') => {
        setSelectedOrder({ ...order, _type: type });
        setIsDetailOpen(true);
    };
    
    if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 bg-[#F8FAFC] min-h-screen pb-24">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon" className="rounded-xl"><Link href={`/admin/users/${userId}`}><ChevronLeft /></Link></Button>
                <div>
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Audit Logs</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member: {user?.displayName} (ID: {user?.numericId})</p>
                </div>
            </div>
            
            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm font-black uppercase text-slate-500 tracking-widest">Purchase History (Buy)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Order ID</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Amount</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Status</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {buyOrders.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell className="pl-6 font-mono text-xs font-bold text-blue-600">{o.orderId}</TableCell>
                                    <TableCell className="font-black text-xs">₹{o.amount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("text-[8px] uppercase", o.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400')}>
                                            {o.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => handleViewDetail(o, 'buy')}><Eye className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm font-black uppercase text-slate-500 tracking-widest">Sales History (Sell)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Order ID</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Amount</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Status</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sellOrders.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell className="pl-6 font-mono text-xs font-bold text-emerald-600">{o.orderId}</TableCell>
                                    <TableCell className="font-black text-xs">₹{o.amount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("text-[8px] uppercase", o.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600')}>
                                            {o.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => handleViewDetail(o, 'sell')}><Eye className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* DETAIL DIALOG */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="rounded-[32px] max-w-lg overflow-hidden p-0 border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-900 text-white">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Info className="h-5 w-5 text-blue-400" /> Order Details
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                            Transaction Hash: {selectedOrder?.id}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                            <DetailItem label="Order ID" value={selectedOrder?.orderId} isMono isCopyable />
                            <DetailItem label="Type" value={selectedOrder?._type?.toUpperCase()} />
                            <DetailItem label="Total Amount" value={`₹${selectedOrder?.amount}`} />
                            {selectedOrder?.baseAmount && <DetailItem label="Base Value" value={`₹${selectedOrder.baseAmount}`} />}
                            <DetailItem label="Current Status" value={selectedOrder?.status?.toUpperCase()} />
                            <DetailItem label="Creation Date" value={selectedOrder?.createdAt?.toDate().toLocaleString()} />
                        </div>

                        {selectedOrder?._type === 'buy' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Evidence</p>
                                    <div className="bg-slate-100 rounded-2xl overflow-hidden aspect-[4/5] relative border border-slate-200">
                                        {selectedOrder?.screenshotURL ? (
                                            <img src={selectedOrder.screenshotURL} alt="Proof" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                                                <ImageIcon className="h-10 w-10" />
                                                <p className="text-[10px] font-black uppercase">No Image Uploaded</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                    <DetailItem label="UTR Number" value={selectedOrder?.utr} isMono isCopyable />
                                    <DetailItem label="Approved By" value={selectedOrder?.approvedBy || "SYSTEM"} />
                                    <DetailItem label="Settled At" value={selectedOrder?.completedAt?.toDate().toLocaleString()} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Withdrawal Method</p>
                                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                        <DetailItem label="Target Provider" value={selectedOrder?.withdrawalMethod?.name} />
                                        <DetailItem label="UPI ID / Account" value={selectedOrder?.withdrawalMethod?.upiId || selectedOrder?.withdrawalMethod?.accountNumber} isMono isCopyable />
                                        <DetailItem label="Holder Name" value={selectedOrder?.withdrawalMethod?.accountHolderName || "User Record"} />
                                    </div>
                                </div>
                                
                                {selectedOrder?.matchedBuyOrders && selectedOrder.matchedBuyOrders.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">P2P Matches ({selectedOrder.matchedBuyOrders.length})</p>
                                        <div className="space-y-2">
                                            {selectedOrder.matchedBuyOrders.map((m: any, i: number) => (
                                                <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                                                    <div>
                                                        <p className="text-[9px] font-black text-blue-600 uppercase">Buyer ID: {m.buyerId?.slice(-6)}</p>
                                                        <p className="text-xs font-black">₹{m.amount}</p>
                                                    </div>
                                                    <Badge className="text-[7px]">{m.status}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t bg-slate-50">
                        <Button className="w-full rounded-xl font-black uppercase text-[10px] h-12" onClick={() => setIsDetailOpen(false)}>Close Registry</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
