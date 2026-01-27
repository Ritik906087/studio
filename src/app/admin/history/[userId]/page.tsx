
'use client';

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
import { ChevronLeft, Copy, Loader2 } from 'lucide-react';
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
import React, { useMemo } from 'react';
import Link from 'next/link';

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


const PaymentDetailsDialog = ({ order, orderType, adminPaymentMethods }: { order: Order | SellOrder, orderType: 'buy' | 'sell', adminPaymentMethods: AdminPaymentMethod[] }) => {
    
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
                <DetailItem label="UTR" value={sellOrder.utr} />
            </div>
         )
    };
    
    return (
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
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function UserHistoryPage() {
    const params = useParams();
    const userId = params.userId as string;
    const firestore = useFirestore();
    const { toast } = useToast();

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
                            {buyOrders && buyOrders.length > 0 ? buyOrders.map(order => (
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
                            {sellOrders && sellOrders.length > 0 ? sellOrders.map(order => (
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
