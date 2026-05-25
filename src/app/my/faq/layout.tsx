
import type { ReactNode } from 'react';

export default function FaqLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FB]">
        {children}
    </div>
  );
}
