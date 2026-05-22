
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { ChevronLeft, Loader2, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

type UserProfile = { id: string; displayName: string; numericId: string; };

export default function UserInvitesPage() {
    const params = useParams();
    const inviterId = params.userId as string;
    const firestore = useFirestore();
    const [inviter, setInviter] = useState<UserProfile | null>(null);
    const [invitedUsers, setInvitedUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !inviterId) return;
        async function fetch() {
            setLoading(true);
            try {
                const iSnap = await getDoc(doc(firestore, 'users', inviterId));
                if (iSnap.exists()) setInviter({ id: iSnap.id, ...iSnap.data() } as any);
                const qSnap = await getDocs(query(collection(firestore, 'users'), where('inviterUid', '==', inviterId)));
                setInvitedUsers(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
            } finally { setLoading(false); }
        }
        fetch();
    }, [inviterId, firestore]);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <main className="p-4 md:p-8 space-y-4">
             <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon"><Link href={`/admin/users/${inviterId}`}><ChevronLeft /></Link></Button>
                 <h1 className="text-xl font-bold">Invites by {inviter?.displayName}</h1>
            </header>
            <Card><CardHeader><CardTitle>Members List</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>UID</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {invitedUsers.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.displayName}</TableCell>
                                    <TableCell className="font-mono">{u.numericId}</TableCell>
                                    <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/admin/users/${u.id}`}>View</Link></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}
