
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
import { AlertTriangle, Send, ChevronLeft, Paperclip, X, Clock, Volume2, VolumeX, Sparkles, History } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser, useFirestore } from '@/firebase';
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
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
import { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { sendNewChatRequestToTelegram } from '@/lib/telegram';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";
const SOUND_PREF_KEY = 'lg-pay-help-sound-pref';
const GUEST_CHAT_ID_KEY = 'lg-pay-guest-chat-id';

type Attachment = { name: string; type: string; url: string; };
type Message = { text: string; isUser: boolean; attachment?: Attachment; timestamp: number; userName?: string; };
type ChatRequest = { id: string; status: 'pending' | 'active' | 'closed'; createdAt: any; chatHistory: Message[]; userId?: string; userNumericId?: string; enteredIdentifier: string; };

const formatTime = (seconds: number) => {
    if (seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

export default function HelpPage() {
  const { translations } = useLanguage();
  const { user, profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [isSoundOn, setIsSoundOn] = useState(true);
  const [activeRequest, setActiveRequest] = useState<ChatRequest | null>(null);
  const [chatLoading, setChatLoading] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  const autoUnlockAudio = async () => {
    if (unlockedRef.current || audioCtxRef.current) return;
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (context.state === "suspended") await context.resume();
        audioCtxRef.current = context;
        unlockedRef.current = true;
    } catch (e) { console.error("Audio Context Error", e); }
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
      } catch (e) {}
  };

  useEffect(() => {
    if (!firestore) return;
    setChatLoading(true);
    let unsubscribe: any;

    async function fetchInitialChat() {
      let queryRef;
      if (user) {
        queryRef = query(collection(firestore, 'chatRequests'), where('userId', '==', user.uid), where('status', 'in', ['pending', 'active']), orderBy('createdAt', 'desc'), limit(1));
      } else {
        const savedGuestId = sessionStorage.getItem(GUEST_CHAT_ID_KEY);
        if (savedGuestId) {
            queryRef = doc(firestore, 'chatRequests', savedGuestId);
        }
      }

      if (queryRef) {
          if (user) {
              const snap = await getDocs(queryRef as any);
              if (!snap.empty) {
                  const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as ChatRequest;
                  setActiveRequest(data);
                  setupListener(data.id);
              } else { setChatLoading(false); }
          } else {
              const snap = await getDocs(query(collection(firestore, 'chatRequests'), where('__name__', '==', sessionStorage.getItem(GUEST_CHAT_ID_KEY))));
              if (!snap.empty) {
                  const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as ChatRequest;
                  setActiveRequest(data);
                  setupListener(data.id);
              } else { setChatLoading(false); }
          }
      } else { setChatLoading(false); }
    }

    function setupListener(id: string) {
        unsubscribe = onSnapshot(doc(firestore, 'chatRequests', id), (docSnap) => {
            if (docSnap.exists()) {
                setActiveRequest({ id: docSnap.id, ...docSnap.data() } as ChatRequest);
                if (chatLoading) setChatLoading(false);
            }
        });
    }

    fetchInitialChat();
    return () => unsubscribe?.();
  }, [user, firestore]);

  const isWaitingForAgent = activeRequest?.status === 'pending';
  const isAgentActive = activeRequest?.status === 'active';
  const displayedMessages = activeRequest?.chatHistory || [];
  const prevMessagesCount = useRef(displayedMessages?.length ?? 0);

  useEffect(() => {
    if (displayedMessages.length > prevMessagesCount.current) {
        const last = displayedMessages[displayedMessages.length - 1];
        if (last && !last.isUser) playBeep({ frequency: 600 });
    }
    prevMessagesCount.current = displayedMessages.length;
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [displayedMessages]);

  const handleStartChat = async () => {
    let identifier = user ? uid : phone;
    if (!identifier) {
        toast({ variant: 'destructive', title: 'Missing Identifier', description: 'Please enter your UID or Phone.' });
        return;
    }
    if (!firestore) return;

    setIsVerifying(true);
    autoUnlockAudio();

    const initialHistory: Message[] = [{
        text: 'User has started a support session. Please wait for an agent to connect.',
        isUser: false,
        timestamp: Date.now(),
        userName: 'System'
    }];
    
    try {
        const newRequestRef = await addDoc(collection(firestore, 'chatRequests'), {
            userId: user?.uid || null,
            userNumericId: profile?.numericId || null,
            enteredIdentifier: identifier,
            status: 'pending',
            createdAt: serverTimestamp(),
            chatHistory: initialHistory
        });

        if (!user) sessionStorage.setItem(GUEST_CHAT_ID_KEY, newRequestRef.id);
        
        await sendNewChatRequestToTelegram({
            userNumericId: profile?.numericId,
            enteredIdentifier: identifier
        });
        
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to Start Chat', description: e.message });
    } finally {
        setIsVerifying(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!currentMessage.trim() && !attachment) || !isAgentActive || !activeRequest || !firestore) return;
    
    setIsSending(true);
    const messagePayload: Message = {
        text: currentMessage.trim(),
        isUser: true,
        timestamp: Date.now(),
        userName: profile?.displayName || 'You',
        ...(attachment && { attachment })
    };

    try {
        const newHistory = [...(activeRequest.chatHistory || []), messagePayload];
        await updateDoc(doc(firestore, 'chatRequests', activeRequest.id), { chatHistory: newHistory });
        setCurrentMessage('');
        setAttachment(null);
        playBeep({ frequency: 900, type: 'square' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setIsSending(false); }
  };
    
  const handleCloseChat = async () => {
    if (activeRequest && firestore) {
        await updateDoc(doc(firestore, 'chatRequests', activeRequest.id), { status: 'closed' });
    }
    if (!user) sessionStorage.removeItem(GUEST_CHAT_ID_KEY);
    setActiveRequest(null);
    toast({ title: 'Chat Closed' });
  };

  if (authLoading || chatLoading) return <div className="flex items-center justify-center h-screen bg-secondary"><Loader size="md" /></div>;

  if (activeRequest) {
    return (
      <div className="flex flex-col h-screen bg-[#F5F7FB]">
        <header className="grid grid-cols-3 items-center p-3 bg-white sticky top-0 z-10 border-b shadow-sm">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                <Link href={user ? "/my" : "/login"}><ChevronLeft className="h-6 w-6 text-muted-foreground" /></Link>
            </Button>
            <div className="flex flex-col items-center text-center">
                <h1 className="text-sm font-black uppercase tracking-tight">{isAgentActive ? "LIVE AGENT" : "Support"}</h1>
                <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-[9px] text-muted-foreground font-black uppercase">Online</p>
                </div>
            </div>
            <div className="flex justify-end gap-1">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><X className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader><AlertDialogTitle>End Session?</AlertDialogTitle><AlertDialogDescription>This will close your current support ticket.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCloseChat} className="bg-destructive hover:bg-destructive/90 rounded-xl">Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </header>

        <main ref={chatContainerRef} className="flex-1 space-y-4 p-4 overflow-y-auto no-scrollbar pb-24">
            {displayedMessages.map((msg, index) => (
              <div key={index} className={cn("flex items-end gap-2", msg.isUser ? "justify-end" : "justify-start")}>
                {!msg.isUser && (
                    <Avatar className="h-7 w-7 border shadow-sm">
                         <AvatarFallback className="bg-primary text-white font-black text-[10px] uppercase">S</AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col max-w-[80%]">
                    <div className={cn("rounded-2xl px-3 py-2.5 shadow-sm text-sm font-medium", msg.isUser ? "bg-primary text-white rounded-br-none" : "bg-white text-slate-800 rounded-bl-none")}>
                      {msg.attachment?.type.startsWith('image/') && (
                         <Dialog>
                            <DialogTrigger><Image src={msg.attachment.url} alt="attachment" width={180} height={180} className="rounded-xl mb-2" /></DialogTrigger>
                            <DialogContent className="p-0 border-none bg-transparent shadow-none"><img src={msg.attachment.url} alt="attachment" className="max-h-[80vh] w-auto mx-auto rounded-xl" /></DialogContent>
                         </Dialog>
                      )}
                      {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                    </div>
                    <p className={cn("text-[9px] font-black text-slate-400 px-1 pt-1 uppercase", msg.isUser ? "text-right" : "text-left")}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                </div>
              </div>
            ))}
        </main>

        <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t p-3 z-50">
            <div className="flex w-full items-center gap-2">
                <Input 
                    placeholder="Type a message..." 
                    className="flex-1 bg-slate-100 border-none h-11 rounded-2xl text-xs font-bold"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={!isAgentActive || isSending}
                />
                <Button onClick={handleSendMessage} disabled={!isAgentActive || isSending || !currentMessage.trim()} className="btn-gradient rounded-full w-11 h-11 shrink-0 shadow-teal-500/20">
                    {isSending ? <Loader size="xs" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F7FB] p-4">
      <Card className="w-full max-w-sm rounded-[32px] border-none shadow-2xl bg-white overflow-hidden">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
             <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Sparkles className="h-8 w-8 text-primary" />
             </div>
          </div>
          <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Help Center</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">24/7 Priority Support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-2xl flex gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-[10px] text-orange-800 font-bold leading-relaxed">WARNING: OFFICIAL SUPPORT NEVER ASKS FOR OTP OR PASSWORD. DO NOT SHARE PRIVATE KEYS.</p>
          </div>

          <div className="space-y-4">
              <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Identifier</Label>
                  <Input 
                      placeholder={user ? "8-Digit UID" : "Mobile Number / UID"} 
                      value={user ? uid : phone}
                      onChange={(e) => user ? setUid(e.target.value.replace(/\D/g, '').slice(0, 8)) : setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="h-12 bg-slate-50 border-none ring-1 ring-slate-200 rounded-2xl text-center text-lg font-black tracking-widest focus-visible:ring-primary/20"
                  />
              </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col pb-8">
          <Button onClick={handleStartChat} className="w-full h-14 btn-gradient rounded-2xl font-black text-base shadow-teal-500/20" disabled={isVerifying}>
            {isVerifying ? <Loader size="xs" /> : 'START CHAT'}
          </Button>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4">Secured by Flex Shield 4.0</p>
        </CardFooter>
      </Card>
    </div>
  );
}
