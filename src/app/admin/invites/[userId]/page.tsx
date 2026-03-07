

'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Users } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { doc, collection, query, where } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6";

// Types
type UserProfile = {
    id: string;
    displayName: string;
    numericId: string;
    photoURL?: string;
};

type Order = {
    amount: number;
    status: string;
};

// Component for a single invited user row
const InvitedUserRow = ({ user }: { user: UserProfile }) => {
    const firestore = useFirestore();

    const ordersQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users', user.id, 'orders'), where('status', '==', 'completed'));
    }, [firestore, user.id]);

    const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersQuery);

    const totalOrderAmount = useMemo(() => {
        if (!orders) return 0;
        return orders.reduce((sum, order) => sum + order.amount, 0);
    }, [orders]);

    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={defaultAvatarUrl} />
                        <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">UID: {user.numericId}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                {ordersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `₹${totalOrderAmount.toFixed(2)}`}
            </TableCell>
            <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/users/${user.id}`}>View User</Link>
                </Button>
            </TableCell>
        </TableRow>
    );
};

export default function UserInvitesPage() {
    const params = useParams();
    const inviterId = params.userId as string;
    const firestore = useFirestore();
    
    // Fetch the inviter's profile
    const inviterRef = useMemo(() => firestore && inviterId ? doc(firestore, 'users', inviterId) : null, [firestore, inviterId]);
    const { data: inviter, loading: inviterLoading } = useDoc<UserProfile>(inviterRef);
    
    // Fetch users invited by the inviter
    const invitedUsersQuery = useMemo(() => {
        if (!firestore || !inviterId) return null;
        return query(collection(firestore, 'users'), where('inviterUid', '==', inviterId));
    }, [firestore, inviterId]);
    const { data: invitedUsers, loading: invitedUsersLoading } = useCollection<UserProfile>(invitedUsersQuery);

    const loading = inviterLoading || invitedUsersLoading;

    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p>Loading Invites...</p>
            </div>
        )
    }
    
    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
             <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon" className="h-8 w-8">
                    <Link href={`/admin/users/${inviterId}`}>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                 <h1 className="text-xl font-semibold">
                    Users Invited by {inviter?.displayName || '...'} (UID: {inviter?.numericId})
                 </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Invited Users ({invitedUsers?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Total Buy Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitedUsers && invitedUsers.length > 0 ? (
                                invitedUsers.map(user => <InvitedUserRow key={user.id} user={user} />)
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">This user has not invited anyone.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    )
}
