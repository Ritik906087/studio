
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
import { LifeBuoy, UserPlus, AlertTriangle, Send, ChevronLeft, Loader2, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { helpChat, type HelpChatInput } from '@/ai/flows/help-chat-flow';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

type Attachment = {
  file: File;
  previewUrl: string;
};

type Message = {
  text: string;
  isUser: boolean;
  attachment?: Attachment;
};

export default function HelpPage() {
  const { translations } = useLanguage();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for logged-in user
  const [uid, setUid] = useState('');
  const [uidError, setUidError] = useState('');

  // State for logged-out user
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Common state
  const [isVerifying, setIsVerifying] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{ numericId?: string }>(userProfileRef);

  useEffect(() => {
    if (user && userProfile?.numericId) {
      setUid(userProfile.numericId);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartChat = () => {
    if (user) {
        // Logged-in user logic
        if (uid.length !== 8 || !/^\d+$/.test(uid)) {
            setUidError('Please enter a valid 8-digit UID.');
            return;
        }
        setUidError('');
    } else {
        // Logged-out user logic
        if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
            setPhoneError('Please enter a valid 10-digit mobile number.');
            return;
        }
        setPhoneError('');
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setChatStarted(true);
      setMessages([{ text: "Hello! How can I help you today?", isUser: false }]);
    }, 1500);
  };
  
  const handleSendMessage = async () => {
    if (!currentMessage.trim() && !attachment) return;

    const newUserMessage: Message = { text: currentMessage, isUser: true, attachment: attachment || undefined };
    setMessages(prev => [...prev, newUserMessage]);
    setCurrentMessage('');
    setAttachment(null);
    setIsSending(true);

    try {
        const input: HelpChatInput = user 
            ? { prompt: currentMessage, uid: user.uid }
            : { prompt: currentMessage };
            
      const response = await helpChat(input);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: 'destructive',
          title: 'File is too large',
          description: 'Please upload a file smaller than 10MB.',
        });
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setAttachment({ file, previewUrl });
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chatStarted) {
    return (
      <div className="flex flex-col h-screen bg-secondary">
        <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
           <Button asChild variant="ghost" size="icon" className="h-8 w-8">
             <Link href={user ? "/my" : "/login"}>
                <ChevronLeft className="h-6 w-6 text-muted-foreground" />
             </Link>
           </Button>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold">LG Pay Support</h1>
            <p className="text-xs text-green-500 font-semibold">Online</p>
          </div>
          <div className="w-8"></div>
        </header>
        <main ref={chatContainerRef} className="flex-1 space-y-4 p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={index} className={cn("flex items-end gap-2", msg.isUser ? "justify-end" : "justify-start")}>
                {!msg.isUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                    </Avatar>
                )}
                <div className={cn("max-w-[75%] rounded-2xl px-3 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white rounded-bl-none")}>
                  {msg.attachment && msg.attachment.file.type.startsWith('image/') && (
                    <Image src={msg.attachment.previewUrl} alt="attachment" width={200} height={200} className="rounded-lg mb-2" />
                  )}
                   {msg.attachment && !msg.attachment.file.type.startsWith('image/') && (
                    <div className="flex items-center gap-2 bg-secondary p-2 rounded-lg mb-2">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-secondary-foreground truncate">{msg.attachment.file.name}</span>
                    </div>
                  )}
                  {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
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
                    <div className="bg-white rounded-2xl px-4 py-2 rounded-bl-none">
                       <p className="text-sm">Typing...</p>
                    </div>
                </div>
            )}
        </main>
        <footer className="bg-white border-t p-2 space-y-2">
            {attachment && (
              <div className="px-2 pt-1">
                <div className="relative w-24 h-24">
                  {attachment.file.type.startsWith('image/') ? (
                    <Image src={attachment.previewUrl} alt="preview" layout="fill" objectFit="cover" className="rounded-md" />
                  ) : (
                    <div className="w-24 h-24 bg-secondary rounded-md flex flex-col items-center justify-center text-center p-2">
                        <Paperclip className="h-6 w-6 text-muted-foreground mb-1"/>
                        <p className="text-xs text-secondary-foreground truncate">{attachment.file.name}</p>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setAttachment(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex w-full items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Input 
                    placeholder="Type your message..." 
                    className="flex-1 bg-secondary border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSending}
                />
                <Button onClick={handleSendMessage} disabled={isSending || (!currentMessage.trim() && !attachment)} className="btn-gradient rounded-full w-12 h-12">
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm">
        <CardHeader className="text-center relative">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 absolute left-4 top-4">
              <Link href={user ? "/my" : "/login"}>
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

          {user ? (
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
          ) : (
              <div className="space-y-2">
                  <label htmlFor="phone" className="font-medium">Please enter your registered Phone Number</label>
                  <Input 
                      id="phone" 
                      type="tel"
                      placeholder="Enter 10-digit mobile number" 
                      value={phone}
                      onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                              setPhone(value);
                          }
                          setPhoneError('');
                      }}
                      maxLength={10}
                      className="text-center text-lg tracking-widest"
                  />
                  {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
              </div>
          )}

        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button onClick={handleStartChat} className="w-full font-semibold btn-gradient rounded-full" disabled={isVerifying}>
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isVerifying ? 'Verifying...' : 'Start the chat'}
          </Button>
          <p className="text-xs text-muted-foreground">Powered by LG Pay</p>
        </CardFooter>
      </Card>
    </div>
  );
}

    