
import type { ReactNode } from 'react';

export default function TutorialLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary">
        {children}
    </div>
  );
}
