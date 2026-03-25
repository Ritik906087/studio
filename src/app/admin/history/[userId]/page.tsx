
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
import { useParams, useRouter } from 'next/navigation';
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
import { supabase } from '@/lib/supabase';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

// Types
type UserProfile = {
    id: string;
    displayName: string;
    numericId: string;
    phoneNumber?: string;
    photoURL?: string;
};

type Order = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  utr?: string;
  screenshotURL?: string;
  createdAt: string;
  paymentType: 'bank' | 'upi';
  paymentProvider?: string;
  adminPaymentMethodId?: string;
};

type SellOrder = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  utr?: string;
  withdrawalMethod: { name: string, upiId: string };
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
};

type RewardTransaction = {
    id: string;
    description: string;
    amount: number;
    createdAt: string;
}

type AdminPaymentMethod = {
    id: string;
    type: 'bank' | 'upi';
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiHolderName?: string;
    upiId?: string;
}

const DetailItem = ({ label, value }: { label: string, value?: string | number }) => (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-dashed">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-semibold text-right break-all">{value || 'N/A'}</span>
    </div>
);

const CancelledReceipt = React.forwardRef<HTMLDivElement, { order: SellOrder }>(({ order }, ref) => {
    const transactionDate = new Date(order.createdAt);
    const receiptDate = transactionDate.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div ref={ref} className="bg-background rounded-2xl shadow-lg w-[360px] overflow-hidden font-sans">
             <div className="bg-destructive p-4 text-center text-destructive-foreground">
                <h1 className="font-bold text-lg">Payment Status</h1>
            </div>
             <div className="p-4">
                <div className="text-center py-4">
                     <div className="mx-auto w-20 h-20 rounded-full bg-red-100 grid place-items-center">
                        <div className="w-14 h-14 rounded-full bg-red-500 grid place-items-center shadow-lg shadow-red-500/40">
                             <X className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-lg font-extrabold mt-3 text-red-600">Payment Failed</h2>
                    <p className="text-4xl font-black mt-2">₹{order.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[80%] mx-auto">{order.failureReason || 'Transaction could not be completed'}</p>
                </div>
                
                <div className="space-y-3 text-sm border-t border-dashed pt-4">
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">To</span>
                        <span className="font-bold text-right break-all">{order.withdrawalMethod.upiId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Order ID</span>
                        <span className="font-mono font-bold break-all">{order.orderId}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Reason</span>
                        <span className="font-bold text-right max-w-[60%]">{order.failureReason || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Date & Time</span>
                        <span className="font-bold">{receiptDate}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
CancelledReceipt.displayName = 'CancelledReceipt';

const SuccessfulReceipt = React.forwardRef<HTMLDivElement, { order: SellOrder }>(({ order }, ref) => {
    const transactionDate = order.completedAt ? new Date(order.completedAt) : new Date(order.createdAt);
    const receiptDate = transactionDate.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div ref={ref} className="bg-background rounded-2xl shadow-lg w-[360px] overflow-hidden font-sans">
            <div className="bg-primary p-4 text-center text-primary-foreground">
                <h1 className="font-bold text-lg">Payment Status</h1>
            </div>
            <div className="p-4">
                <div className="text-center py-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-green-100 grid place-items-center">
                        <div className="w-14 h-14 rounded-full bg-green-500 grid place-items-center shadow-lg shadow-green-500/40">
                             <Check className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-lg font-extrabold mt-3">Payment Successful</h2>
                    <p className="text-4xl font-black mt-2">₹{order.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Transaction completed successfully</p>
                </div>
                
                <div className="space-y-3 text-sm border-t border-dashed pt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">To</span>
                        <span className="font-bold text-right break-all">{order.withdrawalMethod.upiId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">UTR Number</span>
                        <span className="font-mono font-bold break-all">{order.utr || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Order ID</span>
                        <span className="font-mono font-bold break-all">{order.orderId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Date & Time</span>
                        <span className="font-bold">{receiptDate}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
SuccessfulReceipt.displayName = 'SuccessfulReceipt';


const PaymentDetailsDialog = ({ order, orderType, adminPaymentMethods }: { order: Order | SellOrder, orderType: 'buy' | 'sell', adminPaymentMethods: AdminPaymentMethod[] }) => {
    const { toast } = useToast();
    const cancelledReceiptRef = useRef<HTMLDivElement>(null);
    const successfulReceiptRef = useRef<HTMLDivElement>(null);

    const handleDownloadCancelledImage = async () => {
        if (!cancelledReceiptRef.current) return;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(cancelledReceiptRef.current, { backgroundColor: '#ffffff', scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `LGPAY-Receipt-Failed-${order.orderId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Download Failed' });
        }
    };

    const handleDownloadSuccessfulImage = async () => {
        if (!successfulReceiptRef.current) return;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(successfulReceiptRef.current, { backgroundColor: '#ffffff', scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `LGPAY-Receipt-Success-${order.orderId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Download Failed' });
        }
    };
    
    const renderBuyDetails = () => {
        const buyOrder = order as Order;
        const adminMethod = adminPaymentMethods.find(m => m.id === buyOrder.adminPaymentMethodId);
        
        return (
            <div className="space-y-2">
                <h4 className="font-semibold pt-2">Payment To:</h4>
                {adminMethod?.type === 'bank' && (
                    <>
                        <DetailItem label="Bank Name" value={adminMethod.bankName} />
                        <DetailItem label="Account Holder" value={adminMethod.accountHolderName} />
                        <DetailItem label="Account Number" value={adminMethod.accountNumber} />
                        <DetailItem label="IFSC Code" value={adminMethod.ifscCode} />
                    </>
                )}
                {adminMethod?.type === 'upi' && (
                     <>
                        <DetailItem label="UPI Holder Name" value={adminMethod.upiHolderName} />
                        <DetailItem label="UPI ID" value={adminMethod.upiId} />
                    </>
                )}
                {!adminMethod && <p className="text-xs text-muted-foreground">Admin payment details not found.</p>}

                <h4 className="font-semibold pt-4">User Payment:</h4>
                 <DetailItem label="UTR" value={buyOrder.utr} />
                 {buyOrder.screenshotURL && (
                    <div className="flex justify-between items-center py-2">
                         <span className="text-sm text-muted-foreground">Screenshot</span>
                         <Button asChild size="sm" variant="link">
                            <a href={buyOrder.screenshotURL} target="_blank" rel="noopener noreferrer">View</a>
                         </Button>
                    </div>
                 )}
            </div>
        )
    };

    const renderSellDetails = () => {
         const sellOrder = order as SellOrder;
         return (
             <div className="space-y-2">
                <h4 className="font-semibold pt-2">Withdrawal To:</h4>
                <DetailItem label="UPI Provider" value={sellOrder.withdrawalMethod.name} />
                <DetailItem label="UPI ID" value={sellOrder.withdrawalMethod.upiId} />
                <h4 className="font-semibold pt-4">Admin Payment:</h4>
                {sellOrder.status === 'failed' ? (
                     <DetailItem label="Failure Reason" value={sellOrder.failureReason} />
                ) : (
                    <DetailItem label="UTR" value={sellOrder.utr} />
                )}
            </div>
         )
    };
    
    return (
        <>
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {orderType === 'sell' && (order as SellOrder).status === 'failed' && <CancelledReceipt ref={cancelledReceiptRef} order={order as SellOrder} />}
                {orderType === 'sell' && (order as SellOrder).status === 'completed' && <SuccessfulReceipt ref={successfulReceiptRef} order={order as SellOrder} />}
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">View Details</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                        <DialogDescription>
                            Order ID: <span className="break-all">{order.orderId}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 max-h-[60vh] overflow-y-auto">
                        <DetailItem label="Amount" value={`₹${order.amount.toFixed(2)}`} />
                        <DetailItem label="Status" value={order.status.replace('_', ' ')} />
                        <DetailItem label="Date" value={new Date(order.createdAt).toLocaleString()} />
                        {orderType === 'buy' ? renderBuyDetails() : renderSellDetails()}
                    </div>
                     <DialogFooter className="sm:justify-end gap-2">
                        {orderType === 'sell' && (order as SellOrder).status === 'failed' && (
                             <Button onClick={handleDownloadCancelledImage} variant="secondary">
                                <Download className="mr-2 h-4 w-4"/>
                                Download Receipt
                            </Button>
                        )}
                        {orderType === 'sell' && (order as SellOrder).status === 'completed' && (
                             <Button onClick={handleDownloadSuccessfulImage} variant="secondary">
                                <Download className="mr-2 h-4 w-4"/>
                                Download Receipt
                            </Button>
                        )}
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default function UserHistoryPage() {
    const params = useParams();
    const userId = params.userId as string;
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const [user, setUser] = useState<UserProfile | null>(null);
    const [buyOrders, setBuyOrders] = useState<Order[]>([]);
    const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
    const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>([]);
    const [adminPaymentMethods, setAdminPaymentMethods] = useState<AdminPaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [userRes, buyRes, sellRes, rewardRes, paymentMethodRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', userId).single(),
                supabase.from('orders').select('*').eq('userId', userId).order('created_at', { ascending: false }).limit(25),
                supabase.from('sell_orders').select('*').eq('userId', userId).order('created_at', { ascending: false }).limit(25),
                supabase.from('transactions').select('*').eq('userId', userId).order('created_at', { ascending: false }).limit(50),
                supabase.from('payment_methods').select('*')
            ]);

            if (userRes.error) throw userRes.error;
            setUser(userRes.data);

            if (buyRes.error) throw buyRes.error;
            setBuyOrders(buyRes.data);

            if (sellRes.error) throw sellRes.error;
            setSellOrders(sellRes.data);

            if (rewardRes.error) throw rewardRes.error;
            setRewardTransactions(rewardRes.data);

            if (paymentMethodRes.error) throw paymentMethodRes.error;
            setAdminPaymentMethods(paymentMethodRes.data);

        } catch (error: any) {
            console.error("Error fetching user history:", error);
            toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [userId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const filteredBuyOrders = useMemo(() => {
        if (!buyOrders) return [];
        const lowercasedTerm = searchTerm.toLowerCase().trim();
        if (!lowercasedTerm) return buyOrders;
        return buyOrders.filter(order => 
            (order.orderId && order.orderId.toLowerCase().includes(lowercasedTerm)) ||
            (order.utr && order.utr.toLowerCase().includes(lowercasedTerm))
        );
    }, [buyOrders, searchTerm]);

    const filteredSellOrders = useMemo(() => {
        if (!sellOrders) return [];
        const lowercasedTerm = searchTerm.toLowerCase().trim();
        if (!lowercasedTerm) return sellOrders;
        return sellOrders.filter(order => 
            (order.orderId && order.orderId.toLowerCase().includes(lowercasedTerm)) ||
            (order.utr && order.utr.toLowerCase().includes(lowercasedTerm))
        );
    }, [sellOrders, searchTerm]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: 'UID Copied!' });
        });
    };

     if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p>Loading History...</p>
            </div>
        )
    }

    if (!user) {
        return (
             <div className="p-8">
                 <Card className="bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription className="text-destructive/80">
                            Could not load user data.
                        </CardDescription>
                    </CardHeader>
                </Card>
             </div>
        )
    }
    
    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon" className="h-8 w-8">
                    <Link href="/admin/dashboard">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <div className="flex items-center gap-4">
                     <Avatar className="h-12 w-12">
                        <AvatarImage src={defaultAvatarUrl} alt={user.displayName} />
                        <AvatarFallback className="bg-muted">
                            {user.displayName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-xl font-semibold">{user.displayName}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" onClick={() => copyToClipboard(user.numericId)}>
                            <span>UID: {user.numericId}</span>
                            <Copy className="h-3 w-3" />
                        </div>
                    </div>
                </div>
            </div>
            
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by Order ID or UTR..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 max-w-sm"
                />
              </div>

            <Card>
                <CardHeader><CardTitle>Buy Order History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBuyOrders && filteredBuyOrders.length > 0 ? filteredBuyOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs break-all">{order.orderId}</TableCell>
                                    <TableCell>₹{order.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{order.status.replace('_', ' ')}</TableCell>
                                    <TableCell className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <PaymentDetailsDialog order={order} orderType="buy" adminPaymentMethods={adminPaymentMethods || []} />
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No buy orders found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Sell Order History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSellOrders && filteredSellOrders.length > 0 ? filteredSellOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs break-all">{order.orderId}</TableCell>
                                    <TableCell>₹{order.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{order.status}</TableCell>
                                    <TableCell className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <PaymentDetailsDialog order={order} orderType="sell" adminPaymentMethods={[]} />
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No sell orders found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Reward History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rewardTransactions && rewardTransactions.length > 0 ? rewardTransactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell>₹{tx.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-xs">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">No reward transactions found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    )
}
