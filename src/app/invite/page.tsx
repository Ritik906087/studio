'use client';

import React from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Gift,
  Clipboard,
} from 'lucide-react';
import Image from 'next/image';

const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <Card
    className={'border bg-white shadow-sm ' + className}
  >
    {children}
  </Card>
);

export default function InvitePage() {
  return (
    <div className="min-h-screen text-foreground pb-24">
      {/* Header */}
      <header className="flex items-center justify-between bg-white p-4 sticky top-0 z-10 border-b">
        <div className="w-8"></div>
        <h1 className="text-xl font-bold">Invitation Bonus</h1>
        <div className="w-8"></div>
      </header>

      <main className="space-y-4 p-4">
        <GlassCard>
            <CardContent className="p-4 space-y-4">
                <div className="rounded-lg overflow-hidden">
                    <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6" width={400} height={150} alt="Invite friends" className="w-full" />
                </div>
                <h3 className="font-bold text-center">Invite friends to join LG Pay, rewards credited instantly</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                        <Clipboard className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
                        <span>Click "Invite Now" to share your exclusive link or poster.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Users className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
                        <span>Friends register via the link or QR code and complete their first trade.</span>
                    </li>
                     <li className="flex items-start gap-3">
                        <Gift className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
                        <span>Invited users can unlock exclusive tasks and get extra rewards.</span>
                    </li>
                </ul>
                <p className="text-xs text-center text-yellow-700 bg-yellow-100 p-2 rounded-md">Note: Reach LV3 (VIP) to unlock extra rewards and rebates.</p>
                <Button className="w-full btn-gradient rounded-full font-semibold">Invite Now</Button>
                <Button variant="ghost" className="w-full text-muted-foreground">View Invitation Data</Button>
            </CardContent>
        </GlassCard>
      </main>
    </div>
  );
}
