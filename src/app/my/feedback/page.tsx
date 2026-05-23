'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { useRouter } from 'next/navigation';

export default function FeedbackPage() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Please enter your feedback.' });
      return;
    }
    if (!user || !profile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Session data not found.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save to Supabase to save Firestore Quota
      const { error } = await supabase.from('feedback').insert({
        userId: user.uid,
        userNumericId: profile.numericId,
        message: message,
      });

      if (error) throw error;

      toast({ title: 'Feedback Submitted', description: 'Thank you for your suggestion!' });
      setMessage('');
      router.push('/my');
    } catch (error: any) {
      console.error('Failed to submit feedback to Supabase', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Feedback</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <Card className="bg-white border-none shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4 font-medium">
              We value your feedback! Please share any suggestions or ideas to help us improve.
            </p>
            <Textarea
              placeholder="Enter your suggestions here..."
              className="bg-slate-50 border-none rounded-xl focus-visible:ring-primary/20"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
            />
          </CardContent>
        </Card>
        <Button
          onClick={handleSubmit}
          className="w-full h-14 btn-gradient rounded-2xl font-black text-base shadow-teal-500/20"
          disabled={isSubmitting || !message.trim()}
        >
          {isSubmitting ? <Loader size="xs" className="mr-2" /> : "SUBMIT FEEDBACK"}
        </Button>
      </main>
    </div>
  );
}
