"use client";

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LifeBuoy, UserPlus, AlertTriangle, Send, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { helpChat, type HelpChatInput } from '@/ai/flows/help-chat-flow';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';


type Message = {
  text: string;
  isUser: boolean;
};

export default function HelpPage() {
  const { translations } = useLanguage();
  const { user } = useUser();
  const firestore = useFirestore();
  const [uid, setUid] = useState('');
  const [uidError, setUidError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);


  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{ numericId?: string }>(userProfileRef);

  useEffect(() => {
    if (userProfile?.numericId) {
      setUid(userProfile.numericId);
    }
  }, [userProfile]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);


  const handleStartChat = () => {
    if (uid.length !== 8 || !/^\d+$/.test(uid)) {
      setUidError('Please enter a valid 8-digit UID.');
      return;
    }
    setUidError('');
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setChatStarted(true);
      setMessages([{ text: "Hello! How can I help you today?", isUser: false }]);
    }, 1500);
  };
  
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !user) return;

    const newUserMessage: Message = { text: currentMessage, isUser: true };
    setMessages(prev => [...prev, newUserMessage]);
    setCurrentMessage('');
    setIsSending(true);

    try {
      const response = await helpChat({ prompt: currentMessage, uid: user.uid });
      const aiResponse: Message = { text: response, isUser: false };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("AI chat error:", error);
      const errorResponse: Message = { text: "Sorry, I'm having trouble connecting. Please try again later.", isUser: false };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsSending(false);
    }
  };


  if (chatStarted) {
    return (
      <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm flex flex-col h-[70vh]">
        <CardHeader className="flex-row items-center justify-between border-b">
           <Button asChild variant="ghost" size="icon" className="h-8 w-8">
             <Link href="/my">
                <ChevronLeft className="h-6 w-6 text-muted-foreground" />
             </Link>
           </Button>
          <CardTitle className="text-xl font-bold">LG Pay Support</CardTitle>
          <div className="w-8"></div>
        </CardHeader>
        <CardContent ref={chatContainerRef} className="flex-1 space-y-4 p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={index} className={cn("flex items-end gap-2", msg.isUser ? "justify-end" : "justify-start")}>
                {!msg.isUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                    </Avatar>
                )}
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary rounded-bl-none")}>
                  <p className="text-sm">{msg.text}</p>
                </div>
                 {msg.isUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                 )}
              </div>
            ))}
            {isSending && (
                <div className="flex items-end gap-2 justify-start">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-secondary rounded-2xl px-4 py-2 rounded-bl-none">
                       <p className="text-sm">Typing...</p>
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter className="border-t p-2">
            <div className="flex w-full items-center gap-2">
                <Input 
                    placeholder="Type your message..." 
                    className="flex-1"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSending}
                />
                <Button onClick={handleSendMessage} disabled={isSending}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm">
      <CardHeader className="text-center relative">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 absolute left-4 top-4">
             <Link href="/my">
                <ChevronLeft className="h-6 w-6 text-muted-foreground" />
             </Link>
        </Button>
        <CardTitle className="text-xl font-bold pt-10">Welcome to LG Pay Customer Service!</CardTitle>
        <CardDescription>
          For your account security, please do not trust strangers or share your OTP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3 rounded-lg bg-orange-100 p-3 text-orange-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Warning: Do not reveal your payment password or OTP to anyone. Official support is ONLY via LG Pay.
          </p>
        </div>

        <div className="space-y-2">
            <label htmlFor="uid" className="font-medium">Please enter your LG Pay UID</label>
            <Input 
                id="uid" 
                placeholder="Enter 8-digit UID" 
                value={uid}
                onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 8) {
                        setUid(value);
                    }
                    setUidError('');
                }}
                maxLength={8}
                className="text-center text-lg tracking-widest"
            />
            {uidError && <p className="text-sm text-destructive">{uidError}</p>}
        </div>

      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button onClick={handleStartChat} className="w-full font-semibold btn-gradient rounded-full" disabled={isVerifying}>
          {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isVerifying ? 'Verifying...' : 'Start the chat'}
        </Button>
        <p className="text-xs text-muted-foreground">Powered by LG Pay</p>
      </CardFooter>
    </Card>
  );
}
