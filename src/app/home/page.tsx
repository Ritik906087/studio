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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Headphones,
  User,
  RefreshCw,
  X,
  History,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Autoplay from "embla-carousel-autoplay";
import React from 'react';

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <Card className={cn("border-none bg-white/10 shadow-2xl shadow-primary/10 backdrop-blur-lg", className)}>
    {children}
  </Card>
);

const quickActions = [
  { icon: ArrowUpFromLine, label: 'Transfer' },
  { icon: User, label: 'My QR' },
  { icon: Headphones, label: 'Support' },
  { icon: ArrowDownToLine, label: 'Receive' },
];

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

export default function HomePage() {
   const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false, playOnInit: true, stopOnMouseEnter: true })
  );

  const carouselImages = [
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002654720b92e47bf4b904ef1c.png?alt=media&token=76a4ec53-db8c-41f7-afd5-02f453e9983d",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221844_146.jpg?alt=media&token=9230032d-6628-4187-88a4-881d9ed10411",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221845_327.jpg?alt=media&token=b03926fd-1ebe-4ed2-b8ec-031e4f00770c",
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/IMG_20260110_221847_606.jpg?alt=media&token=a56dbce6-9cc2-4d97-b623-97f3d726b66b"
  ];

  return (
    <div className="flex flex-col pb-24 text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-gradient">LG Pay</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
            <RefreshCw className="h-5 w-5 text-white/80" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
            <X className="h-5 w-5 text-white/80" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow space-y-6 p-4 pt-2">
        {/* My Total Assets */}
        <GlassCard>
          <CardContent className="p-4">
            <p className="text-sm font-normal text-white/70">
              My total assets
            </p>
            <p className="text-3xl font-bold text-white">2.00 LG</p>
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
                <GlassCard className="rounded-2xl">
                  <Image
                      src={src}
                      alt={`Carousel image ${index + 1}`}
                      width={600}
                      height={200}
                      className="w-full object-cover aspect-[2/1] rounded-2xl"
                    />
                </GlassCard>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4 text-center">
          {quickActions.map((action) => (
            <div
              key={action.label}
              className="flex flex-col items-center gap-2"
            >
              <Button
                variant="ghost"
                className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20"
              >
                <action.icon className="h-6 w-6 text-white/80" />
              </Button>
              <span className="text-xs text-white/80">
                {action.label}
              </span>
            </div>
          ))}
        </div>

        {/* Buy/Sell Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none bg-gradient-to-br from-yellow-300/80 to-yellow-500/80 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-yellow-900">Buy LG</h3>
                  <p className="text-xs text-yellow-800">
                    Flexible purchasing
                  </p>
                </div>
                <div className="rounded-md bg-white/30 p-2">
                  <ArrowDownToLine className="h-5 w-5 text-yellow-900" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none bg-gradient-to-br from-green-300/80 to-green-500/80 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-green-900">Sell LG</h3>
                  <p className="text-xs text-green-800">Efficient and fast</p>
                </div>
                <div className="rounded-md bg-white/30 p-2">
                  <ArrowUpFromLine className="h-5 w-5 text-green-900" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="text-black">
          <Tabs defaultValue="beginner" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
              <TabsTrigger value="beginner" className="rounded-full data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=inactive]:text-white/70">Beginner's questions</TabsTrigger>
              <TabsTrigger value="trading" className="rounded-full data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=inactive]:text-white/70">Trading problems</TabsTrigger>
            </TabsList>
            <TabsContent value="beginner">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-none">
                     <GlassCard className="rounded-xl">
                        <AccordionTrigger className="p-4 text-left font-semibold text-white/90 hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 text-white/70">
                          {faq.answer}
                        </AccordionContent>
                      </GlassCard>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
            <TabsContent value="trading">
              <p className="text-center text-white/70 p-8">No trading problems to display.</p>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
