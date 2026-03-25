
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
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/lib/supabase';

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <Card className={cn("border bg-white rounded-2xl shadow-sm", className)}>
    {children}
  </Card>
);

const faqs = [
    {
        question: "1. How to sell LG?",
        answer: "You can sell LG directly from the app. Go to the 'Sell' section and follow the instructions."
    },
    {
        question: "2. How to withdraw to bank account?",
        answer: "To withdraw funds, link your bank account in the 'My' section and then use the 'Withdraw' option."
    },
    {
        question: "3. How to withdraw LG to game account?",
        answer: "This feature is coming soon. Stay tuned for updates."
    },
    {
        question: "4. Sell order has been completed, but have not received funds to UPI account",
        answer: "Please allow up to 24 hours for the funds to reflect in your UPI account. If it takes longer, contact support."
    },
    {
        question: "5. How to Real-name verification?",
        answer: "You can complete your real-name verification in the 'My' section under 'Profile'."
    },
    {
        question: "6. When will the withdrawal be successful?",
        answer: "Withdrawals are usually processed within a few hours, but can sometimes take up to 48 hours."
    },
    {
        question: "7. How to deactivate LG Pay wallet?",
        answer: "To deactivate your wallet, please contact our customer support team through the 'Support' option."
    },
    {
        question: "8. How to change phone number?",
        answer: "For security reasons, you need to contact customer support to change your registered phone number."
    },
    {
        question: "9. I forgot my payment password",
        answer: "You can reset your payment password from the login screen using the 'Forgot Password' option."
    },
    {
        question: "10. How to add UPI ID?",
        answer: "You can add or manage your UPI IDs in the 'My' section under 'Payment Methods'."
    }
]

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
                if (!isExpired) {
                    onExpire?.();
                    setIsExpired(true);
                }
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp, onExpire, isExpired]);

    if (!timeLeft || timeLeft === "Expired") return null;

    return (
        <div className={cn(
            "flex items-center gap-1 text-xs font-mono",
            "text-yellow-600"
        )}>
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
        </div>
    );
};


