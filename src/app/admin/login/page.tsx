
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dedicated admin secure portal
    router.replace('/admin/key');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900 text-white">
      <div className="text-center space-y-4">
        <Loader size="md" />
        <p className="text-slate-400 animate-pulse text-lg">Accessing Secure Portal...</p>
      </div>
    </main>
  );
}
