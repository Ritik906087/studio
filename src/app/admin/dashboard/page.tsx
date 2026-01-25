'use client';

import { useState, useMemo } from 'react';
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
import { LogOut, Users, LayoutDashboard, Wallet, Eye, Search, Landmark, Banknote, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


type UserProfile = {
    id: string;
    displayName: string;
    numericId: string;
    balance: number;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
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
            <Card key={user.id} className="flex flex-col">
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


export default function AdminDashboardPage() {
    const router = useRouter();
    const { data: allUsers, loading, error } = useCollection<UserProfile>('users');
    const { data: paymentMethods, loading: paymentMethodsLoading } = useCollection<PaymentMethod>('paymentMethods');
    const [searchTerm, setSearchTerm] = useState('');
    const firestore = useFirestore();
    const { toast } = useToast();

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
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
            <TabsTrigger value="dashboard">
                <LayoutDashboard className="mr-2" />
                Dashboard
            </TabsTrigger>
            <TabsTrigger value="users">
                <Users className="mr-2"/>
                Users
            </TabsTrigger>
             <TabsTrigger value="buy-lgb">
                <Wallet className="mr-2"/>
                Buy LGB
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
          <TabsContent value="buy-lgb" className="mt-4">
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
