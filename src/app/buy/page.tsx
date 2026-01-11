"use client";

import React from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type PurchaseOption = {
  amount: number;
  reward: number;
  limit: string;
  isSponsored?: boolean;
  paymentMethods: string[];
};

const purchaseOptions: PurchaseOption[] = [
  { amount: 3100, reward: 62, limit: '3100-3,100', paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 4000, reward: 80, limit: '4000-4,000', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3200, reward: 64, limit: '3200-3,200', paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3500, reward: 70, limit: '3500-3,500', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 2700, reward: 54, limit: '2700-2,700', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3500, reward: 70, limit: '3500-3,500', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 2000, reward: 60, limit: '2000-2,000', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 6000, reward: 120, limit: '6000-6,000', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3000, reward: 60, limit: '3000-3,000', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3100, reward: 62, limit: '3100-3,100', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 2500, reward: 50, limit: '2500-2,500', paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3000, reward: 60, limit: '3000-3,000', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 2500, reward: 50, limit: '2500-2,500', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 2500, reward: 50, limit: '2500-2,500', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3000, reward: 60, limit: '3000-3,000', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 5000, reward: 100, limit: '5000-5,000', isSponsored: true, paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
  { amount: 3000, reward: 60, limit: '3000-3,000', paymentMethods: ['paytm', 'phonepe', 'gpay', 'upi', 'impsonline'] },
];

const paymentMethodIcons: { [key: string]: string } = {
  paytm: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002ab4fa90623a8b4e712ccb34.png?alt=media&token=df4f494a-b5e1-4550-932f-7634f19bca40",
  phonepe: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_0000000021c5ba9d1620a2322301980a.png?alt=media&token=c4d16853-90d5-455f-8461-460d37e6f80d",
  gpay: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_00000000100d0758404a3773b0a7de2f.png?alt=media&token=a3e390c2-550a-42f1-ab66-224483a93649",
  upi: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002f231e3d304e6c46a6f1d154.png?alt=media&token=9635e9c9-2b07-4c4f-90e8-07e54c86b241",
  impsonline: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000001d9f82161f5c66e92700e57e.png?alt=media&token=40428d05-4c07-4e78-9e63-c78b663b6d09"
};


const PurchaseCard = ({ option }: { option: PurchaseOption }) => (
  <Card className="mb-4 bg-white text-foreground shadow-sm">
    <CardContent className="p-4 flex items-center gap-4">
      {option.isSponsored ? (
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">A</div>
      ) : (
         <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000003e876a3e6fde9cd5d2f70b79.png?alt=media&token=3852033c-396a-49f3-8b7a-8b1b6e4e3a47" width={24} height={24} alt="icon"/>
        </div>
      )}
      <div className="flex-grow space-y-1">
        <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg">₹{option.amount}</span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">UPI</span>
        </div>
        <div className="text-xs text-muted-foreground">
            <span className="text-yellow-500 font-semibold">Reward +{option.reward}</span>
            <span className="ml-2">Limit {option.limit}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
            {option.paymentMethods.map(pm => <Image key={pm} src={paymentMethodIcons[pm]} width={16} height={16} alt={pm} className="rounded-sm" />)}
        </div>
      </div>
      <Button className="bg-yellow-400 text-yellow-900 font-bold hover:bg-yellow-500 rounded-lg px-6">Buy</Button>
    </CardContent>
  </Card>
);

export default function BuyPage() {
  const sortedSmall = React.useMemo(() => [...purchaseOptions].sort((a, b) => a.amount - b.amount), []);
  const sortedLarge = React.useMemo(() => [...purchaseOptions].sort((a, b) => b.amount - a.amount), []);

  return (
    <div className="text-foreground pb-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/home">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold">Buy</h1>
            <p className="text-xs text-muted-foreground">1INR=1LGB 1U=97.00 INR</p>
        </div>
        <div className="w-8"></div>
      </header>

      <main className="p-4">
        <Tabs defaultValue="otp-upi" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto">
            <TabsTrigger value="otp-upi" className="text-base data-[state=active]:font-bold data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground p-3 relative">OTP-UPI <span className="absolute top-1 right-1 text-xs text-red-500 font-bold">+5%</span></TabsTrigger>
            <TabsTrigger value="bank" className="text-base data-[state=active]:font-bold data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground p-3 relative">BANK <span className="absolute top-1 right-1 text-xs text-red-500 font-bold">+6%</span></TabsTrigger>
          </TabsList>
          
          <div className="mt-4 p-2 bg-orange-100 text-orange-700 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Tips: Requires KYC connection to purchase.</span>
          </div>

          <Tabs defaultValue="default" className="w-full mt-4">
            <TabsList className="bg-gray-100 rounded-lg p-1 h-auto">
                <TabsTrigger value="default" className="px-4 py-1 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Default</TabsTrigger>
                <TabsTrigger value="large" className="px-4 py-1 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Large</TabsTrigger>
                <TabsTrigger value="small" className="px-4 py-1 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Small</TabsTrigger>
            </TabsList>
            <TabsContent value="default" className="mt-4">
                {purchaseOptions.map((option, index) => (
                    <PurchaseCard key={index} option={option} />
                ))}
            </TabsContent>
            <TabsContent value="large" className="mt-4">
                {sortedLarge.map((option, index) => (
                    <PurchaseCard key={index} option={option} />
                ))}
            </TabsContent>
            <TabsContent value="small" className="mt-4">
                {sortedSmall.map((option, index) => (
                    <PurchaseCard key={index} option={option} />
                ))}
            </TabsContent>
          </Tabs>

        </Tabs>
      </main>
    </div>
  );
}
