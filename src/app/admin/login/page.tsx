
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main login page as requested
    router.replace('/login');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4">
        <Loader size="md" />
        <p className="text-muted-foreground animate-pulse">Redirecting to secure login...</p>
      </div>
    </main>
  );
}
