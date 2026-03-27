
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { useRouter } from 'next/navigation';

type UserProfile = {
  numericId: string;
};

export default function FeedbackPage() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        const { data } = await supabase.from('users').select('numericId').eq('id', user.id).single();
        if (data) setUserProfile(data);
      }
    }
    fetchProfile();
  }, [user]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Please enter your feedback.' });
      return;
    }
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'You must be logged in to submit feedback.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        userId: user.id,
        userNumericId: userProfile.numericId,
        message: message,
      });
      if (error) throw error;
      toast({ title: 'Feedback Submitted', description: 'Thank you for your suggestion!' });
      setMessage('');
      router.push('/my');
    } catch (error: any) {
      console.error('Failed to submit feedback', error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              We value your feedback! Please share any suggestions or ideas to help us improve.
            </p>
            <Textarea
              placeholder="Enter your suggestions here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
            />
          </CardContent>
        </Card>
        <Button
          onClick={handleSubmit}
          className="w-full h-12 btn-gradient font-bold"
          disabled={isSubmitting || !message.trim()}
        >
          {isSubmitting ? <Loader size="xs" className="mr-2" /> : null}
          Submit Feedback
        </Button>
      </main>
    </>
  );
}
