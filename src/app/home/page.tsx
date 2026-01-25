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
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import Autoplay from "embla-carousel-autoplay";
import React from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';


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

const InProgressOrderCard = ({ order }: { order: any }) => {
    const isProcessing = order.status === 'processing';
    const buttonText = isProcessing ? "View" : "Complete Payment";
    const buttonColor = isProcessing ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600";
    const link = isProcessing ? `/order/${order.id}` : `/buy/confirm/${order.id}?type=${order.paymentType}`;

    return (
        <Card className="bg-secondary/50">
            <CardContent className="p-3 flex items-center justify-between">
                <div>
                    <p className="font-bold">₹{order.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{order.status.replace('_', ' ')}</p>
                </div>
                <Button asChild className={cn("text-white font-bold", buttonColor)}>
                    <Link href={link}>{buttonText}</Link>
                </Button>
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

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc(userProfileRef);

  const ordersQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'users', user.uid, 'orders'),
        where('status', 'in', ['pending_payment', 'processing'])
    );
  }, [user, firestore]);

  const { data: inProgressOrders, loading: ordersLoading } = useCollection(ordersQuery);


  const carouselImages = [
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002654720b92e47bf4b904ef1c.png?alt=media&token=76a4ec53-db8c-41f7-afd5-02f453e9983d",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221844_146.jpg?alt=media&token=9230032d-6628-4187-88a4-881d9ed10411",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221845_327.jpg?alt=media&token=b03926fd-1ebe-4ed2-b8ec-031e4f00770c",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221847_606.jpg?alt=media&token=a56dbce6-9cc2-4d97-b623-97f3d726b66b"
  ];

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
        </div>
        
        {/* In Progress Orders */}
        <GlassCard>
            {ordersLoading ? (
                <CardContent className="p-4 flex items-center justify-center min-h-[120px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            ) : inProgressOrders && inProgressOrders.length > 0 ? (
                <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-muted-foreground">You have {inProgressOrders.length} order(s) in progress</h3>
                    {inProgressOrders.map((order: any) => (
                        <InProgressOrderCard key={order.id} order={order} />
                    ))}
                </CardContent>
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
