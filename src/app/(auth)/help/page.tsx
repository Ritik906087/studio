

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
import { LifeBuoy, UserPlus, AlertTriangle, Send, ChevronLeft, Paperclip, Image as ImageIcon, X, Clock, Volume2, VolumeX, Sparkles, History } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser } from '@/hooks/use-user';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { escalateToHuman } from '@/ai/flows/help-chat-flow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader } from '@/components/ui/loader';
import { supabase } from '@/lib/supabase';


const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

const SOUND_PREF_KEY = 'lg-pay-help-sound-pref';
const GUEST_CHAT_ID_KEY = 'lg-pay-guest-chat-id';

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


const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

export default function HelpPage() {
  const { translations } = useLanguage();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [uid, setUid] = useState('');
  const [uidError, setUidError] = useState('');

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enteredIdentifier, setEnteredIdentifier] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [isSoundOn, setIsSoundOn] = useState(true);
  const [guestChatId, setGuestChatId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ numericId?: string, displayName?: string, photoURL?: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [activeRequest, setActiveRequest] = useState<ChatRequest | null>(null);
  const [chatLoading, setChatLoading] = useState(true);

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  // Audio Functions
  const autoUnlockAudio = async () => {
    if (unlockedRef.current || audioCtxRef.current) return;
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (context.state === "suspended") {
            await context.resume();
        }
        audioCtxRef.current = context;
        unlockedRef.current = true;
    } catch (e) {
        console.error("Could not initialize AudioContext", e);
    }
  };
  
  const playBeep = ({frequency=800, duration=0.12, volume=0.12, type="sine"}: {frequency?: number, duration?: number, volume?: number, type?: OscillatorType} = {}) => {
      if (!unlockedRef.current || !audioCtxRef.current || !isSoundOn) return;

      try {
        const o = audioCtxRef.current.createOscillator();
        const g = audioCtxRef.current.createGain();
    
        o.type = type;
        o.frequency.value = frequency;
    
        const now = audioCtxRef.current.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(volume, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    
        o.connect(g);
        g.connect(audioCtxRef.current.destination);
    
        o.start(now);
        o.stop(now + duration);
      } catch (e) {
        // Silently catch errors if play() fails due to user not interacting
      }
  };

  const playSendSound = () => {
      playBeep({frequency: 900, duration: 0.08, volume: 0.08, type: "square"});
  };
  
  const playReceiveSound = () => {
      playBeep({frequency: 600, duration: 0.10, volume: 0.10, type: "sine"});
      setTimeout(() => playBeep({frequency: 750, duration: 0.12, volume: 0.10, type: "sine"}), 120);
  };

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        setProfileLoading(true);
        const { data, error } = await supabase.from('users').select('numericId, displayName, photoURL').eq('uid', user.id).single();
        if (data) setUserProfile(data);
        setProfileLoading(false);
      } else {
        setProfileLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    setChatLoading(true);
    let subscription: any;

    async function fetchInitialChat() {
      let chatId = null;
      let query: any;

      if (user) {
        const { data, error } = await supabase
          .from('chatRequests')
          .select('*')
          .eq('userId', user.id)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setActiveRequest(data as ChatRequest);
          chatId = data.id;
        }
      } else {
        const savedGuestChatId = sessionStorage.getItem(GUEST_CHAT_ID_KEY);
        if (savedGuestChatId) {
          const { data, error } = await supabase
            .from('chatRequests')
            .select('*')
            .eq('id', savedGuestChatId)
            .in('status', ['pending', 'active'])
            .single();
          if (data) {
            setActiveRequest(data as ChatRequest);
            chatId = data.id;
          }
        }
      }
      setChatLoading(false);

      if (chatId) {
        subscription = supabase
          .channel(`public:chatRequests:id=eq.${chatId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chatRequests', filter: `id=eq.${chatId}` },
            payload => {
              setActiveRequest(payload.new as ChatRequest);
            }
          ).subscribe();
      }
    }

    fetchInitialChat();
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user]);

  const isWaitingForAgent = activeRequest?.status === 'pending';
  const isAgentActive = activeRequest?.status === 'active';
  const displayedMessages = activeRequest?.chatHistory || [];
  const prevMessagesCount = useRef(displayedMessages?.length ?? 0);

  // Load from storage
  useEffect(() => {
    try {
        const savedSoundPref = localStorage.getItem(SOUND_PREF_KEY);
        if (savedSoundPref !== null) {
            setIsSoundOn(JSON.parse(savedSoundPref));
        }
        
        if (activeRequest) {
            autoUnlockAudio();
        }

    } catch (error) {
        console.error("Failed to load data from storage:", error);
    }
  }, [activeRequest]);

   // Countdown Timer Logic
  useEffect(() => {
    if (isWaitingForAgent && activeRequest?.created_at && !isAgentActive) {
        const createdAt = new Date(activeRequest.created_at);
        const expiryTime = new Date(createdAt.getTime() + 10 * 60 * 1000);

        const interval = setInterval(() => {
            const now = new Date();
            const secondsLeft = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);

            if (secondsLeft <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
            } else {
                setTimeLeft(secondsLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    } else {
        setTimeLeft(null);
    }
  }, [isWaitingForAgent, activeRequest, isAgentActive]);

  useEffect(() => {
    if (user && userProfile?.numericId) {
      setUid(userProfile.numericId);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    if (displayedMessages && displayedMessages.length > prevMessagesCount.current) {
        const lastMessage = displayedMessages[displayedMessages.length - 1];
        if (lastMessage && !lastMessage.isUser) {
            playReceiveSound();
        }
    }
    
    if (displayedMessages) {
        prevMessagesCount.current = displayedMessages.length;
    }
  }, [displayedMessages]);

  const handleSoundToggle = () => {
    const newSoundState = !isSoundOn;
    setIsSoundOn(newSoundState);
    if (newSoundState) {
        playBeep({frequency: 800, duration: 0.1, volume: 0.1});
    }
    try {
        localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(newSoundState));
    } catch (error) {
        console.error("Failed to save sound preference:", error);
    }
  };

  const handleStartChat = async () => {
    let identifier = '';
    if (user) {
        if (uid.length !== 8 || !/^\d+$/.test(uid)) {
            setUidError('Please enter a valid 8-digit UID.');
            return;
        }
        setUidError('');
        identifier = uid;
    } else {
        const isPhone = phone.length === 10 && /^[6-9]\d{9}$/.test(phone);
        const isUid = phone.length === 8 && /^\d{8}$/.test(phone);

        if (!isPhone && !isUid) {
            setPhoneError('Please enter a valid 10-digit mobile number or 8-digit UID.');
            return;
        }
        setPhoneError('');
        identifier = phone;
    }

    setEnteredIdentifier(identifier);
    setIsVerifying(true);
    autoUnlockAudio();

    const initialHistory: Message[] = [{
        text: 'User has started a support session. Please wait for an agent to connect.',
        isUser: false,
        timestamp: Date.now(),
        userName: 'System'
    }];
    
    const result = await escalateToHuman({
        uid: user?.id,
        enteredIdentifier: identifier,
        chatHistory: initialHistory
    });

    setIsVerifying(false);
    
    if (!result.success || !result.chatId) {
      toast({
        variant: 'destructive',
        title: 'Failed to Start Chat',
        description: result.error || 'Could not create a support request. Please try again.',
      });
    } else {
        const { data } = await supabase.from('chatRequests').select('*').eq('id', result.chatId).single();
        if(data) setActiveRequest(data as ChatRequest);
        
        if (!user && result.chatId) {
            sessionStorage.setItem(GUEST_CHAT_ID_KEY, result.chatId);
            setGuestChatId(result.chatId);
        }
    }
  };

    const handleSendMessage = async () => {
        if ((!currentMessage.trim() && !attachment) || !isAgentActive || !activeRequest) return;
        
        playSendSound();

        const messagePayload: Message = {
            text: currentMessage.trim(),
            isUser: true,
            timestamp: Date.now(),
            userName: userProfile?.displayName || 'You',
        };

        if (attachment) {
            messagePayload.attachment = attachment;
        }
        
        const newHistory = [...(activeRequest.chatHistory || []), messagePayload];
        
        setIsSending(true);

        const { error } = await supabase
          .from('chatRequests')
          .update({ chatHistory: newHistory })
          .eq('id', activeRequest.id);

        if (error) {
            toast({ variant: 'destructive', title: 'Could not send message', description: error.message });
        } else {
            setCurrentMessage('');
            setAttachment(null);
        }
        setIsSending(false);
    };
    
    const handleCloseChat = async () => {
        if (activeRequest) {
            const { error } = await supabase.from('chatRequests').update({ status: 'closed' }).eq('id', activeRequest.id);
            if (error) {
                toast({ variant: 'destructive', title: 'Could not close server chat', description: error.message });
            }
        }
        
        if (guestChatId) {
            sessionStorage.removeItem(GUEST_CHAT_ID_KEY);
            setGuestChatId(null);
        }
        setActiveRequest(null);
        toast({ title: 'Chat Closed' });
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

  const loading = authLoading || chatLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary">
        <Loader size="md" />
      </div>
    );
  }

  if (activeRequest) {
    const inputDisabled = !isAgentActive || isSending;
    return (
      <div className="flex flex-col h-screen bg-secondary">
        <header className="grid grid-cols-3 items-center p-3 bg-white sticky top-0 z-10 border-b shadow-sm">
            <div className="flex items-center gap-2">
                 <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                    <Link href={user ? "/my" : "/login"}>
                        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                    </Link>
                </Button>
            </div>
            <div className="flex flex-col items-center text-center">
                <h1 className="text-lg font-bold">{isAgentActive ? "JONNY" : "Support"}</h1>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <p className="text-xs text-muted-foreground font-semibold">Online</p>
                </div>
            </div>
            <div className="flex justify-end items-center gap-1">
                <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                    <Link href="/my/chat-history">
                        <History className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </Button>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive">
                           <X className="h-5 w-5" />
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will end your current chat session.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCloseChat} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                
                <Button onClick={handleSoundToggle} variant="ghost" size="icon" className="h-9 w-9">
                    {isSoundOn ? <Volume2 className="h-5 w-5 text-muted-foreground" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
                </Button>
            </div>
        </header>
         {isWaitingForAgent && (
            <div className="p-3 bg-blue-50 border-b border-blue-200 text-center text-sm text-blue-700 font-semibold flex flex-col items-center justify-center gap-1 sticky top-[69px] z-10">
                <p>Please wait, an agent will join shortly.</p>
                {timeLeft !== null && timeLeft > 0 ? (
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-bold text-base text-blue-800">{formatTime(timeLeft)}</span>
                    </div>
                ) : (
                     <div className="flex items-center gap-2 pt-1">
                        <Loader size="xs"/>
                        <span>Connecting...</span>
                    </div>
                )}
            </div>
        )}
        <main ref={chatContainerRef} className="flex-1 space-y-4 p-4 overflow-y-auto">
            {displayedMessages.map((msg, index) => (
              <div key={index} className={cn("flex items-end gap-2", msg.isUser ? "justify-end" : "justify-start")}>
                {!msg.isUser && (
                    <Avatar className="h-8 w-8">
                         <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">{msg.userName === 'JONNY' ? 'J' : 'S'}</AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col max-w-[75%]">
                    <div className={cn("rounded-2xl px-3 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white rounded-bl-none shadow-sm")}>
                      {msg.attachment && msg.attachment.type.startsWith('image/') ? (
                        <Dialog>
                            <DialogTrigger>
                                <Image src={msg.attachment.url} alt="attachment" width={200} height={200} className="rounded-lg mb-2 cursor-pointer" />
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Attachment Preview</DialogTitle>
                                    <DialogDescription>
                                        {msg.attachment.name || 'Attached image'}
                                    </DialogDescription>
                                </DialogHeader>
                                <img src={msg.attachment.url} alt="attachment" className="max-h-[70vh] w-auto object-contain rounded-md mx-auto" />
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
                    profileLoading ? 
                    <Skeleton className="h-8 w-8 rounded-full" /> :
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={defaultAvatarUrl} />
                        <AvatarFallback>{userProfile?.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                 )}
              </div>
            ))}
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
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={inputDisabled}>
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Input 
                    placeholder="Type your message..." 
                    className="flex-1 bg-secondary border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={inputDisabled}
                />
                <Button onClick={handleSendMessage} disabled={inputDisabled || (!currentMessage.trim() && !attachment)} className="btn-gradient rounded-full w-12 h-12">
                    {isSending ? <Loader size="sm" /> : <Send className="h-5 w-5" />}
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
          <div className="flex justify-center pt-10">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold pt-4">Welcome to LG Pay Customer Service!</CardTitle>
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
                  <label htmlFor="phone" className="font-medium">Please enter your registered Phone Number or UID</label>
                  <Input 
                      id="phone" 
                      type="tel"
                      placeholder="Enter 10-digit mobile or 8-digit UID" 
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
            {isVerifying && <Loader size="xs" className="mr-2" />}
            {isVerifying ? 'Connecting...' : 'Start the chat'}
          </Button>
          <p className="text-xs text-muted-foreground">Powered by LG Pay</p>
        </CardFooter>
      </Card>
    </div>
  );
}
