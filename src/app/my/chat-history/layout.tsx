'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ChatHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="home-layout md:bg-gray-200">
        <div className="relative mx-auto flex min-h-screen w-full flex-col items-center justify-center bg-background md:max-w-md md:shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="home-layout md:bg-gray-200">
      <div className="relative mx-auto flex min-h-screen w-full flex-col bg-background md:max-w-md md:shadow-lg">
        {children}
      </div>
    </div>
  );
}
