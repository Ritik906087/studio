'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MessageSquare, Loader2, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc } from 'firebase/firestore';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type Attachment = {
  name: string;
  type: string;
  url: string;
};

type Message = {
  text: string;
  isUser: boolean;
  attachment?: Attachment;
  timestamp: number;
  userName?: string;
};

type ChatRequest = {
    id: string;
    status: 'pending' | 'active' | 'closed';
    createdAt: Timestamp;
    chatHistory: Message[];
};

export default function ChatHistoryPage() {
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
      }, [user, firestore]);
    
    const { data: userProfile } = useDoc<{ photoURL?: string, displayName?: string }>(userProfileRef);

    const chatHistoryQuery = useMemo(() => {
        if (!user || !firestore) return null;
        // The composite query with orderBy requires a custom index.
        // To avoid this, we fetch based on filters and sort on the client.
        return query(
            collection(firestore, 'chatRequests'),
            where('userId', '==', user.uid),
            where('status', '==', 'closed')
        );
    }, [user, firestore]);

    const { data: unsortedClosedChats, loading: historyLoading } = useCollection<ChatRequest>(chatHistoryQuery);

    const closedChats = useMemo(() => {
        if (!unsortedClosedChats) return [];
        return [...unsortedClosedChats].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [unsortedClosedChats]);

    const loading = authLoading || historyLoading;

    return (
        <div className="flex min-h-screen flex-col bg-secondary">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link href="/my">
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Link>
                </Button>
                <h1 className="text-xl font-bold">Chat History</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-grow p-4">
                {loading ? (
                    <div className="flex items-center justify-center pt-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : !closedChats || closedChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground">
                        <MessageSquare className="h-16 w-16 opacity-30" />
                        <p className="mt-4 text-lg font-medium">No chat history found.</p>
                        <p className="text-sm">Your past conversations will appear here.</p>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full space-y-3">
                        {closedChats.map((chat) => (
                             <AccordionItem key={chat.id} value={chat.id} className="border-none rounded-2xl bg-white shadow-sm overflow-hidden">
                                <AccordionTrigger className="p-4 text-left hover:no-underline">
                                    <div className="flex flex-col">
                                        <span className="font-bold">Chat from {chat.createdAt.toDate().toLocaleDateString()}</span>
                                        <span className="text-xs text-muted-foreground">{chat.createdAt.toDate().toLocaleTimeString()}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4 p-4 border-t max-h-96 overflow-y-auto">
                                        {chat.chatHistory.map((msg, index) => (
                                            <div key={index} className={cn("flex items-end gap-2", msg.isUser ? "justify-end" : "justify-start")}>
                                                {!msg.isUser && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">{msg.userName === 'JONNY' ? 'J' : 'AI'}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className="flex flex-col max-w-[75%]">
                                                    <div className={cn("rounded-2xl px-3 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white border rounded-bl-none shadow-sm")}>
                                                        {msg.attachment && msg.attachment.type.startsWith('image/') && (
                                                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                                                                <Image src={msg.attachment.url} alt="attachment" width={200} height={200} className="rounded-lg mb-2 cursor-pointer" />
                                                            </a>
                                                        )}
                                                        {msg.attachment && !msg.attachment.type.startsWith('image/') && (
                                                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-secondary p-2 rounded-lg mb-2 hover:bg-secondary/80 transition-colors">
                                                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                                                                <span className="text-sm text-secondary-foreground truncate">{msg.attachment.name}</span>
                                                            </a>
                                                        )}
                                                        {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                                                    </div>
                                                    <p className={cn("text-xs text-muted-foreground px-1 pt-1", msg.isUser ? "text-right" : "text-left")}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                {msg.isUser && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={userProfile?.photoURL} />
                                                        <AvatarFallback>{userProfile?.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </main>
        </div>
    );
}
