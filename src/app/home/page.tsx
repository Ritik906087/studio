'use client';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  History,
  Clock,
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Logo } from '@/components/logo';

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <Card className={cn("border bg-white rounded-2xl shadow-sm border-blue-50", className)}>
    {children}
  </Card>
);

const faqs = [
    { question: "1. How to sell FP?", answer: "You can sell FP directly from the app. Go to the 'Sell' section and follow the instructions." },
    { question: "2. How to withdraw to bank account?", answer: "To withdraw funds, link your bank account in the 'My' section and then use the 'Withdraw' option." },
    { question: "3. How to withdraw FP to game account?", answer: "This feature is coming soon. Stay tuned for updates." },
    { question: "4. Sell order has been completed, but have not received funds", answer: "Please allow up to 24 hours for the funds to reflect. If it takes longer, contact support." },
];

const Countdown = ({ expiryTimestamp, onExpire }: { expiryTimestamp: string, onExpire?: () => void }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const expiryTime = new Date(expiryTimestamp).getTime();
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = expiryTime - now;
            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("Expired");
                if (!isExpired) { onExpire?.(); setIsExpired(true); }
                return;
            }
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [expiryTimestamp, onExpire, isExpired]);

    if (!timeLeft || timeLeft === "Expired") return null;
    return <div className="flex items-center gap-1 text-xs font-mono text-yellow-600"><Clock className="h-3 w-3" /><span>{timeLeft}</span></div>;
};

const InProgressOrderCard = ({ order, onExpire }: { order: any, onExpire: (orderId: string, type: 'buy' | 'sell', currentStatus: string) => void }) => {
    const isBuy = order.type === 'buy';
    let buttonText = "View";
    let buttonLink = "/order";
    let statusText = order.status.replace('_', ' ');
    let expiryTimestamp: string | undefined;

    const isUSDT = isBuy && order.paymentType === 'usdt';
    const displayAmount = isUSDT ? (order.amount / 110).toFixed(2) : order.amount.toFixed(2);
    const currencySymbol = isUSDT ? '$' : '₹';

    if (isBuy) {
        if (order.status === 'pending_payment') {
            buttonText = "Pay Now";
            buttonLink = `/buy/confirm/${order.id}?type=${order.paymentType}&provider=${order.paymentProvider}`;
            expiryTimestamp = new Date(order.createdAt.toMillis() + 10 * 60000).toISOString();
        } else if (order.status === 'pending_confirmation') {
            buttonText = "Checking";
            buttonLink = `/order/${order.id}`;
            statusText = "Verification";
            if (order.submittedAt) expiryTimestamp = new Date(order.submittedAt.toMillis() + 30 * 60000).toISOString();
        }
    } else {
        buttonText = "Status";
        buttonLink = `/order/sell/${order.id}`;
    }

    return (
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-1">
                <p className="font-bold text-lg text-primary">{currencySymbol}{displayAmount}</p>
                <div className="flex items-center gap-2">
                     <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{statusText}</p>
                     {expiryTimestamp && <Countdown expiryTimestamp={expiryTimestamp} onExpire={() => onExpire(order.id, order.type, order.status)} />}
                </div>
            </div>
            <Button asChild size="sm" className="font-bold bg-primary hover:bg-primary/90 text-white rounded-full px-5">
                <Link href={buttonLink}>{buttonText}</Link>
            </Button>
        </div>
    );
};

