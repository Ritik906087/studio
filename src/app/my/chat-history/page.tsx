
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MessageSquare, Paperclip } from 'lucide-react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Loader } from '@/components/ui/loader';
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/lib/supabase';
import { Timestamp } from 'firebase/firestore';


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
    created_at: string;
    chatHistory: Message[];
};

export default function ChatHistoryPage() {
    const { user, loading: authLoading } = useUser();
    const [userProfile, setUserProfile] = useState<{ photoURL?: string, displayName?: string } | null>(null);
    const [closedChats, setClosedChats] = useState<ChatRequest[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user) {
                setHistoryLoading(false);
                return;
            };

            setHistoryLoading(true);
            const profilePromise = supabase.from('users').select('photoURL, displayName').eq('uid', user.id).single();
            const chatsPromise = supabase.from('chatRequests').select('*').eq('userId', user.id).eq('status', 'closed');

            const [profileResult, chatsResult] = await Promise.all([profilePromise, chatsPromise]);

            if (profileResult.data) setUserProfile(profileResult.data);
            if (chatsResult.data) {
                const sorted = chatsResult.data.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setClosedChats(sorted);
            }
            setHistoryLoading(false);
        }
        fetchData();
    }, [user]);

    const loading = authLoading || historyLoading;

    return (
        <div className="flex min-h-screen flex-col bg-secondary">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link href="/help">
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Link>
                </Button>
                <h1 className="text-xl font-bold">Chat History</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-grow p-4">
                {loading ? (
                    <div className="flex items-center justify-center pt-20">
                        <Loader size="md" />
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
                                        <span className="font-bold">Chat from {new Date(chat.created_at).toLocaleDateString()}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(chat.created_at).toLocaleTimeString()}</span>
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
                                                        {msg.attachment && msg.attachment.type.startsWith('image/') ? (
                                                            <Dialog>
                                                                <DialogTrigger>
                                                                    <Image src={msg.attachment.url} alt="attachment" width={200} height={200} className="rounded-lg mb-2 cursor-pointer" />
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <img src={msg.attachment.url} alt="attachment" className="max-h-[80vh] w-auto object-contain rounded-md" />
                                                                </DialogContent>
                                                            </Dialog>
                                                        ) : msg.attachment ? (
                                                            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-secondary p-2 rounded-lg mb-2 hover:bg-secondary/80 transition-colors">
                                                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                                                                <span className="text-sm text-secondary-foreground truncate">{msg.attachment.name}</span>
                                                            </a>
                                                        ) : null}
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

    