const InProgressOrderCard = ({ order, onExpire }: { order: any, onExpire: (orderId: string, type: 'buy' | 'sell', currentStatus: string) => void }) => {
    const isBuy = order.type === 'buy';
    const isSell = order.type === 'sell';
    
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
            expiryTimestamp = new Date(new Date(order.created_at).getTime() + 10 * 60000).toISOString();
        } else if (order.status === 'pending_confirmation') {
            buttonText = "View Order";
            buttonLink = `/order/${order.id}`;
            statusText = "Confirmation";
            if (order.submittedAt) { 
                expiryTimestamp = new Date(new Date(order.submittedAt).getTime() + 30 * 60000).toISOString();
            }
        } else if (order.status === 'in_applied') {
            buttonText = "View Status";
            buttonLink = `/order/${order.id}`;
            statusText = "In Applied";
        }
    } else if (isSell) {
         if (['pending', 'partially_filled', 'processing'].includes(order.status)) {
            buttonText = "View Status";
            buttonLink = `/order/sell/${order.id}`;
            
            switch (order.status) {
                case 'pending':
                    statusText = "Waiting for Buyer";
                    break;
                case 'partially_filled':
                    statusText = "Partially Matched";
                    break;
                case 'processing':
                    statusText = "Fully Matched";
                    break;
                default:
                    statusText = order.status;
            }
        }
    }

    return (
        <Card className="bg-secondary/50">
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow space-y-1">
                        <p className="font-bold text-lg">{currencySymbol}{displayAmount}</p>
                        <div className="flex items-center gap-2">
                             <p className="text-xs text-muted-foreground capitalize">{statusText}</p>
                             {expiryTimestamp ? <Countdown expiryTimestamp={expiryTimestamp} onExpire={() => onExpire(order.id, order.type, order.status)} /> 
                             : order.status === 'in_applied' ? <p className="text-xs text-orange-600 font-semibold">System Busy</p> : null}
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
   const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false, playOnInit: true, stopOnMouseEnter: true })
  );
  
  const { user } = useUser();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [inProgressBuyOrders, setInProgressBuyOrders] = useState<any[]>([]);
  const [inProgressSellOrders, setInProgressSellOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) {
        setOrdersLoading(false);
        return;
    }
    setOrdersLoading(true);
    const [buyRes, sellRes] = await Promise.all([
        supabase.from('orders').select('*').in('status', ['pending_payment', 'pending_confirmation', 'in_applied']),
        supabase.from('sell_orders').select('*').in('status', ['pending', 'partially_filled', 'processing'])
    ]);

    if (buyRes.data) setInProgressBuyOrders(buyRes.data);
    if (sellRes.data) setInProgressSellOrders(sellRes.data);
    setOrdersLoading(false);
  }, [user]);

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('uid', user.id).single();
        setUserProfile(data);
      }
    }
    fetchProfile();
    fetchOrders();
  }, [user, fetchOrders]);

  const carouselImages = [
    "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260311_141545_291.jpg?alt=media&token=515ee5d5-47e8-4d02-887f-5318a98ae4e1",
    "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260311_141548_660.jpg?alt=media&token=90e811b9-cbee-47bd-820b-4f592a6d0ddc",
    "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260311_141536_642.jpg?alt=media&token=184c0b41-bb13-4721-bf91-7aa4391eeac3"
  ];
  
  const hasInProgressOrders = inProgressBuyOrders.length > 0 || inProgressSellOrders.length > 0;

  const handleOrderExpire = useCallback(async (orderId: string, type: 'buy' | 'sell', status: string) => {
    if (!user) return;

    if (type === 'buy' && status === 'pending_confirmation') {
        const { error } = await supabase.from('orders').update({ status: 'in_applied' }).eq('id', orderId).eq('status', 'pending_confirmation');
        if (!error) {
            toast({ title: 'Order Under Review', description: 'System is busy. Please wait for admin review.' });
            fetchOrders();
        }
    }
    // Sell order expiry is handled differently, often by matching or admin action
  }, [user, toast, fetchOrders]);


  return (
    <div className="flex flex-col pb-24 text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center gap-2">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/InShot_20260110_205628399.png?alt=media&token=5d466aa9-095b-495f-92e8-95f3b59b4367"
                width={32}
                height={32}
                alt="LG Pay Logo"
            />
            <h1 className="text-xl font-bold text-gradient">LG Pay</h1>
        </div>
        <div className="w-8"></div>
      </header>

      {/* Main Content */}
      <main className="flex-grow space-y-6 p-4 pt-2">
        {/* My Total Assets */}
        <GlassCard>
          <CardContent className="p-4">
            <p className="text-sm font-normal text-muted-foreground">
              Total LG Balance
            </p>
            <p className="text-3xl font-bold">{userProfile?.balance?.toFixed(2) || '0.00'} <span className="text-2xl font-medium">LGB</span></p>
          </CardContent>
        </GlassCard>

        {/* Image Carousel */}
        <Carousel 
            className="w-full"
            opts={{ loop: true, align: "start" }}
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.play}
        >
          <CarouselContent>
            {carouselImages.map((src, index) => (
              <CarouselItem key={index}>
                <Card className="overflow-hidden rounded-2xl border-none">
                  <Image
                      src={src}
                      alt={`Carousel image ${index + 1}`}
                      width={1536}
                      height={691}
                      className="w-full object-cover"
                    />
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Buy/Sell Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/buy" className="block">
            <Card className="border-none bg-primary/10 shadow-lg h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-primary text-lg">Buy LG</h3>
                  <div className="rounded-md bg-black/5 p-2">
                    <ArrowDownToLine className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/sell" className="block">
            <Card className="border-none bg-green-100 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-green-800 text-lg">Sell LG</h3>
                  <div className="rounded-md bg-black/5 p-2">
                    <ArrowUpFromLine className="h-5 w-5 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        
        {/* In Progress Orders */}
        <GlassCard>
            {ordersLoading ? (
                <CardContent className="p-4 flex items-center justify-center min-h-[120px]">
                    <Loader size="md" />
                </CardContent>
            ) : hasInProgressOrders ? (
                <Tabs defaultValue="buy">
                    <CardContent className="p-0">
                         <TabsList className="w-full justify-start rounded-none bg-secondary/30 p-0 border-b">
                            <TabsTrigger value="buy" className="flex-1 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none">Buy Orders</TabsTrigger>
                            <TabsTrigger value="sell" className="flex-1 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none">Sell Orders</TabsTrigger>
                        </TabsList>
                        <TabsContent value="buy" className="p-3 space-y-3">
                           {inProgressBuyOrders.length > 0 ? (
                                inProgressBuyOrders.map((order: any) => (
                                    <InProgressOrderCard key={order.id} order={{...order, type: 'buy'}} onExpire={handleOrderExpire} />
                                ))
                           ) : (
                                <p className="text-center text-sm text-muted-foreground py-4">No buy orders in progress.</p>
                           )}
                        </TabsContent>
                         <TabsContent value="sell" className="p-3 space-y-3">
                           {inProgressSellOrders.length > 0 ? (
                                inProgressSellOrders.map((order: any) => (
                                    <InProgressOrderCard key={order.id} order={{...order, type: 'sell'}} onExpire={handleOrderExpire} />
                                ))
                           ) : (
                                <p className="text-center text-sm text-muted-foreground py-4">No sell orders in progress.</p>
                           )}
                        </TabsContent>
                    </CardContent>
                </Tabs>
            ) : (
                <CardContent className="p-4 flex flex-col items-center justify-center text-muted-foreground min-h-[120px]">
                    <History className="h-10 w-10 mb-2 opacity-60" />
                    <p className="text-sm">You have 0 orders in progress</p>
                </CardContent>
            )}
        </GlassCard>

        {/* FAQ Section */}
        <div className="space-y-4">
           <h2 className="text-center text-lg font-semibold">Beginner's questions</h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-none">
                    <GlassCard className="rounded-xl">
                      <AccordionTrigger className="p-4 text-left font-semibold text-foreground hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </GlassCard>
                </AccordionItem>
              ))}
            </Accordion>
        </div>
      </main>
    </div>
  );
}

    