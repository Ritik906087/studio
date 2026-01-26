"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Copy, Loader2, Camera } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarClick = () => {
    if (isSaving) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !storage || !userProfileRef) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 2MB.' });
        return;
    }

    setIsSaving(true);
    try {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storageRef = ref(storage, `avatars/${user.uid}/${sanitizedFileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await updateDoc(userProfileRef, { photoURL: downloadURL });
      toast({ title: 'Success', description: 'Profile picture updated.' });
    } catch (error) {
      console.error("Error uploading image: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload image.' });
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
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={handleAvatarClick}>
            <span className="font-medium">Avatar</span>
            <div className="flex items-center gap-2">
               <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName} />
                  <AvatarFallback className="bg-yellow-400 text-yellow-900 font-bold text-lg">
                    {userProfile?.displayName?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                {isSaving && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"><Loader2 className="h-6 w-6 animate-spin text-white" /></div> }
                {!isSaving && <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary"><Camera className="h-3 w-3 text-white"/></div>}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/gif"
              className="hidden"
              disabled={isSaving}
            />
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
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
