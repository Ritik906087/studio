

"use client";
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
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, Timestamp, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';


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

const Countdown = ({ expiryTimestamp, onExpire }: { expiryTimestamp: Timestamp, onExpire?: () => void }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const expiryTime = expiryTimestamp.toDate().getTime();

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

    if (!timeLeft) return null;

    return (
        <div className={cn(
            "flex items-center gap-1 text-xs font-mono",
            timeLeft === "Expired" ? "text-red-500" : "text-yellow-600"
        )}>
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
        </div>
    );
};


const InProgressOrderCard = ({ order, onExpire }: { order: any, onExpire: (orderId: string, type: 'buy' | 'sell') => void }) => {
    const isBuy = order.type === 'buy';
    const isSell = order.type === 'sell';
    
    let buttonText = "View";
    let buttonLink = "/order";
    let statusText = order.status.replace('_', ' ');
    let expiryTimestamp: Timestamp | undefined;

    const isUSDT = isBuy && order.paymentType === 'usdt';
    const displayAmount = isUSDT ? (order.amount / 110).toFixed(2) : order.amount.toFixed(2);
    const currencySymbol = isUSDT ? '$' : '₹';

    if (isBuy) {
        if (order.status === 'pending_payment') {
            buttonText = "Complete Payment";
            buttonLink = `/buy/confirm/${order.id}?type=${order.paymentType}&provider=${order.paymentProvider}`;
            expiryTimestamp = new Timestamp(order.createdAt.seconds + 10 * 60, order.createdAt.nanoseconds);
        } else if (order.status === 'pending_confirmation') {
            buttonText = "View Order";
            buttonLink = `/order/${order.id}`;
            statusText = "Confirmation";
            if (order.submittedAt) { 
                expiryTimestamp = new Timestamp(order.submittedAt.seconds + 30 * 60, order.submittedAt.nanoseconds);
            }
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
                             {expiryTimestamp && <Countdown expiryTimestamp={expiryTimestamp} onExpire={() => onExpire(order.id, order.type)} />}
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
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc(userProfileRef);

 const buyOrdersQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'users', user.uid, 'orders'),
        where('status', 'in', ['pending_payment', 'pending_confirmation'])
    );
  }, [user, firestore]);

  const sellOrdersQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'users', user.uid, 'sellOrders'),
        where('status', 'in', ['pending', 'partially_filled', 'processing'])
    );
  }, [user, firestore]);

  const { data: inProgressBuyOrders, loading: buyOrdersLoading } = useCollection(buyOrdersQuery);
  const { data: inProgressSellOrders, loading: sellOrdersLoading } = useCollection(sellOrdersQuery);

  const carouselImages = [
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002654720b92e47bf4b904ef1c.png?alt=media&token=76a4ec53-db8c-41f7-afd5-02f453e9983d",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221844_146.jpg?alt=media&token=9230032d-6628-4187-88a4-881d9ed10411",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221845_327.jpg?alt=media&token=b03926fd-1ebe-4ed2-b8ec-031e4f00770c",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221847_606.jpg?alt=media&token=a56dbce6-9cc2-4d97-b623-97f3d726b66b"
  ];
  
  const ordersLoading = buyOrdersLoading || sellOrdersLoading;
  const hasInProgressOrders = (inProgressBuyOrders && inProgressBuyOrders.length > 0) || (inProgressSellOrders && inProgressSellOrders.length > 0);

  const handleOrderExpire = useCallback(async (orderId: string, type: 'buy' | 'sell') => {
    if (!firestore || !user) return;

    const collectionName = type === 'buy' ? 'orders' : 'sellOrders';
    const orderRef = doc(firestore, 'users', user.uid, collectionName, orderId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const orderSnap = await transaction.get(orderRef);
            if (!orderSnap.exists()) return;

            const orderData = orderSnap.data();
            const validBuyStatuses = ['pending_payment', 'pending_confirmation'];
            
            if (type === 'buy' && !validBuyStatuses.includes(orderData.status)) return;
            
            if (type === 'buy') {
                transaction.update(orderRef, {
                    status: 'failed',
                    cancellationReason: 'Order automatically expired.',
                });
            }
        });
        toast({ variant: 'destructive', title: 'Order Expired', description: `Your ${type} order has been marked as failed.` });
    } catch (error) {
        console.error(`Failed to expire ${type} order ${orderId}:`, error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update expired order.' });
    }
  }, [firestore, user, toast]);


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
                      width={600}
                      height={200}
                      className="w-full object-cover aspect-[2/1]"
                    />
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Buy/Sell Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/buy" className="block">
            <Card className="border-none bg-yellow-100 shadow-lg h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-yellow-900">Buy LG</h3>
                    <p className="text-xs text-yellow-800">
                      Flexible purchasing
                    </p>
                  </div>
                  <div className="rounded-md bg-black/5 p-2">
                    <ArrowDownToLine className="h-5 w-5 text-yellow-900" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/sell" className="block">
            <Card className="border-none bg-green-100 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-green-900">Sell LG</h3>
                    <p className="text-xs text-green-800">Efficient and fast</p>
                  </div>
                  <div className="rounded-md bg-black/5 p-2">
                    <ArrowUpFromLine className="h-5 w-5 text-green-900" />
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
                           {inProgressBuyOrders && inProgressBuyOrders.length > 0 ? (
                                inProgressBuyOrders.map((order: any) => (
                                    <InProgressOrderCard key={order.id} order={{...order, type: 'buy'}} onExpire={handleOrderExpire} />
                                ))
                           ) : (
                                <p className="text-center text-sm text-muted-foreground py-4">No buy orders in progress.</p>
                           )}
                        </TabsContent>
                         <TabsContent value="sell" className="p-3 space-y-3">
                           {inProgressSellOrders && inProgressSellOrders.length > 0 ? (
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
