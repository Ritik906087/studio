"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  RefreshCw,
  X,
  Award,
  Users,
  Gift,
  BadgeHelp,
  Clipboard,
  Trophy,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <Card
    className={cn(
      'border-none bg-white/10 shadow-lg backdrop-blur-md',
      className
    )}
  >
    {children}
  </Card>
);

const LevelIcon = ({
  level,
  isActive,
  isLocked,
}: {
  level: string;
  isActive?: boolean;
  isLocked?: boolean;
}) => (
  <div className="flex flex-col items-center gap-2">
    <div
      className={cn(
        'relative flex h-14 w-14 items-center justify-center rounded-full bg-white/10',
        isActive && 'bg-yellow-400/80',
        isLocked && 'opacity-50'
      )}
    >
      <Trophy
        className={cn(
          'h-8 w-8',
          isActive ? 'text-yellow-900' : 'text-white/70'
        )}
      />
    </div>
    <span
      className={cn(
        'text-xs font-semibold',
        isActive ? 'text-white' : 'text-white/60'
      )}
    >
      {level}
    </span>
  </div>
);

export default function RewardsPage() {
  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="flex items-center justify-between bg-transparent p-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-white/10"
        >
          <Link href="/home">
            <ChevronLeft className="h-6 w-6 text-white/80" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-white">Rewards</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
          >
            <RefreshCw className="h-5 w-5 text-white/80" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
          >
            <X className="h-5 w-5 text-white/80" />
          </Button>
        </div>
      </header>

      <main className="space-y-4 p-4">
        {/* Reward Claimed */}
        <GlassCard className="bg-yellow-400/10">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-yellow-400" />
              <p className="text-sm font-semibold">
                Reward Claimed <span className="font-bold text-yellow-300">2 LG</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
            >
              <BadgeHelp className="h-4 w-4" />
              Rules
            </Button>
          </CardContent>
        </GlassCard>

        {/* Current Level Card */}
        <GlassCard className="overflow-hidden bg-gradient-to-br from-yellow-400/20 to-yellow-600/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white/80">
                Current Level
              </CardTitle>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/50">
                 <Trophy className="h-9 w-9 text-yellow-200" />
              </div>
            </div>
            <p className="text-4xl font-bold">LV0</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Progress value={20} className="h-2 bg-white/20" />
              <div className="flex justify-between text-xs font-medium text-white/80">
                <span>LV0</span>
                <span>LV1</span>
              </div>
            </div>
            <div className="grid grid-cols-3 text-center">
              <div>
                <p className="font-bold">0</p>
                <p className="text-xs text-white/70">Valid Trading Volume</p>
              </div>
              <div>
                <p className="font-bold">0</p>
                <p className="text-xs text-white/70">Successful Buy Count</p>
              </div>
              <div>
                <p className="font-bold">0</p>
                <p className="text-xs text-white/70">Successful Sell Count</p>
              </div>
            </div>
          </CardContent>
        </GlassCard>

        {/* Level Selector */}
        <div className="grid grid-cols-5 gap-2 px-2">
          <LevelIcon level="LV0" isActive />
          <LevelIcon level="LV1" isLocked />
          <LevelIcon level="LV2" isLocked />
          <LevelIcon level="LV3" isLocked />
          <LevelIcon level="LV4" isLocked />
        </div>
        
        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm h-12 rounded-xl p-1">
            <TabsTrigger value="task" className="text-base data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">Task</TabsTrigger>
            <TabsTrigger value="invite" className="text-base data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">Invite</TabsTrigger>
          </TabsList>
          <TabsContent value="task">
             <GlassCard>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center text-white/70">
                    <Award className="h-12 w-12 opacity-50 mb-4" />
                    <p className="text-lg font-medium">No tasks available</p>
                    <p className="text-sm">Check back later for new tasks.</p>
                </CardContent>
            </GlassCard>
          </TabsContent>
          <TabsContent value="invite">
            <GlassCard>
                <CardContent className="p-4 space-y-4">
                    <div className="rounded-lg overflow-hidden">
                        <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6" width={400} height={150} alt="Invite friends" className="w-full" />
                    </div>
                    <h3 className="font-bold text-center">Invite friends to join LG Pay, rewards credited instantly</h3>
                    <ul className="space-y-3 text-sm text-white/80">
                        <li className="flex items-start gap-3">
                            <Clipboard className="h-4 w-4 mt-0.5 shrink-0 text-yellow-400" />
                            <span>Click "Invite Now" to share your exclusive link or poster.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Users className="h-4 w-4 mt-0.5 shrink-0 text-yellow-400" />
                            <span>Friends register via the link or QR code and complete their first trade.</span>
                        </li>
                         <li className="flex items-start gap-3">
                            <Gift className="h-4 w-4 mt-0.5 shrink-0 text-yellow-400" />
                            <span>Invited users can unlock exclusive tasks and get extra rewards.</span>
                        </li>
                    </ul>
                    <p className="text-xs text-center text-yellow-300/80 bg-yellow-900/30 p-2 rounded-md">Note: Reach LV3 (VIP) to unlock extra rewards and rebates.</p>
                    <Button className="w-full btn-gradient rounded-full font-semibold">Invite Now</Button>
                    <Button variant="ghost" className="w-full text-white/70 hover:text-white">View Invitation Data</Button>
                </CardContent>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
