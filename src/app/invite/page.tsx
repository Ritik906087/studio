'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { Loader } from '@/components/ui/loader';
import { UserPlus, Clipboard, Send, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";


// SVG for WhatsApp Icon
const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 4.109 0 7.828 1.605 10.603 4.38 2.775 2.775 4.38 6.494 4.38 10.604-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.606 1.558 5.579 1.557 5.453 0 9.904-4.45 9.904-9.904s-4.45-9.904-9.904-9.904-9.904 4.45-9.904 9.904c0 2.02.604 3.965 1.698 5.617l-1.192 4.359 4.423-1.157zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.52.074-.792.372c-.272.296-1.04 1.016-1.04 2.479s1.065 2.871 1.213 3.069c.149.198 2.096 3.203 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.289.173-1.413z" />
  </svg>
);


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

type UserProfile = {
  numericId: string;
};

export default function InvitePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const getShareDetails = () => {
    if (!userProfile?.numericId) {
        return null;
    }
    const invitationCode = userProfile.numericId;
    const inviteUrl = `${window.location.origin}/register?ref=${invitationCode}`;
    const shareText = `Join me on LG Pay and earn rewards! Use my invitation code: ${invitationCode}\n\n${inviteUrl}`;
    const shareTitle = 'Join LG Pay!';

    return { inviteUrl, shareText, shareTitle, invitationCode };
  }

  const handleInvite = async () => {
    const details = getShareDetails();
    if (!details) {
      toast({
        variant: 'destructive',
        title: 'Could not get invitation code',
        description: 'Please wait a moment and try again.'
      });
      return;
    }
    
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: details.shareTitle,
          text: details.shareText,
          url: details.inviteUrl,
        });
      } catch (error) {
        console.log('Sharing was cancelled or failed.', error);
      }
    } else {
      // Fallback: open custom share sheet
      setIsShareSheetOpen(true);
    }
  };

  const handleCopyLink = () => {
    const details = getShareDetails();
    if (!details) {
      toast({
        variant: 'destructive',
        title: 'Could not get invitation code',
      });
      return;
    }
    navigator.clipboard.writeText(details.inviteUrl).then(() => {
        toast({
            title: 'Link Copied!',
            description: 'Invitation link copied to clipboard.',
        });
        setIsShareSheetOpen(false); // Close sheet after copying
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        toast({
            variant: 'destructive',
            title: 'Failed to Copy',
            description: 'Could not copy the link. Please try again.',
        });
    });
  };
  
  const handleWhatsAppShare = () => {
    const details = getShareDetails();
    if (!details) return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(details.shareText)}`;
    window.open(whatsappUrl, '_blank');
    setIsShareSheetOpen(false);
  };

  const handleTelegramShare = () => {
    const details = getShareDetails();
    if (!details) return;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(details.inviteUrl)}&text=${encodeURIComponent(details.shareText)}`;
    window.open(telegramUrl, '_blank');
    setIsShareSheetOpen(false);
  };


  return (
    <>
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
                  
                  <Button onClick={handleInvite} className="w-full btn-gradient rounded-full font-semibold h-12 text-base" disabled={profileLoading}>
                    {profileLoading ? <Loader size="xs" className="mr-2" /> : "Invite Now"}
                  </Button>

                  <Button asChild variant="ghost" className="w-full text-muted-foreground">
                    <Link href="/my/team">View Invitation Data</Link>
                  </Button>
              </CardContent>
          </GlassCard>
        </main>
      </div>
      
      <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-center">
            <SheetTitle>Share with friends</SheetTitle>
            <SheetDescription>
              Choose an app to share your invitation.
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 py-6 text-center">
            <button onClick={handleWhatsAppShare} className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white">
                <WhatsAppIcon />
              </div>
              <span>WhatsApp</span>
            </button>
            <button onClick={handleTelegramShare} className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-sky-500 text-white">
                <Send className="h-6 w-6" />
              </div>
              <span>Telegram</span>
            </button>
            <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
                <Clipboard className="h-6 w-6" />
              </div>
              <span>Copy Link</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}
