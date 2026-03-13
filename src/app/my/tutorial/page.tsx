
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const tutorials = [
  {
    id: 'buy',
    title: 'How to Buy LGB',
    description: 'A step-by-step guide on purchasing LGB in the app.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    steps: [
      'Go to the Home page and click "Buy".',
      'Select the amount you want to purchase.',
      'Choose your payment method (UPI or Bank).',
      'Follow the on-screen instructions to complete the payment.',
      'Submit the UTR number and a screenshot of your payment.',
      'Your LGB balance will be updated after confirmation.'
    ]
  },
  {
    id: 'sell',
    title: 'How to Sell LGB',
    description: 'Learn how to sell your LGB and withdraw funds.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    steps: [
        'Go to the Home page and click "Sell".',
        'Enter the amount you wish to sell.',
        'Select your linked UPI account for withdrawal.',
        'Confirm the sell order.',
        'Wait for the transaction to be processed by the system.'
    ]
  },
  {
    id: 'upi',
    title: 'How to Link a UPI Account',
    description: 'Link your UPI account to enable withdrawals.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    steps: [
        'Go to the "My" page.',
        'Tap on "Payment Method".',
        'Click on "Add payment UPI".',
        'Select your UPI provider (e.g., PhonePe, Paytm).',
        'Enter your registered phone number and UPI ID.',
        'Verify with the OTP sent to your phone.'
    ]
  },
];

export default function TutorialPage() {
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Tutorials</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <Accordion type="single" collapsible className="w-full space-y-3">
          {tutorials.map((tutorial) => (
            <AccordionItem key={tutorial.id} value={tutorial.id} className="border-none rounded-2xl bg-white shadow-sm overflow-hidden">
              <AccordionTrigger className="p-4 text-left hover:no-underline">
                <div className="flex items-center gap-4">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                        <PlayCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold">{tutorial.title}</span>
                        <span className="text-xs text-muted-foreground">{tutorial.description}</span>
                    </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                        <video
                            src={tutorial.videoUrl}
                            controls
                            className="h-full w-full object-cover"
                            poster="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_00000000bd5072068c98a569253739e7.png?alt=media&token=3035c470-4755-4b35-a364-60d55ae22513"
                        />
                    </div>
                    <ul className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        {tutorial.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                        ))}
                    </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </>
  );
}
