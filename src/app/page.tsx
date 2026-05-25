'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Loader } from '@/components/ui/loader';

/**
 * Root page acts as the central traffic controller.
 * It ensures users are immediately directed to the correct dashboard based on auth state.
 */
export default function RootPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return <Loader fullscreen={true} />;
}