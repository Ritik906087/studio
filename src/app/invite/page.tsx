
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { UserPlus } from 'lucide-react';

type UserProfile = {
  numericId: string;
};

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
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const handleInvite = async () => {
    if (!userProfile) {
      toast({
        variant: 'destructive',
        title: 'Could not get invitation code',
        description: 'Please try again later.',
      });
      return;
    }

    const invitationCode = userProfile.numericId;
    const inviteUrl = `${window.location.origin}/register?ref=${invitationCode}`;
    const inviteText = `Join me on LG Pay and earn rewards! Use my invitation code: ${invitationCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join LG Pay!',
          text: inviteText,
          url: inviteUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to clipboard if sharing fails (e.g., user cancels)
        navigator.clipboard.writeText(inviteUrl);
        toast({
          title: 'Link Copied!',
          description: 'Invitation link copied to clipboard.',
        });
      }
    } else {
      // Fallback for browsers that don't support the Share API
      navigator.clipboard.writeText(inviteUrl);
      toast({
        title: 'Link Copied!',
        description: 'Invitation link copied to clipboard.',
      });
    }
  };


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
                <div className="flex justify-center rounded-lg overflow-hidden">
                    <Image src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6" width={80} height={30} alt="Invite friends" />
                </div>
                <h3 className="font-bold text-center">Invite friends to join LG Pay, rewards credited instantly</h3>
                
                <div className="space-y-4 text-sm text-foreground">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <h4 className="font-bold text-primary">Level 1 Team (Lv 1)</h4>
                        <p className="mt-1 text-primary/80">These are friends you invite directly. When they buy LGB, you get a <span className="font-bold">+2%</span> bonus.</p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                        <h4 className="font-bold text-accent">Level 2 Team (Lv 2)</h4>
                        <p className="mt-1 text-accent/80">These are friends invited by your Level 1 friends. When they buy LGB, you still get a <span className="font-bold">+1%</span> bonus.</p>
                    </div>
                </div>

                <p className="text-xs text-center text-yellow-700 bg-yellow-100 p-2 rounded-md">Note: The more your team trades, the more you earn. Bonuses are credited instantly.</p>
                <Button onClick={handleInvite} className="w-full btn-gradient rounded-full font-semibold" disabled={profileLoading}>
                  {profileLoading ? <Loader size="xs" className="mr-2" /> : "Invite Now"}
                </Button>
                <Button asChild variant="ghost" className="w-full text-muted-foreground">
                  <Link href="/my/team">View Invitation Data</Link>
                </Button>
            </CardContent>
        </GlassCard>
      </main>
    </div>
  );
}
