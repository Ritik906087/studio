'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, HelpCircle, BookOpen, CreditCard, ArrowUpToLine, ArrowDownToLine, Zap } from 'lucide-react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from '@/components/ui/card';

const faqList = [
  {
    id: 'how-to-buy',
    title: 'How to Buy Flex Assets?',
    icon: <ArrowUpToLine className="h-4 w-4 text-blue-500" />,
    steps: [
      'Go to the "Home" screen and tap on the "Buy" button.',
      'Browse the available market orders and select the amount you wish to purchase.',
      'Choose your payment app (MobiKwik or Freecharge) that you have linked.',
      'The system will generate a secure QR code. Scan this QR using your payment app.',
      'Complete the payment in your app and copy the 12-digit UTR/Reference number.',
      'Return to Flex Pay, paste the UTR number, upload the payment screenshot, and tap "Confirm".',
      'The system will audit the transaction and release assets to your balance within minutes.'
    ]
  },
  {
    id: 'how-to-sell',
    title: 'How to Sell & Withdraw?',
    icon: <ArrowDownToLine className="h-4 w-4 text-emerald-500" />,
    steps: [
      'Go to the "Home" screen and tap on the "Sell" button.',
      'Enter the amount you wish to withdraw (Must be a multiple of 100).',
      'Select your linked UPI account where you want to receive the money.',
      'Tap "Sell Now". Your assets will be moved to the escrow hold.',
      'The system will automatically match your sale with active buyers.',
      'As soon as a buyer completes the payment and it is verified, the money will hit your bank account.',
      'You can monitor the progress in "Order History".'
    ]
  },
  {
    id: 'link-account',
    title: 'How to Link Payment Account?',
    icon: <CreditCard className="h-4 w-4 text-purple-500" />,
    steps: [
      'Navigate to the "Mine" page and tap on "Account".',
      'Tap the "+" icon or "Link Account" button.',
      'Select your UPI provider (PhonePe, Paytm, etc.).',
      'Enter your UPI ID (VPA) accurately.',
      'Complete the Cloudflare security check (Human verification).',
      'Tap "Verify ID". The system will fetch your bank record name automatically.',
      'Review the details and tap "Link Account".'
    ]
  },
  {
    id: 'rewards-info',
    title: 'How do Rewards Work?',
    icon: <Zap className="h-4 w-4 text-orange-500" />,
    steps: [
      'Newbie Reward: Complete all tasks (Join Telegram, Watch FAQ, etc.) to get a ₹300 bonus.',
      'Trading Bonus: Get a 6.0% + ₹5 instant bonus on every buy order.',
      'Affiliate Bonus (L1): Earn 1% of the trade value whenever your direct invitee buys.',
      'Affiliate Bonus (L2): Earn 0.8% of the trade value from your level 2 network.',
      'Daily Tasks: Reach trading milestones every day to claim cash rewards in the "Rewards" section.'
    ]
  }
];

export default function FaqPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FB] font-body">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-white p-3 md:p-4 shadow-sm">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-slate-50">
          <Link href="/my">
            <ChevronLeft className="h-5 w-5 text-slate-800" />
          </Link>
        </Button>
        <h1 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight">Help & FAQ</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-grow p-3 md:p-4 space-y-4">
        <div className="text-center py-4">
            <div className="h-14 w-14 md:h-16 md:w-16 bg-blue-600 rounded-[20px] md:rounded-[22px] flex items-center justify-center mx-auto mb-3 shadow-xl shadow-blue-500/20">
                <BookOpen className="h-7 w-7 md:h-8 md:w-8 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">User Guide</h2>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Flex Pay Protocol</p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqList.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="border-none rounded-[20px] md:rounded-[24px] bg-white shadow-sm overflow-hidden px-3 md:px-4">
              <AccordionTrigger className="py-4 md:py-5 hover:no-underline group">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="grid h-8 w-8 md:h-9 md:w-9 place-items-center rounded-xl bg-slate-50 border border-slate-100 group-data-[state=open]:bg-blue-50 transition-colors">
                        {faq.icon}
                    </div>
                    <span className="font-black text-[11px] md:text-[13px] text-slate-700 uppercase tracking-tight text-left">{faq.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-5 md:pb-6">
                <div className="space-y-4 border-t border-slate-50 pt-4">
                    <div className="space-y-3">
                        {faq.steps.map((step, index) => (
                            <div key={index} className="flex gap-2.5 md:gap-3">
                                <div className="h-4 w-4 md:h-5 md:w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] md:text-[10px] font-black shrink-0 mt-0.5">
                                    {index + 1}
                                </div>
                                <p className="text-[10px] md:text-[11px] font-bold text-slate-500 leading-relaxed uppercase">{step}</p>
                            </div>
                        ))}
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Card className="border-none bg-blue-600 text-white rounded-[20px] md:rounded-[24px] shadow-lg shadow-blue-500/20 mt-6 md:mt-8">
            <CardContent className="p-5 md:p-6 text-center space-y-4">
                <HelpCircle className="h-8 w-8 md:h-10 md:w-10 mx-auto opacity-50" />
                <div>
                    <h3 className="text-base md:text-lg font-black uppercase tracking-tight">Still Need Help?</h3>
                    <p className="text-[9px] md:text-[10px] font-bold text-blue-100/70 uppercase tracking-widest mt-1">Our team is available 24/7 on Telegram</p>
                </div>
                <Button asChild className="w-full bg-white text-blue-600 hover:bg-white/90 h-11 md:h-12 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs">
                    <Link href="/help">Contact Support</Link>
                </Button>
            </CardContent>
        </Card>
        
        <div className="text-center py-6 md:py-8 opacity-20">
            <Zap className="h-4 w-4 mx-auto mb-1" />
            <p className="text-[6px] md:text-[7px] font-black uppercase tracking-[0.4em]">Protocol Version 4.5.2</p>
        </div>
      </main>
    </div>
  );
}
