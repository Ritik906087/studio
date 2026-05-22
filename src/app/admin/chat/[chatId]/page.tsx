
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { Send, Paperclip, X, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';

type Message = { text: string; isUser: boolean; timestamp: number; userName?: string; };
type ChatRequest = { id: string; status: 'pending' | 'active' | 'closed'; createdAt: any; chatHistory: Message[]; userNumericId?: string; enteredIdentifier: string; };

export default function AdminChatPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const chatId = params.chatId as string;
    const [newMessage, setNewMessage] = useState("");
    const [liveRequest, setLiveRequest] = useState<ChatRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const chatContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chatId || !firestore) return;
        const unsub = onSnapshot(doc(firestore, 'chatRequests', chatId), (snap) => {
            if (snap.exists()) setLiveRequest({ id: snap.id, ...snap.data() } as ChatRequest);
            setLoading(false);
        });
        return () => unsub();
    }, [chatId, firestore]);

    useEffect(() => {
        if (chatContentRef.current) chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }, [liveRequest?.chatHistory]);

    const handleJoinChat = async () => {
        if (!chatId || !firestore) return;
        try {
            await updateDoc(doc(firestore, 'chatRequests', chatId), { status: 'active', agentId: 'admin', agentJoinedAt: serverTimestamp() });
        } catch (e) { toast({ variant: 'destructive', title: 'Error joining chat' }); }
    };

    const handleAdminSendMessage = async () => {
        if (!liveRequest || !newMessage.trim() || !firestore) return;
        const msg: Message = { text: newMessage.trim(), isUser: false, timestamp: Date.now(), userName: 'JONNY' };
        try {
            const newHistory = [...(liveRequest.chatHistory || []), msg];
            await updateDoc(doc(firestore, 'chatRequests', chatId), { chatHistory: newHistory });
            setNewMessage("");
        } catch (e) { toast({ variant: 'destructive', title: 'Error sending message' }); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader size="md" /></div>;

    return (
        <div className="flex flex-col h-screen bg-muted/40">
            <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon"><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
                    <h1 className="font-bold">Chat: {liveRequest?.userNumericId || liveRequest?.enteredIdentifier}</h1>
                </div>
            </header>
            <ScrollArea className="flex-1 p-4" ref={chatContentRef}>
                {(liveRequest?.chatHistory || []).map((msg, i) => (
                    <div key={i} className={cn("flex mb-3", msg.isUser ? "justify-end" : "justify-start")}>
                        <div className={cn("rounded-2xl px-3 py-2 text-sm", msg.isUser ? "bg-primary text-white" : "bg-white border shadow-sm")}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </ScrollArea>
            <footer className="p-4 border-t bg-background">
                {liveRequest?.status === 'active' ? (
                    <div className="flex gap-2">
                        <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Reply..." onKeyPress={e => e.key === 'Enter' && handleAdminSendMessage()} />
                        <Button onClick={handleAdminSendMessage}>Send</Button>
                    </div>
                ) : (
                    <Button className="w-full" onClick={handleJoinChat}>JOIN CHAT</Button>
                )}
            </footer>
        </div>
    );
}
