
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
import { LifeBuoy, UserPlus, AlertTriangle, Send, ChevronLeft, Loader2, Paperclip, Image as ImageIcon, X, Clock, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { helpChat, type HelpChatInput } from '@/ai/flows/help-chat-flow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const CHAT_STORAGE_KEY = 'lg-pay-help-chat-history';
const SOUND_PREF_KEY = 'lg-pay-help-sound-pref';

type StorableAttachment = {
  name: string;
  type: string;
  url: string;
};

type Message = {
  text: string;
  isUser: boolean;
  attachment?: StorableAttachment;
  timestamp: number;
  userName?: string;
};

type ChatRequest = {
    id: string;
    status: 'pending' | 'active' | 'closed';
    createdAt: Timestamp;
};

const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

export default function HelpPage() {
  const { translations } = useLanguage();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [uid, setUid] = useState('');
  const [uidError, setUidError] = useState('');

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<StorableAttachment | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enteredIdentifier, setEnteredIdentifier] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [isSoundOn, setIsSoundOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previousMessagesLength = useRef(0);

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{ numericId?: string, displayName?: string, photoURL?: string }>(userProfileRef);

  const chatRequestQuery = useMemo(() => {
    if (!user || !firestore) return null;
    // Query without orderBy to avoid needing a composite index
    return query(
        collection(firestore, 'chatRequests'),
        where('userId', '==', user.uid),
        where('status', 'in', ['pending', 'active'])
    );
  }, [user, firestore]);

  const { data: activeChatRequests, loading: chatRequestsLoading } = useCollection<ChatRequest>(chatRequestQuery);
  
  const activeRequest = useMemo(() => {
      if (!activeChatRequests || activeChatRequests.length === 0) return null;
      // Sort client-side to get the most recent request
      return [...activeChatRequests].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)[0];
  }, [activeChatRequests]);

  const isWaitingForAgent = activeRequest?.status === 'pending';
  const isAgentActive = activeRequest?.status === 'active';


  // Load chat and sound preference from localStorage
  useEffect(() => {
    try {
        const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
        if (savedMessages) {
            const parsedMessages = JSON.parse(savedMessages) as Message[];
            if(parsedMessages.length > 0) {
              setMessages(parsedMessages);
              setChatStarted(true);
              previousMessagesLength.current = parsedMessages.length;
            }
        }
        const savedSoundPref = localStorage.getItem(SOUND_PREF_KEY);
        if (savedSoundPref !== null) {
            setIsSoundOn(JSON.parse(savedSoundPref));
        }
    } catch (error) {
        console.error("Failed to load data from storage:", error);
    }
  }, []);

  // Save chat to localStorage
  useEffect(() => {
    if (messages.length > 0 && chatStarted) {
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save chat to storage:", error);
        }
    }
  }, [messages, chatStarted]);

   // Countdown Timer Logic
  useEffect(() => {
    if (isWaitingForAgent && activeRequest?.createdAt) {
        const createdAt = activeRequest.createdAt.toDate();
        const expiryTime = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 minutes

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);

            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                // Optionally handle expiry on user side
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    } else {
        setTimeLeft(null);
    }
  }, [isWaitingForAgent, activeRequest]);


  useEffect(() => {
    if (user && userProfile?.numericId) {
      setUid(userProfile.numericId);
    }
  }, [user, userProfile]);

  // Combined useEffect for scrolling and sound
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    const lastMessage = messages[messages.length - 1];
    if (messages.length > previousMessagesLength.current && lastMessage && !lastMessage.isUser && isSoundOn) {
        audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
    }
    previousMessagesLength.current = messages.length;

  }, [messages, isSoundOn]);


  const handleSoundToggle = () => {
    const newSoundState = !isSoundOn;
    setIsSoundOn(newSoundState);
    try {
        localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(newSoundState));
    } catch (error) {
        console.error("Failed to save sound preference:", error);
    }
  };

  const handleStartChat = () => {
    let identifier = '';
    if (user) {
        if (uid.length !== 8 || !/^\d+$/.test(uid)) {
            setUidError('Please enter a valid 8-digit UID.');
            return;
        }
        setUidError('');
        identifier = uid;
    } else {
        if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
            setPhoneError('Please enter a valid 10-digit mobile number.');
            return;
        }
        setPhoneError('');
        identifier = phone;
    }

    setEnteredIdentifier(identifier);
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setChatStarted(true);
      if (messages.length === 0) {
        setMessages([{ text: "Hello! How can I help you today?", isUser: false, timestamp: Date.now() }]);
      }
    }, 1500);
  };
  
  const handleSendMessage = async () => {
    if ((!currentMessage.trim() && !attachment) || isWaitingForAgent) return;

    const newUserMessage: Message = { 
      text: currentMessage, 
      isUser: true, 
      attachment: attachment || undefined, 
      timestamp: Date.now(),
      userName: userProfile?.displayName ?? 'You'
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setCurrentMessage('');
    setAttachment(null);
    setIsSending(true);

    try {
      const input: HelpChatInput = { 
          prompt: currentMessage, 
          uid: user?.uid,
          chatHistory: updatedMessages,
          enteredIdentifier: enteredIdentifier,
      };
            
      const response = await helpChat(input);
      const aiResponse: Message = { text: response, isUser: false, timestamp: Date.now() };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("AI chat error:", error);
      const errorResponse: Message = { text: "Sorry, I'm having trouble connecting. Please try again later.", isUser: false, timestamp: Date.now() };
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setAttachment({
          name: file.name,
          type: file.type,
          url: url,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (authLoading || (user && chatRequestsLoading)) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chatStarted) {
    return (
      <div className="flex flex-col h-screen bg-secondary">
        <audio ref={audioRef} src="https://firebasestorage.googleapis.com/v0/b/genkit-red-team.appspot.com/o/message.mp3?alt=media&token=9632d431-1504-4b53-9357-12492f02fcf4" preload="auto"></audio>
        <header className="grid grid-cols-3 items-center p-3 bg-white sticky top-0 z-10 border-b shadow-sm">
            <div className="flex items-center gap-2">
                 <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                    <Link href={user ? "/my" : "/login"}>
                        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                    </Link>
                </Button>
                {isWaitingForAgent && timeLeft !== null && (
                    <div className="flex items-center gap-1 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
                    </div>
                )}
            </div>
            <div className="flex flex-col items-center text-center">
                <h1 className="text-lg font-bold">{isAgentActive ? "Agent" : "LG Pay Support"}</h1>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <p className="text-xs text-muted-foreground font-semibold">Online</p>
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={handleSoundToggle} variant="ghost" size="icon" className="h-9 w-9">
                    {isSoundOn ? <Volume2 className="h-5 w-5 text-muted-foreground" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
                </Button>
            </div>
        </header>
        <main ref={chatContainerRef} className="flex-1 space-y-4 p-4 overflow-y-auto">
            {isWaitingForAgent && (
                 <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center text-blue-800">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="font-semibold">Connecting you to an agent...</p>
                        <p className="text-sm">Please wait, an agent will join shortly.</p>
                    </CardContent>
                </Card>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={cn("flex items-end gap-2", msg.isUser ? "justify-end" : "justify-start")}>
                {!msg.isUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">LG</AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col max-w-[75%]">
                    <div className={cn("rounded-2xl px-3 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white rounded-bl-none shadow-sm")}>
                      {msg.attachment && msg.attachment.type.startsWith('image/') && (
                        <Image src={msg.attachment.url} alt="attachment" width={200} height={200} className="rounded-lg mb-2" />
                      )}
                       {msg.attachment && !msg.attachment.type.startsWith('image/') && (
                        <div className="flex items-center gap-2 bg-secondary p-2 rounded-lg mb-2">
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-secondary-foreground truncate">{msg.attachment.name}</span>
                        </div>
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
            {isSending && (
                <div className="flex items-end gap-2 justify-start">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">LG</AvatarFallback>
                    </Avatar>
                    <div className="bg-white rounded-2xl px-4 py-2 rounded-bl-none shadow-sm">
                       <p className="text-sm">Typing...</p>
                    </div>
                </div>
            )}
        </main>
        <footer className="bg-white border-t p-2 space-y-2">
            {attachment && (
              <div className="px-2 pt-1">
                <div className="relative w-24 h-24">
                  {attachment.type.startsWith('image/') ? (
                    <Image src={attachment.url} alt="preview" fill objectFit="cover" className="rounded-md" />
                  ) : (
                    <div className="w-24 h-24 bg-secondary rounded-md flex flex-col items-center justify-center text-center p-2">
                        <Paperclip className="h-6 w-6 text-muted-foreground mb-1"/>
                        <p className="text-xs text-secondary-foreground truncate">{attachment.name}</p>
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
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending || isWaitingForAgent}>
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Input 
                    placeholder="Type your message..." 
                    className="flex-1 bg-secondary border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSending || isWaitingForAgent}
                />
                <Button onClick={handleSendMessage} disabled={isSending || isWaitingForAgent || (!currentMessage.trim() && !attachment)} className="btn-gradient rounded-full w-12 h-12">
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

    