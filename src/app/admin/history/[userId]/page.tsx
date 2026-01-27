
'use client';

import React, { useMemo, useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Copy, Loader2, Search, XCircle, Download } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { doc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
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
  createdAt: Timestamp;
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
  createdAt: Timestamp;
  failureReason?: string;
};

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
    <div className="flex justify-between items-center py-2 border-b border-dashed">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-right">{value || 'N/A'}</span>
    </div>
);

const CancelledReceipt = React.forwardRef<HTMLDivElement, { order: SellOrder }>(({ order }, ref) => {
    const receiptDate = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div ref={ref} className="bg-white p-6 rounded-lg shadow-lg w-[360px] relative overflow-hidden font-sans">
            <div className="absolute inset-0 flex items-center justify-center z-0">
                <h1 className="text-[120px] font-bold text-gray-200/30 rotate-[-30deg] select-none">LG PAY</h1>
            </div>
            <div className="relative z-10">
                <div className="text-center mb-6">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                    <h2 className="text-xl font-semibold mt-4 text-red-600">Payment Failed</h2>
                    <p className="text-3xl font-bold mt-2">₹{order.amount.toFixed(2)}</p>
                </div>

                <div className="space-y-3 text-sm border-t border-dashed pt-4">
                    <div className="flex justify-between">
                        <span className="text-gray-500">To</span>
                        <span className="font-medium text-right">{order.withdrawalMethod.upiId}</span>
                    </div>
                     <div className="flex justify-between items-start">
                        <span className="text-gray-500">Reason</span>
                        <span className="font-medium text-right text-red-600 max-w-[70%]">{order.failureReason || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Order ID</span>
                        <span className="font-medium font-mono text-xs">{order.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Date & Time</span>
                        <span className="font-medium">{receiptDate}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
CancelledReceipt.displayName = 'CancelledReceipt';


const PaymentDetailsDialog = ({ order, orderType, adminPaymentMethods }: { order: Order | SellOrder, orderType: 'buy' | 'sell', adminPaymentMethods: AdminPaymentMethod[] }) => {
    const { toast } = useToast();
    const cancelledReceiptRef = useRef<HTMLDivElement>(null);

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
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">View Details</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                        <DialogDescription>
                            Order ID: {order.orderId}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 max-h-[60vh] overflow-y-auto">
                        <DetailItem label="Amount" value={`₹${order.amount.toFixed(2)}`} />
                        <DetailItem label="Status" value={order.status.replace('_', ' ')} />
                        <DetailItem label="Date" value={order.createdAt.toDate().toLocaleString()} />
                        {orderType === 'buy' ? renderBuyDetails() : renderSellDetails()}
                    </div>
                     <DialogFooter className="sm:justify-end gap-2">
                        {orderType === 'sell' && (order as SellOrder).status === 'failed' && (
                             <Button onClick={handleDownloadCancelledImage} variant="secondary">
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
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch User
    const userRef = useMemo(() => firestore && userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: user, loading: userLoading } = useDoc<UserProfile>(userRef);

    // Fetch Buy Orders
    const ordersQuery = useMemo(() => firestore && userId ? query(collection(firestore, 'users', userId, 'orders'), orderBy('createdAt', 'desc')) : null, [firestore, userId]);
    const { data: buyOrders, loading: ordersLoading } = useCollection<Order>(ordersQuery);

    // Fetch Sell Orders
    const sellOrdersQuery = useMemo(() => firestore && userId ? query(collection(firestore, 'users', userId, 'sellOrders'), orderBy('createdAt', 'desc')) : null, [firestore, userId]);
    const { data: sellOrders, loading: sellOrdersLoading } = useCollection<SellOrder>(sellOrdersQuery);

    // Fetch Admin Payment Methods
    const paymentMethodsQuery = useMemo(() => firestore ? collection(firestore, "paymentMethods") : null, [firestore]);
    const { data: adminPaymentMethods, loading: paymentMethodsLoading } = useCollection<AdminPaymentMethod>(paymentMethodsQuery);
    
    const filteredBuyOrders = useMemo(() => {
        if (!buyOrders) return [];
        if (!searchTerm.trim()) return buyOrders;
        return buyOrders.filter(order => order.orderId && order.orderId.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [buyOrders, searchTerm]);

    const filteredSellOrders = useMemo(() => {
        if (!sellOrders) return [];
        if (!searchTerm.trim()) return sellOrders;
        return sellOrders.filter(order => order.orderId && order.orderId.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [sellOrders, searchTerm]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: 'UID Copied!' });
        });
    };

    const loading = userLoading || ordersLoading || sellOrdersLoading || paymentMethodsLoading;

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
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
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
                    placeholder="Search by Order ID..."
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
                                    <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                                    <TableCell>₹{order.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{order.status.replace('_', ' ')}</TableCell>
                                    <TableCell className="text-xs">{order.createdAt.toDate().toLocaleDateString()}</TableCell>
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
                                    <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                                    <TableCell>₹{order.amount.toFixed(2)}</TableCell>
                                    <TableCell className="capitalize">{order.status}</TableCell>
                                    <TableCell className="text-xs">{order.createdAt.toDate().toLocaleDateString()}</TableCell>
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
        </main>
    )
}
