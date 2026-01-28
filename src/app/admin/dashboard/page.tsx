
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { LogOut, Users, LayoutDashboard, Wallet, Eye, Search, Landmark, Banknote, Trash2, Loader2, Clock, History, CheckCircle, Download, XCircle, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, addDoc, doc, deleteDoc, collectionGroup, query, where, getDocs, updateDoc, Timestamp, runTransaction, limit, orderBy, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

type UserProfile = {
    id: string;
    displayName: string;
    numericId: string;
    balance: number;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
    createdAt: Timestamp;
};

type PaymentMethod = {
    id: string;
    type: 'bank' | 'upi';
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiHolderName?: string;
    upiId?: string;
}

type SellOrder = {
    id: string;
    userId: string;
    userNumericId: string;
    userPhoneNumber: string;
    orderId: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    withdrawalMethod: { name: string, upiId: string };
    createdAt: Timestamp;
    failureReason?: string;
}

type ChatRequest = {
    id: string;
    userId?: string;
    userNumericId?: string;
    enteredIdentifier: string;
    status: 'pending' | 'active' | 'closed';
    createdAt: Timestamp;
    chatHistory: { text: string; isUser: boolean; timestamp: number }[];
    agentId?: string;
    agentJoinedAt?: Timestamp;
}

const CountdownTimer = ({ expiryTimestamp, className }: { expiryTimestamp: Timestamp, className?: string }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const expiryTime = expiryTimestamp.toDate().getTime();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = expiryTime - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("Expired");
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp]);

    return (
        <div className={cn(
            "flex items-center gap-1 text-xs font-mono",
            timeLeft === "Expired" ? "text-red-500" : "text-yellow-600",
            className
        )}>
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
        </div>
    );
};

