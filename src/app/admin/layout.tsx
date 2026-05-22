'use client';

import React, { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

/**
 * AdminLayout enforces a desktop-level width even on mobile devices.
 * This ensures the enterprise dashboard layout is preserved, requiring 
 * horizontal scrolling on smaller screens rather than collapsing.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="flex h-screen items-center justify-center bg-[#020617]"><Loader size="md" /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-auto overflow-y-auto">
            {/* 
                Forcing a minimum width of 1280px ensures the layout 
                always stays in 'Desktop Mode' even on mobile browsers.
            */}
            <div className="min-w-[1280px] w-full min-h-screen relative">
                {children}
            </div>
        </div>
    );
}
