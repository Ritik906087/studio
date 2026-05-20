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
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Clock,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Logo } from '@/components/logo';

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <Card className={cn("border bg-white rounded-2xl shadow-sm", className)}>
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
            buttonText = "Complete Payment";
            buttonLink = `/buy/confirm/${order.id}?type=${order.paymentType}&provider=${order.paymentProvider}`;
            expiryTimestamp = new Date(order.createdAt.toMillis() + 10 * 60000).toISOString();
        } else if (order.status === 'pending_confirmation') {
            buttonText = "View Order";
            buttonLink = `/order/${order.id}`;
            statusText = "Confirmation";
            if (order.submittedAt) expiryTimestamp = new Date(order.submittedAt.toMillis() + 30 * 60000).toISOString();
        }
    } else {
        buttonText = "View Status";
        buttonLink = `/order/sell/${order.id}`;
    }

    return (
        <Card className="bg-secondary/50">
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow space-y-1">
                        <p className="font-bold text-lg">{currencySymbol}{displayAmount}</p>
                        <div className="flex items-center gap-2">
                             <p className="text-xs text-muted-foreground capitalize">{statusText}</p>
                             {expiryTimestamp && <Countdown expiryTimestamp={expiryTimestamp} onExpire={() => onExpire(order.id, order.type, order.status)} />}
                        </div>
                    </div>
                    <Button asChild size="sm" className="font-bold flex-shrink-0">
                        <Link href={buttonLink}>{buttonText}</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default function HomePage() {
  const plugin = React.useRef(Autoplay({ delay: 2000, stopOnInteraction: false }));
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [inProgressBuyOrders, setInProgressBuyOrders] = useState<any[]>([]);
  const [inProgressSellOrders, setInProgressSellOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    setOrdersLoading(true);

    const buyQuery = query(collection(firestore, 'users', user.uid, 'orders'), where('status', 'in', ['pending_payment', 'pending_confirmation', 'in_applied']));
    const sellQuery = query(collection(firestore, 'users', user.uid, 'sellOrders'), where('status', 'in', ['pending', 'partially_filled', 'processing']));

    const unsubBuy = onSnapshot(buyQuery, (snap) => {
        setInProgressBuyOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'buy' })));
        setOrdersLoading(false);
    });

    const unsubSell = onSnapshot(sellQuery, (snap) => {
        setInProgressSellOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'sell' })));
        setOrdersLoading(false);
    });

    return () => { unsubBuy(); unsubSell(); };
  }, [user, firestore]);

  const handleOrderExpire = useCallback(async (orderId: string, type: 'buy' | 'sell', status: string) => {
    if (!user || !firestore) return;
    if (type === 'buy' && status === 'pending_confirmation') {
        await updateDoc(doc(firestore, 'users', user.uid, 'orders', orderId), { status: 'in_applied' });
        toast({ title: 'Order Under Review', description: 'System is busy. Please wait for admin review.' });
    }
  }, [user, firestore, toast]);

  return (
    <div className="flex flex-col pb-24 text-foreground">
      <header className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center gap-2">
            <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/InShot_20260110_205628399.png?alt=media&token=5d466aa9-095b-495f-92e8-95f3b59b4367" width={32} height={32} alt="Logo" />
            <Logo className="text-xl" />
        </div>
      </header>

      <main className="flex-grow space-y-6 p-4 pt-2">
        <GlassCard>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total FLEX Balance</p>
            <p className="text-3xl font-bold">{profile?.balance?.toFixed(2) || '0.00'} <span className="text-2xl font-medium">FP</span></p>
          </CardContent>
        </GlassCard>

        <Carousel className="w-full" plugins={[plugin.current]}>
          <CarouselContent>
            {[1, 2, 3].map((i) => (
              <CarouselItem key={i}>
                <Card className="overflow-hidden rounded-2xl border-none">
                  <Image src={`https://picsum.photos/seed/${i}/600/300`} alt="Banner" width={600} height={300} className="w-full object-cover" data-ai-hint="banner promo" />
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="grid grid-cols-2 gap-4">
          <Button asChild className="h-16 btn-gradient text-lg"><Link href="/buy">Buy FLEX</Link></Button>
          <Button asChild variant="outline" className="h-16 border-green-200 bg-green-50 text-green-800 text-lg hover:bg-green-100"><Link href="/sell">Sell FLEX</Link></Button>
        </div>
        
        <GlassCard>
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
                    <History className="h-10 w-10 mb-2 opacity-30" /><p className="text-sm">No orders in progress</p>
                </CardContent>
            )}
        </GlassCard>

        <div className="space-y-4">
           <h2 className="text-center text-lg font-semibold">FAQs</h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-none">
                    <GlassCard className="rounded-xl">
                      <AccordionTrigger className="p-4 text-left font-semibold">{faq.question}</AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-muted-foreground">{faq.answer}</AccordionContent>
                    </GlassCard>
                </AccordionItem>
              ))}
            </Accordion>
        </div>
      </main>
    </div>
  );
}
