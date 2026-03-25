
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { ChevronLeft, Loader2, Users } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

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
    const [totalOrderAmount, setTotalOrderAmount] = useState(0);
    const [ordersLoading, setOrdersLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            setOrdersLoading(true);
            const { data, error } = await supabase
                .from('orders')
                .select('amount')
                .eq('userId', user.id)
                .eq('status', 'completed');
            
            if (data) {
                const total = data.reduce((sum, order) => sum + order.amount, 0);
                setTotalOrderAmount(total);
            }
            setOrdersLoading(false);
        };
        fetchOrders();
    }, [user.id]);

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
    const { toast } = useToast();
    
    const [inviter, setInviter] = useState<UserProfile | null>(null);
    const [invitedUsers, setInvitedUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [inviterRes, invitedRes] = await Promise.all([
                    supabase.from('users').select('*').eq('id', inviterId).single(),
                    supabase.from('users').select('*').eq('inviterUid', inviterId)
                ]);

                if (inviterRes.error) throw inviterRes.error;
                setInviter(inviterRes.data);

                if (invitedRes.error) throw invitedRes.error;
                setInvitedUsers(invitedRes.data);
            } catch (error: any) {
                console.error("Error fetching invites data:", error);
                toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [inviterId, toast]);


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