const UserCard = React.memo(({ user }: { user: UserProfile }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-base">{user.displayName}</CardTitle>
                    <CardDescription>UID: {user.numericId}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-xl font-bold">{(user.balance || 0).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">LGB</span></p>
                <p className="text-xs text-muted-foreground pt-2">{user.phoneNumber || 'No phone number'}</p>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full" variant="outline">
                    <Link href={`/admin/users/${user.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View User
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
});
UserCard.displayName = 'UserCard';


function UsersGrid({ users, loading, error }: { users: UserProfile[], loading: boolean, error: any }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex-row items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Fetching Users</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Could not retrieve user data. Your current Firestore security rules may be blocking this query. For this feature to work, an admin must have read access to the 'users' collection.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }
    
    if (users.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    No users found.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user) => (
                <UserCard key={user.id} user={user} />
            ))}
        </div>
    );
}

function BankDetailsForm({ onAdd }: { onAdd: (details: Omit<PaymentMethod, 'id' | 'type'>) => Promise<void> }) {
    const [bankName, setBankName] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!bankName || !accountHolderName || !accountNumber || !ifscCode) {
            alert('Please fill all fields');
            return;
        }
        setIsLoading(true);
        await onAdd({ bankName, accountHolderName, accountNumber, ifscCode });
        setIsLoading(false);
        setBankName('');
        setAccountHolderName('');
        setAccountNumber('');
        setIfscCode('');
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add Bank Account</CardTitle>
                <CardDescription>Enter the details of the bank account to be added.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input id="bank-name" placeholder="e.g., State Bank of India" value={bankName} onChange={e => setBankName(e.target.value)} disabled={isLoading}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="account-holder-name">Account Holder Name</Label>
                    <Input id="account-holder-name" placeholder="e.g., John Doe" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} disabled={isLoading}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input id="account-number" placeholder="e.g., 1234567890" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} disabled={isLoading}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ifsc-code">IFSC Code</Label>
                    <Input id="ifsc-code" placeholder="e.g., SBIN0001234" value={ifscCode} onChange={e => setIfscCode(e.target.value)} disabled={isLoading}/>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Add Bank Account
                </Button>
            </CardFooter>
        </Card>
    );
}

function UpiDetailsForm({ onAdd }: { onAdd: (details: Omit<PaymentMethod, 'id' | 'type'>) => Promise<void> }) {
    const [upiHolderName, setUpiHolderName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async () => {
        if(!upiHolderName || !upiId) {
            alert('Please fill all fields');
            return;
        }
        setIsLoading(true);
        await onAdd({ upiHolderName, upiId });
        setIsLoading(false);
        setUpiHolderName('');
        setUpiId('');
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle>Add UPI ID</CardTitle>
                <CardDescription>Enter the details of the UPI ID to be added.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="upi-holder-name">Name</Label>
                    <Input id="upi-holder-name" placeholder="e.g., John Doe" value={upiHolderName} onChange={e => setUpiHolderName(e.target.value)} disabled={isLoading}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input id="upi-id" placeholder="e.g., johndoe@upi" value={upiId} onChange={e => setUpiId(e.target.value)} disabled={isLoading}/>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Add UPI ID
                </Button>
            </CardFooter>
        </Card>
    );
}

function PaymentMethodsList({ methods, loading, onDelete }: { methods: PaymentMethod[], loading: boolean, onDelete: (id: string) => void }) {
    if (loading) {
        return <Skeleton className="h-32 w-full mt-8"/>
    }

    if (!methods || methods.length === 0) {
        return null;
    }

    const bankAccounts = methods.filter(m => m.type === 'bank');
    const upiAccounts = methods.filter(m => m.type === 'upi');

    return (
        <div className="mt-8 space-y-6">
            {bankAccounts.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Saved Bank Accounts</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {bankAccounts.map(method => (
                            <Card key={method.id} className="p-4 bg-muted/50 flex justify-between items-start">
                                <div className="text-sm space-y-1">
                                    <p><span className="font-semibold">Bank:</span> {method.bankName}</p>
                                    <p><span className="font-semibold">Holder:</span> {method.accountHolderName}</p>
                                    <p><span className="font-semibold">Account No:</span> {method.accountNumber}</p>
                                    <p><span className="font-semibold">IFSC:</span> {method.ifscCode}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(method.id)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            )}
            {upiAccounts.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Saved UPI IDs</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {upiAccounts.map(method => (
                             <Card key={method.id} className="p-4 bg-muted/50 flex justify-between items-start">
                                <div className="text-sm space-y-1">
                                    <p><span className="font-semibold">Name:</span> {method.upiHolderName}</p>
                                    <p><span className="font-semibold">UPI ID:</span> {method.upiId}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(method.id)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

const PaymentReceipt = React.forwardRef<HTMLDivElement, { order: SellOrder; utr: string }>(({ order, utr }, ref) => {
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
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <h2 className="text-xl font-semibold mt-4">Payment Successful</h2>
                    <p className="text-3xl font-bold mt-2">₹{order.amount.toFixed(2)}</p>
                </div>

                <div className="space-y-3 text-sm border-t border-dashed pt-4">
                    <div className="flex justify-between">
                        <span className="text-gray-500">To</span>
                        <span className="font-medium text-right">{order.withdrawalMethod.upiId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">From</span>
                        <span className="font-medium">LG PAY ADMIN</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500">UTR Number</span>
                        <span className="font-medium font-mono">{utr || 'XXXXXXXXXXXXXXXX'}</span>
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
PaymentReceipt.displayName = 'PaymentReceipt';


function ProcessWithdrawalDialog({ order, onProcessed }: { order: SellOrder, onProcessed: () => void }) {
    const [utr, setUtr] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [open, setOpen] = useState(false);
    const [showRejectionUI, setShowRejectionUI] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();
    const receiptRef = useRef<HTMLDivElement>(null);

    const handleConfirm = async () => {
        if (utr.length !== 12 || !/^\d+$/.test(utr)) {
            toast({ variant: 'destructive', title: 'Invalid UTR', description: 'UTR must be 12 digits.' });
            return;
        }
        setIsConfirming(true);
        try {
            const orderRef = doc(firestore, 'users', order.userId, 'sellOrders', order.id);
            await updateDoc(orderRef, {
                status: 'completed',
                utr: utr,
            });
            toast({ title: 'Withdrawal Confirmed!', description: `Order ${order.orderId} marked as completed.` });
            setOpen(false);
            onProcessed();
        } catch (e: any) {
            console.error("Failed to confirm withdrawal:", e);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsConfirming(false);
        }
    };
    
     const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for rejection.' });
            return;
        }
        setIsRejecting(true);
        try {
            const orderRef = doc(firestore, 'users', order.userId, 'sellOrders', order.id);
            const userRef = doc(firestore, 'users', order.userId);

            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) {
                    throw new Error("User not found");
                }
                const newBalance = userDoc.data().balance + order.amount;
                transaction.update(orderRef, {
                    status: 'failed',
                    failureReason: rejectionReason,
                });
                transaction.update(userRef, { balance: newBalance });
            });

            toast({ title: 'Withdrawal Rejected', description: `Order ${order.orderId} has been rejected and amount refunded.` });
            setOpen(false);
            onProcessed();
        } catch (e: any) {
            console.error("Failed to reject withdrawal:", e);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsRejecting(false);
        }
    };

    const handleDownloadImage = async () => {
        if (!receiptRef.current) {
            toast({ variant: 'destructive', title: 'Error', description: 'Receipt element not found.' });
            return;
        }
        if (!utr || utr.length !== 12) {
            toast({ variant: 'destructive', title: 'Invalid UTR', description: 'Please enter a 12-digit UTR before downloading.' });
            return;
        }

        setIsDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher scale for better resolution
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `LGPAY-Receipt-${order.orderId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to download image:', error);
            toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate receipt image.' });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
            {/* Hidden receipt for capturing */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <PaymentReceipt ref={receiptRef} order={order} utr={utr} />
            </div>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setShowRejectionUI(false); }}>
                <DialogTrigger asChild>
                    <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold">View Details</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Withdrawal</DialogTitle>
                        <div className="flex justify-between items-center text-sm pt-2">
                            <CardDescription>Order ID: {order.orderId}</CardDescription>
                            <CountdownTimer expiryTimestamp={new Timestamp(order.createdAt.seconds + 30 * 60, order.createdAt.nanoseconds)} />
                        </div>
                    </DialogHeader>
                    {showRejectionUI ? (
                        <div className="py-4 space-y-2">
                            <Label htmlFor="rejection-reason">Reason for Rejection</Label>
                            <Input id="rejection-reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g., Invalid UPI details" />
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <p><strong>Amount:</strong> <span className="font-bold text-lg text-primary">₹{order.amount}</span></p>
                            <p><strong>User UID:</strong> {order.userNumericId}</p>
                            <p><strong>Phone:</strong> {order.userPhoneNumber}</p>
                            <p><strong>To ({order.withdrawalMethod.name}):</strong> {order.withdrawalMethod.upiId}</p>
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="utr">12-Digit UTR Number</Label>
                                <Input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={12} placeholder="Enter payment UTR" />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row sm:items-center gap-2">
                         <Button asChild variant="secondary" className="sm:mr-auto">
                            <Link href={`/admin/users/${order.userId}`} target="_blank">View User</Link>
                        </Button>
                        {showRejectionUI ? (
                             <div className="flex gap-2 justify-end">
                                <Button variant="ghost" onClick={() => setShowRejectionUI(false)} disabled={isRejecting}>Back</Button>
                                <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectionReason.trim()}>
                                    {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Confirm Rejection
                                </Button>
                             </div>
                        ) : (
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" className="text-primary border-primary" onClick={handleDownloadImage} disabled={isDownloading || isConfirming}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                    Receipt
                                </Button>
                                <Button variant="destructive" onClick={() => setShowRejectionUI(true)} disabled={isConfirming}>Reject</Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={handleConfirm} disabled={isConfirming || !utr || utr.length !== 12}>
                                    {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Confirm
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function WithdrawalsTabContent() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [orders, setOrders] = useState<SellOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null); // Added for error handling

    const fetchWithdrawals = useCallback(async () => {
        if (!firestore) return;
        setLoading(true);
        setError(null); // Reset error on new fetch
        try {
            // This query fetches all sell orders. We then filter for 'pending' on the client-side.
            // This approach is used to avoid a Firestore index requirement for the collectionGroup query.
            // It may become inefficient if there's a very large number of total sell orders.
            const q = query(collectionGroup(firestore, 'sellOrders'));
            const querySnapshot = await getDocs(q);
            const allOrders = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as SellOrder))
                .filter(order => order.status === 'pending')
                .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
            setOrders(allOrders);
        } catch (error) {
            console.error("Error fetching withdrawals:", error);
            setError(error);
        } finally {
            setLoading(false);
        }
    }, [firestore]);

    useEffect(() => {
        fetchWithdrawals();
    }, [fetchWithdrawals]);

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return orders;
        const lowercasedTerm = searchTerm.toLowerCase();
        return orders.filter(order =>
            order.orderId.toLowerCase().includes(lowercasedTerm) ||
            order.userNumericId.toLowerCase().includes(lowercasedTerm) ||
            order.userPhoneNumber?.toLowerCase().includes(lowercasedTerm)
        );
    }, [orders, searchTerm]);

    if (error) { // Added error UI
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Fetching Withdrawals</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Could not retrieve withdrawal data. This might be due to Firestore security rules or a missing database index.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <p className="text-xs text-destructive/80 font-mono bg-destructive/10 p-2 rounded-md break-all">
                        {error.message}
                    </p>
                 </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by Order ID, UID, or Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 max-w-sm"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
                </div>
            ) : filteredOrders.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No pending withdrawals found.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map(order => (
                        <Card key={order.id} className="flex flex-col">
                            <CardContent className="flex-grow p-4 space-y-2 text-sm">
                                <p><strong>Amount:</strong> <span className="font-bold text-lg text-primary">₹{order.amount}</span></p>
                                <p><strong>User UID:</strong> {order.userNumericId}</p>
                                <p><strong>Phone:</strong> {order.userPhoneNumber}</p>
                            </CardContent>
                            <CardFooter className="p-4 pt-0">
                                <ProcessWithdrawalDialog order={order} onProcessed={fetchWithdrawals} />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function HistoryUsersGrid({ users, loading, error }: { users: UserProfile[], loading: boolean, error: any }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </CardHeader>
                         <CardContent>
                             <Skeleton className="h-4 w-full" />
                         </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Fetching Users</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Could not retrieve user data.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }
    
    if (users.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    No users found.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user) => (
            <Card key={user.id} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-base">{user.displayName}</CardTitle>
                    <CardDescription>UID: {user.numericId}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                     <p className="text-sm text-muted-foreground">{user.phoneNumber || 'No phone number'}</p>
                </CardContent>
                <CardFooter>
                     <Button asChild className="w-full" variant="outline">
                        <Link href={`/admin/history/${user.id}`}>
                            <History className="mr-2 h-4 w-4" />
                            View History
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
    );
}

function ChatHistoryDialog({ request }: { request: ChatRequest }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [open, setOpen] = useState(false);
    const [isJoined, setIsJoined] = useState(request.status === 'active');

    const handleJoinChat = async () => {
        if (!firestore) return;
        setIsUpdating(true);
        try {
            const requestRef = doc(firestore, 'chatRequests', request.id);
            await updateDoc(requestRef, { status: 'active', agentId: 'admin', agentJoinedAt: serverTimestamp() });
            setIsJoined(true);
            toast({ title: 'Chat Joined!', description: "You can now chat with the user." });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to join chat' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleCloseChat = async () => {
        if (!firestore) return;
        setIsUpdating(true);
        try {
            const requestRef = doc(firestore, 'chatRequests', request.id);
            await updateDoc(requestRef, { status: 'closed' });
            setOpen(false); // Close the dialog on successful closing
            toast({ title: `Chat closed` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to close chat' });
        } finally {
            setIsUpdating(false);
        }
    };

    const expiryTimestamp = new Timestamp(request.createdAt.seconds + 10 * 60, request.createdAt.nanoseconds);
    const isPending = request.status === 'pending';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={cn(
                    "w-full font-bold",
                    isPending ? "bg-green-500 hover:bg-green-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                )}>
                    {isPending ? "CHAT" : "VIEW ACTIVE CHAT"}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex justify-between items-center">
                       <span>Chat with {request.userNumericId || request.enteredIdentifier}</span>
                       <CountdownTimer expiryTimestamp={expiryTimestamp} className="text-base" />
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-96 w-full bg-secondary/50 p-4">
                    {request.chatHistory.map((msg, index) => (
                        <div key={index} className={cn("flex items-end gap-2 mb-3", msg.isUser ? "justify-end" : "justify-start")}>
                            {!msg.isUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">LG</AvatarFallback>
                                </Avatar>
                            )}
                            <div className="flex flex-col max-w-[80%]">
                                <div className={cn("rounded-2xl px-3 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white rounded-bl-none shadow-sm")}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                <p className={cn("text-xs text-muted-foreground px-1 pt-1", msg.isUser ? "text-right" : "text-left")}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </p>
                            </div>
                             {msg.isUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{request.userNumericId?.charAt(0) ?? 'U'}</AvatarFallback>
                                </Avatar>
                             )}
                        </div>
                    ))}
                </ScrollArea>
                <DialogFooter className="p-4 border-t">
                    {isJoined ? (
                         <div className="w-full flex justify-between items-center">
                            <p className="text-sm text-green-600 font-semibold flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                User is Online
                            </p>
                            <Button variant="outline" onClick={handleCloseChat} disabled={isUpdating}>Close Chat</Button>
                         </div>
                    ) : (
                        <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg" onClick={handleJoinChat} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : "JOIN CHAT"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function LiveChatTabContent() {
    const firestore = useFirestore();
    const chatRequestsQuery = useMemo(() => firestore ? query(collection(firestore, 'chatRequests'), where('status', 'in', ['pending', 'active'])) : null, [firestore]);
    const { data: unsortedChatRequests, loading, error } = useCollection<ChatRequest>(chatRequestsQuery);

    const chatRequests = useMemo(() => {
        if (!unsortedChatRequests) return [];
        return [...unsortedChatRequests].sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });
    }, [unsortedChatRequests]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
        );
    }
    
    if (error) {
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Fetching Chat Requests</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Could not retrieve chat data. This can be caused by Firestore security rules or a missing database index.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <p className="text-xs text-destructive/80 font-mono bg-destructive/10 p-2 rounded-md break-all">
                        {error.message}
                    </p>
                 </CardContent>
            </Card>
        )
    }

    if (!chatRequests || chatRequests.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    No pending or active live chat requests.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chatRequests.map(request => {
                 const isPending = request.status === 'pending';
                 return (
                    <Card key={request.id} className={cn("flex flex-col", !isPending && "bg-blue-50 border-blue-200")}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base">{isPending ? "New Chat Request" : "Active Chat"}</CardTitle>
                                    <CardDescription>
                                        {new Date(request.createdAt.toDate()).toLocaleString()}
                                    </CardDescription>
                                </div>
                                {isPending && <CountdownTimer expiryTimestamp={new Timestamp(request.createdAt.seconds + 10 * 60, request.createdAt.nanoseconds)} />}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2 text-sm">
                            <p><strong>User UID:</strong> {request.userNumericId || 'N/A'}</p>
                            <p><strong>Identifier:</strong> {request.enteredIdentifier}</p>
                        </CardContent>
                        <CardFooter>
                            <ChatHistoryDialog request={request} />
                        </CardFooter>
                    </Card>
                 )
            })}
        </div>
    );
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const usersQuery = useMemo(() => firestore ? query(collection(firestore, "users"), orderBy('createdAt', 'desc'), limit(50)) : null, [firestore]);
    const { data: allUsers, loading, error } = useCollection<UserProfile>(usersQuery);
    
    const paymentMethodsQuery = useMemo(() => firestore ? collection(firestore, "paymentMethods") : null, [firestore]);
    const { data: paymentMethods, loading: paymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsQuery);

    const [searchTerm, setSearchTerm] = useState('');

    const handleLogout = () => {
        document.cookie = 'admin-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/admin/login');
    };
    
    const filteredUsers = useMemo(() => {
        if (!allUsers) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        return allUsers.filter(user =>
            user.numericId?.toLowerCase().includes(lowercasedTerm) ||
            user.phoneNumber?.toLowerCase().includes(lowercasedTerm)
        );
    }, [allUsers, searchTerm]);
    
    const totalUsers = allUsers?.length || 0;
    const totalBalance = allUsers?.reduce((acc, user) => acc + (user.balance || 0), 0) || 0;

    const handleAddMethod = async (type: 'bank' | 'upi', details: any) => {
        if (!firestore) return;
        try {
            await addDoc(collection(firestore, 'paymentMethods'), { type, ...details });
            toast({ title: `${type.toUpperCase()} method added successfully.`});
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: `Error adding ${type} method.`});
        }
    };

    const handleDeleteMethod = async (id: string) => {
        if (!firestore) return;
        if (!confirm('Are you sure you want to delete this payment method?')) return;
        try {
            await deleteDoc(doc(firestore, 'paymentMethods', id));
            toast({ title: 'Payment method deleted.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error deleting payment method.'});
        }
    };

  return (
    <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10 justify-between">
            <Logo className="text-2xl" />
            <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6 md:w-auto md:inline-flex">
            <TabsTrigger value="dashboard">
                <LayoutDashboard className="mr-2" />
                Dashboard
            </TabsTrigger>
            <TabsTrigger value="users">
                <Users className="mr-2"/>
                Users
            </TabsTrigger>
             <TabsTrigger value="withdrawals">
                <Banknote className="mr-2"/>
                Withdrawals
            </TabsTrigger>
            <TabsTrigger value="live-chat">
                <MessageSquare className="mr-2"/>
                Live Chat
            </TabsTrigger>
            <TabsTrigger value="history">
                <History className="mr-2"/>
                History
            </TabsTrigger>
             <TabsTrigger value="payment-methods">
                <Wallet className="mr-2"/>
                Payment Methods
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalUsers}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Total Balance
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                       {loading ? <Skeleton className="h-8 w-2/3" /> : <div className="text-2xl font-bold">{(totalBalance || 0).toFixed(2)} <span className="text-sm text-muted-foreground">LGB</span></div>}
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by UID or Phone Number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 max-w-sm"
                />
              </div>
              <UsersGrid users={filteredUsers} loading={loading} error={error} />
            </div>
          </TabsContent>
           <TabsContent value="withdrawals" className="mt-4">
                <WithdrawalsTabContent />
            </TabsContent>
            <TabsContent value="live-chat" className="mt-4">
              <LiveChatTabContent />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
                <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by UID or Phone Number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 max-w-sm"
                    />
                </div>
                <HistoryUsersGrid users={filteredUsers} loading={loading} error={error} />
                </div>
          </TabsContent>
          <TabsContent value="payment-methods" className="mt-4">
             <div className="w-full max-w-2xl mx-auto">
                <Tabs defaultValue="bank">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bank">
                            <Landmark className="mr-2" />
                            Bank
                        </TabsTrigger>
                        <TabsTrigger value="upi">
                            <Banknote className="mr-2" />
                            UPI
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="bank" className="mt-4">
                        <BankDetailsForm onAdd={(details) => handleAddMethod('bank', details)} />
                    </TabsContent>
                    <TabsContent value="upi" className="mt-4">
                        <UpiDetailsForm onAdd={(details) => handleAddMethod('upi', details)} />
                    </TabsContent>
                </Tabs>
                <PaymentMethodsList methods={paymentMethods || []} loading={paymentMethodsLoading} onDelete={handleDeleteMethod}/>
             </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
