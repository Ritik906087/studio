

"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6";

export default function SettingsPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: profileLoading } = useDoc<{ displayName: string; photoURL?: string; numericId: string }>(userProfileRef);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'UID Copied!' });
    });
  };

  const handleNameChange = async () => {
    if (!userProfileRef || !newName.trim()) return;
    setIsSaving(true);
    try {
      await updateDoc(userProfileRef, { displayName: newName });
      toast({ title: 'Success', description: 'Your name has been updated.' });
      setIsNameDialogOpen(false);
    } catch (error) {
      console.error("Error updating name: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update name.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="flex h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Settings</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-6 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Basic Information</h2>
        <div className="space-y-px overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <span className="font-medium">Avatar</span>
            <div className="flex items-center gap-2">
               <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarImage src={defaultAvatarUrl} alt={userProfile?.displayName} />
                  <AvatarFallback className="bg-yellow-400 text-yellow-900 font-bold text-lg">
                    {userProfile?.displayName?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
          <div className="mx-4 border-b"></div>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => { if (!isSaving) { setNewName(userProfile?.displayName || ''); setIsNameDialogOpen(true); } }}>
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
              <span className="font-mono text-sm text-muted-foreground">{userProfile?.numericId || '...'}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => userProfile && copyToClipboard(userProfile.numericId)}>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Nickname</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-3"
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNameDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleNameChange} disabled={isSaving}>
              {isSaving && <Loader size="xs" className="mr-2" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    

    
