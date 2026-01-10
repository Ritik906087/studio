"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Headphones,
  User,
  RefreshCw,
  X,
  Wallet,
  Landmark,
  ArrowRight,
  CircleDollarSign,
  History,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const quickActions = [
    { icon: ArrowDownToLine, label: 'Buy rules' },
    { icon: ArrowUpFromLine, label: 'Sell rules' },
    { icon: Headphones, label: 'Help Center' },
    { icon: User, label: 'User' },
  ];

  return (
    <div className="flex flex-col bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-gradient">LG Pay</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <X className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow space-y-6 p-4 pt-2">
        {/* My Total Assets */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              My total assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">2.00 LG</p>
          </CardContent>
        </Card>

        {/* Platform Notice */}
        <Carousel className="w-full">
          <CarouselContent>
            {Array.from({ length: 3 }).map((_, index) => (
              <CarouselItem key={index}>
                <Card className="overflow-hidden bg-card">
                  <div className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Platform Notice
                      </p>
                      <h3 className="text-lg font-bold">Key Information</h3>
                      <Link
                        href="#"
                        className="flex items-center text-sm font-semibold text-yellow-500"
                      >
                        View Details <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                    <Image
                      src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/wallet.png?alt=media&token=7e8e6e58-6a4a-4368-bd69-6523918f6562"
                      alt="Wallet with coins"
                      width={100}
                      height={60}
                      data-ai-hint="wallet coins"
                      className="object-contain"
                    />
                  </div>
                </Card>
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
                className="h-14 w-14 rounded-full bg-card"
              >
                <action.icon className="h-6 w-6 text-muted-foreground" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {action.label}
              </span>
            </div>
          ))}
        </div>

        {/* Buy/Sell Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-yellow-400/20 border-yellow-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-yellow-800">Buy LG</h3>
                  <p className="text-xs text-yellow-700">
                    Flexible purchasing
                  </p>
                </div>
                <div className="rounded-md bg-yellow-500/80 p-2">
                  <ArrowDownToLine className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-400/20 border-green-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-green-800">Sell LG</h3>
                  <p className="text-xs text-green-700">Efficient and fast</p>
                </div>
                <div className="rounded-md bg-green-500/80 p-2">
                  <ArrowUpFromLine className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders in Progress */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <History className="h-5 w-5" />
          <span>You have 0 orders in progress</span>
        </div>
        
        <div className="flex justify-center pt-4">
            <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/clipboard.png?alt=media&token=e918e69d-21e1-4c6e-b72e-33513a8f5791" width={100} height={120} alt="Clipboard" className="opacity-30" data-ai-hint="clipboard empty"/>
        </div>
      </main>
    </div>
  );
}
