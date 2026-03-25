
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Send, Paperclip, X, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader } from '@/components/ui/loader';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Attachment = {
  name: string;
  type: string;
  url: string;
};

type Message = {
  text: string;
  isUser: boolean;
  timestamp: number;
  userName?: string;
  attachment?: Attachment;
};

type ChatRequest = {
    id: string;
    userId?: string;
    userNumericId?: string;
    enteredIdentifier: string;
    status: 'pending' | 'active' | 'closed';
    createdAt: string;
    chatHistory: Message[];
    agentId?: string;
    agentJoinedAt?: string;
}

const CountdownTimer = ({ expiryTimestamp, className }: { expiryTimestamp: string, className?: string }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const expiryTime = new Date(expiryTimestamp).getTime();

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


export default function AdminChatPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const chatId = params.chatId as string;
    
    const [isUpdating, setIsUpdating] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [attachment, setAttachment] = useState<Attachment | null>(null);
    const chatContentRef = useRef<HTMLDivElement>(null);
    const adminFileInputRef = useRef<HTMLInputElement>(null);

    const [liveRequest, setLiveRequest] = useState<ChatRequest | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!chatId) return;

        const fetchChat = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('chatRequests').select('*').eq('id', chatId).single();
            if (error) {
                toast({ variant: 'destructive', title: 'Error fetching chat.' });
                console.error(error);
            } else {
                setLiveRequest(data as ChatRequest);
            }
            setLoading(false);
        };

        fetchChat();

        const channel = supabase.channel(`public:chatRequests:id=eq.${chatId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chatRequests', filter: `id=eq.${chatId}` }, (payload) => {
            setLiveRequest(payload.new as ChatRequest);
          })
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [chatId, toast]);
    
    const isJoined = liveRequest?.status === 'active';

    useEffect(() => {
        if (chatContentRef.current) {
            chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
        }
    }, [liveRequest?.chatHistory]);

    const handleJoinChat = async () => {
        if (!chatId) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase.from('chatRequests').update({ status: 'active', agentId: 'admin', agentJoinedAt: new Date().toISOString() }).eq('id', chatId);
            if (error) throw error;
            toast({ title: 'Chat Joined!', description: "You can now chat with the user." });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to join chat' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleCloseChat = async () => {
        if (!chatId) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase.from('chatRequests').update({ status: 'closed' }).eq('id', chatId);
            if (error) throw error;
            toast({ title: `Chat closed` });
            router.push('/admin/dashboard');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to close chat' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleAdminFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast({ variant: 'destructive', title: 'File is too large', description: 'Please upload a file smaller than 10MB.' });
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target?.result as string;
                setAttachment({ name: file.name, type: file.type, url });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAdminSendMessage = async () => {
        if (!liveRequest || (!newMessage.trim() && !attachment)) return;
        
        const message: Message = {
            text: newMessage.trim(),
            isUser: false,
            timestamp: Date.now(),
            userName: 'JONNY'
        };

        if (attachment) {
            message.attachment = attachment;
        }

        const newHistory = [...(liveRequest.chatHistory || []), message];

        try {
            const { error } = await supabase.from('chatRequests').update({ chatHistory: newHistory }).eq('id', chatId);
            if (error) throw error;
            setNewMessage('');
            setAttachment(null);
        } catch (e) {
            console.error("Failed to send message:", e);
            toast({ variant: 'destructive', title: 'Failed to send message' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader size="md" />
            </div>
        );
    }
    
    if (!liveRequest) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                 <div className="text-center">
                    <p className="text-xl font-bold">Chat not found</p>
                    <Button asChild className="mt-4">
                        <Link href="/admin/dashboard">Back to Dashboard</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    const expiryTimestamp = new Date(new Date(liveRequest.createdAt).getTime() + 10 * 60000).toISOString();

    return (
       <div className="flex flex-col h-screen bg-muted/40">
           <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                        <Link href="/admin/dashboard">
                            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                        </Link>
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold">Chat with {liveRequest.userNumericId || liveRequest.enteredIdentifier}</h1>
                         {isJoined ? (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                User is Online
                            </div>
                        ): (
                             <CountdownTimer expiryTimestamp={expiryTimestamp} className="text-sm" />
                        )}
                    </div>
                </div>
                <Button variant="destructive" size="sm" onClick={handleCloseChat} disabled={isUpdating}>Close Chat</Button>
           </header>
           
           <ScrollArea className="flex-1 w-full p-4" ref={chatContentRef}>
               {(liveRequest.chatHistory || []).map((msg, index) => (
                    <div key={index} className={cn("flex items-end gap-2 mb-3", msg.isUser ? "justify-end" : "justify-start")}>
                        {!msg.isUser && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">{msg.userName === 'JONNY' ? 'J' : 'AI'}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className="flex flex-col max-w-[80%]">
                            <div className={cn("rounded-2xl px-3 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white rounded-bl-none shadow-sm")}>
                                {msg.attachment?.url && msg.attachment.type.startsWith('image/') ? (
                                     <Dialog>
                                        <DialogTrigger>
                                            <Image src={msg.attachment.url} alt={msg.attachment.name || 'attachment'} width={200} height={200} className="rounded-lg mb-2 cursor-pointer" />
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Attachment Preview</DialogTitle>
                                                <DialogDescription>{msg.attachment.name || 'Attached image'}</DialogDescription>
                                            </DialogHeader>
                                            <img src={msg.attachment.url} alt={msg.attachment.name || 'attachment'} className="mx-auto max-h-[70vh] w-auto object-contain rounded-md" />
                                        </DialogContent>
                                    </Dialog>
                                ) : msg.attachment?.url ? (
                                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-secondary p-2 rounded-lg mb-2 hover:bg-secondary/80">
                                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm text-secondary-foreground truncate">{msg.attachment.name || 'View Attachment'}</span>
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
                                <AvatarFallback>{liveRequest.userNumericId?.charAt(0) ?? 'U'}</AvatarFallback>
                            </Avatar>
                            )}
                    </div>
                ))}
           </ScrollArea>

            <footer className="p-2 border-t bg-background">
                {isJoined ? (
                    <div className="w-full flex flex-col gap-2">
                        {attachment && (
                            <div className="relative w-20 h-20 ml-2">
                                <Image src={attachment.url} alt="preview" fill objectFit="cover" className="rounded-md" />
                                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setAttachment(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input type="file" ref={adminFileInputRef} onChange={handleAdminFileChange} className="hidden" />
                            <Button variant="ghost" size="icon" onClick={() => adminFileInputRef.current?.click()}>
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            <Input 
                                placeholder="Type your message..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleAdminSendMessage()}
                                className="bg-muted border-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <Button onClick={handleAdminSendMessage} disabled={!newMessage.trim() && !attachment}>
                                <Send className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg" onClick={handleJoinChat} disabled={isUpdating}>
                        {isUpdating ? <Loader size="sm" className="mr-2"/> : "JOIN CHAT"}
                    </Button>
                )}
            </footer>
       </div>
    )
}