export default function HomePage() {
  const plugin = React.useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));
  const { user, profile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [inProgressBuyOrders, setInProgressBuyOrders] = useState<any[]>([]);
  const [inProgressSellOrders, setInProgressSellOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
        if (!userLoading) setOrdersLoading(false);
        return;
    }
    setOrdersLoading(true);

    const buyQuery = query(collection(firestore, 'users', user.uid, 'orders'), where('status', 'in', ['pending_payment', 'pending_confirmation', 'in_applied']));
    const sellQuery = query(collection(firestore, 'users', user.uid, 'sellOrders'), where('status', 'in', ['pending', 'partially_filled', 'processing']));

    const unsubBuy = onSnapshot(buyQuery, (snap) => {
        setInProgressBuyOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'buy' })));
        setOrdersLoading(false);
    }, (error) => {
        console.error("Buy Orders Listener Error:", error);
        setOrdersLoading(false);
    });

    const unsubSell = onSnapshot(sellQuery, (snap) => {
        setInProgressSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'sell' })));
        setOrdersLoading(false);
    }, (error) => {
        console.error("Sell Orders Listener Error:", error);
        setOrdersLoading(false);
    });

    return () => { unsubBuy(); unsubSell(); };
  }, [user, userLoading, firestore]);

  const handleOrderExpire = useCallback(async (orderId: string, type: 'buy' | 'sell', status: string) => {
    if (!user || !firestore) return;
    if (type === 'buy' && status === 'pending_confirmation') {
        try {
            await updateDoc(doc(firestore, 'users', user.uid, 'orders', orderId), { status: 'in_applied' });
            toast({ title: 'Order Under Review', description: 'System is busy. Please wait for admin review.' });
        } catch (e) {
            console.error("Failed to update expired order status", e);
        }
    }
  }, [user, firestore, toast]);

  return (
    <div className="flex flex-col pb-24 text-foreground bg-slate-50 min-h-screen">
      <header className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
        <Logo className="text-xl" />
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary fill-primary" />
            <span className="text-xs font-bold text-primary">v2.5</span>
          </div>
        </div>
      </header>

      <main className="flex-grow space-y-6 p-4">
        <Card className="border-none bg-gradient-to-br from-primary to-blue-700 text-white rounded-3xl shadow-xl shadow-blue-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp className="h-32 w-32" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-sm font-medium">Total Balance</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black">{profile?.balance?.toFixed(2) || '0.00'}</p>
                  <span className="text-xl font-bold opacity-80">FP</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-6 flex gap-4 text-xs font-medium text-white/80">
              <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                1 FP ≈ 1 INR
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                Secure SSL
              </div>
            </div>
          </CardContent>
        </Card>

        <Carousel className="w-full" plugins={[plugin.current]}>
          <CarouselContent>
            {[1, 2, 3].map((i) => (
              <CarouselItem key={i}>
                <Card className="overflow-hidden rounded-2xl border-none shadow-md">
                  <Image src={`https://picsum.photos/seed/${i+10}/600/300`} alt="Banner" width={600} height={300} className="w-full object-cover h-32" data-ai-hint="business banner" />
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="grid grid-cols-2 gap-4">
          <Button asChild className="h-14 btn-gradient text-lg rounded-2xl"><Link href="/buy">Add Funds</Link></Button>
          <Button asChild variant="outline" className="h-14 border-blue-200 bg-white text-primary text-lg hover:bg-blue-50 rounded-2xl shadow-sm"><Link href="/sell">Withdraw</Link></Button>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Active Operations</h3>
          <GlassCard className="rounded-2xl">
              {ordersLoading ? (
                  <CardContent className="p-8 flex items-center justify-center"><Loader size="sm" /></CardContent>
              ) : (inProgressBuyOrders.length + inProgressSellOrders.length > 0) ? (
                  <CardContent className="p-3 space-y-3">
                      {[...inProgressBuyOrders, ...inProgressSellOrders].map(o => (
                          <InProgressOrderCard key={o.id} order={o} onExpire={handleOrderExpire} />
                      ))}
                  </CardContent>
              ) : (
                  <CardContent className="p-8 flex flex-col items-center justify-center text-muted-foreground">
                      <Zap className="h-10 w-10 mb-2 opacity-20" /><p className="text-sm font-medium">Ready for transactions</p>
                  </CardContent>
              )}
          </GlassCard>
        </div>

        <div className="space-y-4">
           <h2 className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest">Help & Support</h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-none">
                    <GlassCard className="rounded-xl border-none shadow-sm overflow-hidden">
                      <AccordionTrigger className="p-4 text-left font-bold text-slate-700 hover:no-underline">{faq.question}</AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-slate-500 font-medium">{faq.answer}</AccordionContent>
                    </GlassCard>
                </AccordionItem>
              ))}
            </Accordion>
        </div>
      </main>
    </div>
  );
}