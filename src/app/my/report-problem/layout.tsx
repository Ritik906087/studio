
'use client';
import { ReactNode } from 'react';

export default function ReportProblemLayout({ children }: { children: ReactNode }) {
  return (
    <div className="home-layout md:bg-gray-200">
      <div className="relative mx-auto flex min-h-screen w-full flex-col bg-secondary md:max-w-md md:shadow-lg">
        {children}
      </div>
    </div>
  );
}
