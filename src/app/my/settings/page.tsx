
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RefreshCw, X, ChevronRight, Copy } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{displayName: string}>(userProfileRef);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'UID Copied!' });
    });
  };

  return (
    <div className="flex h-screen flex-col bg-secondary">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Settings</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/my">
              <X className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow space-y-6 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Basic Information</h2>
        <div className="space-y-px overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <span className="font-medium">Avatar</span>
            <div className="flex items-center gap-2">
               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400">
                <span className="text-xl font-bold text-yellow-900">{userProfile?.displayName?.charAt(0) || 'A'}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="mx-4 border-b"></div>
          <div className="flex items-center justify-between p-4">
            <span className="font-medium">Nickname</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">{userProfile?.displayName || '...'}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="mx-4 border-b"></div>
          <div className="flex items-center justify-between p-4">
            <span className="font-medium">UID</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{user?.uid}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => user && copyToClipboard(user.uid)}>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
