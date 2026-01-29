
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
import { LifeBuoy, UserPlus, AlertTriangle, Send, ChevronLeft, Loader2, Paperclip, Image as ImageIcon, X, Clock, Volume2, VolumeX, Sparkles, History } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, limit, Timestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { helpChat, type HelpChatInput, escalateToHuman } from '@/ai/flows/help-chat-flow';
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

const CHAT_STATE_STORAGE_KEY = 'lg-pay-help-chat-state';
const SOUND_PREF_KEY = 'lg-pay-help-sound-pref';

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

type ChatStep = 'welcome' | 'language' | 'problem' | 'escalating' | 'chatting';

const problemCategories = [
    { key: "payment", label: "Payment Issue", icon: "💳" },
    { key: "withdrawal", label: "Withdrawal Problem", icon: "💸" },
    { key: "account", label: "Account Access", icon: "👤" },
    { key: "other", label: "Other", icon: "❓" },
]

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
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enteredIdentifier, setEnteredIdentifier] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [isSoundOn, setIsSoundOn] = useState(true);

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  const [chatStep, setChatStep] = useState<ChatStep>('welcome');

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


  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{ numericId?: string, displayName?: string, photoURL?: string }>(userProfileRef);

  const allUserChatRequestsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const q = query(
        collection(firestore, 'chatRequests'),
        where('userId', '==', user.uid),
    );
    return q;
  }, [user, firestore]);

  const { data: allUserChatRequests, loading: chatRequestsLoading } = useCollection<ChatRequest>(allUserChatRequestsQuery);
  
  const activeRequest = useMemo(() => {
      if (!allUserChatRequests || allUserChatRequests.length === 0) return null;
      // Sort client-side to avoid needing a composite index
      return allUserChatRequests
        .filter(req => ['pending', 'active'].includes(req.status))
        .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)[0];
  }, [allUserChatRequests]);

  const activeChatRequestRef = useMemo(() => {
    if (!firestore || !activeRequest) return null;
    return doc(firestore, 'chatRequests', activeRequest.id);
  }, [firestore, activeRequest]);

  const { data: liveChat } = useDoc<ChatRequest>(activeChatRequestRef);

  const isWaitingForAgent = activeRequest?.status === 'pending';
  const isAgentActive = liveChat?.status === 'active';

  const displayedMessages = isAgentActive ? liveChat?.chatHistory || messages : messages;
  const prevMessagesCount = useRef(displayedMessages?.length ?? 0);

  // Load chat state and sound preference from localStorage
  useEffect(() => {
    try {
        const savedStateJSON = localStorage.getItem(CHAT_STATE_STORAGE_KEY);
        if (savedStateJSON && !isAgentActive) {
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.chatStarted) {
                setMessages(savedState.messages || []);
                setChatStep(savedState.chatStep || 'welcome');
                setEnteredIdentifier(savedState.enteredIdentifier || '');
                setChatStarted(true);
                autoUnlockAudio();
            }
        }

        const savedSoundPref = localStorage.getItem(SOUND_PREF_KEY);
        if (savedSoundPref !== null) {
            setIsSoundOn(JSON.parse(savedSoundPref));
        }
    } catch (error) {
        console.error("Failed to load data from storage:", error);
        localStorage.removeItem(CHAT_STATE_STORAGE_KEY);
    }
  }, [isAgentActive]);

  // Save chat state to localStorage, but only if not in an active agent chat
  useEffect(() => {
    if (chatStarted && !isAgentActive && chatStep !== 'escalating') {
        try {
            const stateToSave = {
                messages,
                chatStep,
                enteredIdentifier,
                chatStarted,
            };
            localStorage.setItem(CHAT_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save chat state to storage:", error);
        }
    }
  }, [messages, chatStep, enteredIdentifier, chatStarted, isAgentActive]);


   // Countdown Timer Logic
  useEffect(() => {
    if (isWaitingForAgent && activeRequest?.createdAt && !isAgentActive) {
        const createdAt = activeRequest.createdAt.toDate();
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

  // Combined useEffect for scrolling and sound
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
    autoUnlockAudio(); // Unlock audio on first user interaction
    setTimeout(() => {
      setIsVerifying(false);
      setChatStarted(true);
      if (messages.length === 0 && !isAgentActive) {
        setChatStep('language');
        setMessages([{ text: "Please select your preferred language.", isUser: false, timestamp: Date.now(), userName: 'AI HELP' }]);
      }
    }, 1500);
  };

  const handleLanguageSelect = (language: string) => {
    const userMsg: Message = { text: language, isUser: true, timestamp: Date.now(), userName: userProfile?.displayName || 'You' };
    const botMsg: Message = { text: "How can I help you today? Please choose an option below.", isUser: false, timestamp: Date.now(), userName: 'AI HELP' };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setChatStep('problem');
  }

  const handleProblemSelect = async (problem: string) => {
    const userMsg: Message = { text: problem, isUser: true, timestamp: Date.now(), userName: userProfile?.displayName || 'You' };
    const botMsg: Message = { text: "Thank you. I am connecting you to a support agent shortly.", isUser: false, timestamp: Date.now(), userName: 'AI HELP' };
    const newMessages = [...messages, userMsg, botMsg];
    setMessages(newMessages);
    setChatStep('escalating');

    await escalateToHuman({
        uid: user?.uid,
        enteredIdentifier: enteredIdentifier,
        chatHistory: newMessages,
    });
    localStorage.removeItem(CHAT_STATE_STORAGE_KEY);
  }

  const handleOkAfterEscalation = () => {
    setChatStep('chatting');
  }
  
    const handleSendMessage = async () => {
        if ((!currentMessage.trim() && !attachment) || isWaitingForAgent || chatStep !== 'chatting') return;
        
        playSendSound(); // Play sound on send action

        const messagePayload: Message = {
            text: currentMessage.trim(),
            isUser: true,
            timestamp: Date.now(),
            userName: userProfile?.displayName || 'You',
        };

        if (isAgentActive) {
            // Logic for sending message to human agent
            if (!firestore || !activeRequest) {
                setIsSending(false);
                return;
            }
            setIsSending(true);
            const requestRef = doc(firestore, 'chatRequests', activeRequest.id);
            if (attachment) {
                messagePayload.attachment = attachment;
            }

            try {
                await updateDoc(requestRef, { chatHistory: arrayUnion(messagePayload) });
                setCurrentMessage('');
                setAttachment(null);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Could not send message', description: error.message });
            } finally {
                setIsSending(false);
            }
            return;
        }

        // Logic for sending message to AI (before agent joins)
        setIsSending(true);
        const textForPrompt = currentMessage.trim();
        
        if (attachment) {
            messagePayload.attachment = attachment;
        }
        
        setCurrentMessage('');
        setAttachment(null);
        
        const updatedMessages = [...messages, messagePayload];
        setMessages(updatedMessages);
        
        try {
            const input: HelpChatInput = { 
                prompt: textForPrompt, 
                uid: user?.uid,
                chatHistory: updatedMessages,
                enteredIdentifier: enteredIdentifier,
            };
            
            if (attachment) {
                input.prompt += ` (Attachment: ${attachment.name})`;
            }
                  
            const response = await helpChat(input);
            const aiResponse: Message = { text: response, isUser: false, timestamp: Date.now(), userName: 'AI HELP' };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            const response = "Thank you. Your request has been submitted. A support agent will review your case and connect with you shortly.";
            const aiResponse: Message = { text: response, isUser: false, timestamp: Date.now(), userName: 'AI HELP' };
            setMessages(prev => [...prev, aiResponse]);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleCloseChat = async () => {
        if (!firestore || !activeRequest) return;
        const requestRef = doc(firestore, 'chatRequests', activeRequest.id);
        try {
            await updateDoc(requestRef, { status: 'closed' });
            toast({ title: 'Chat Closed' });
            setChatStarted(false);
            setMessages([]);
            setChatStep('welcome');
            localStorage.removeItem(CHAT_STATE_STORAGE_KEY);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Could not close chat', description: error.message });
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

  if (chatStarted || isAgentActive || isWaitingForAgent) {
    const inputDisabled = (chatStep !== 'chatting' && !isAgentActive) || isSending || isWaitingForAgent;
    return (
      <div className="flex flex-col h-screen bg-secondary">
        <header className="grid grid-cols-3 items-center p-3 bg-white sticky top-0 z-10 border-b shadow-sm">
            <div className="flex items-center gap-2">
                 <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                    <Link href={user ? "/my" : "/login"}>
                        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                    </Link>
                </Button>
                {isWaitingForAgent && !isAgentActive && timeLeft !== null && timeLeft > 0 && (
                    <div className="flex items-center gap-1 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
                    </div>
                )}
            </div>
            <div className="flex flex-col items-center text-center">
                <h1 className="text-lg font-bold">{isAgentActive ? "JONNY" : "AI HELP"}</h1>
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

                {(isWaitingForAgent || isAgentActive) && (
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
                )}
                
                <Button onClick={handleSoundToggle} variant="ghost" size="icon" className="h-9 w-9">
                    {isSoundOn ? <Volume2 className="h-5 w-5 text-muted-foreground" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
                </Button>
            </div>
        </header>
         {isWaitingForAgent && !isAgentActive && chatStep === 'chatting' && (
            <div className="p-3 bg-blue-100 border-b border-blue-200 text-center text-sm text-blue-800 font-semibold flex items-center justify-center gap-2 sticky top-[69px] z-10">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting you to an agent... Please wait.
            </div>
        )}
        <main ref={chatContainerRef} className="flex-1 space-y-4 p-4 overflow-y-auto">
            {displayedMessages.map((msg, index) => (
              <div key={index} className={cn("flex items-end gap-2", msg.isUser ? "justify-end" : "justify-start")}>
                {!msg.isUser && (
                    <Avatar className="h-8 w-8">
                         <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">{msg.userName === 'JONNY' ? 'J' : 'AI'}</AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col max-w-[75%]">
                    <div className={cn("rounded-2xl px-3 py-2", msg.isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white rounded-bl-none shadow-sm")}>
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
            {isSending && !isAgentActive && (
                <div className="flex items-end gap-2 justify-start">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-white rounded-2xl px-4 py-2 rounded-bl-none shadow-sm">
                       <p className="text-sm">Typing...</p>
                    </div>
                </div>
            )}
             {!isAgentActive && (
                <>
                    {chatStep === 'language' && (
                        <div className="flex justify-center gap-2 p-2">
                            <Button onClick={() => handleLanguageSelect('English')} variant="outline" className="bg-white">English</Button>
                            <Button onClick={() => handleLanguageSelect('Hindi')} variant="outline" className="bg-white">Hindi</Button>
                        </div>
                    )}
                    {chatStep === 'problem' && (
                        <div className="grid grid-cols-2 gap-3 p-2">
                            {problemCategories.map(p => 
                                <Button key={p.key} onClick={() => handleProblemSelect(p.label)} variant="outline" className="bg-white h-auto justify-start py-3">
                                    <span className="mr-2 text-lg">{p.icon}</span> {p.label}
                                </Button>
                            )}
                        </div>
                    )}
                    {chatStep === 'escalating' && (
                        <div className="flex justify-center gap-2 p-2">
                            <Button onClick={handleOkAfterEscalation} className="btn-gradient">OK</Button>
                        </div>
                    )}
                </>
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
