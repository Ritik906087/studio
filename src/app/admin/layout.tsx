'use client';

import React, { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

/**
 * AdminLayout is now fully responsive.
 * It adjusts based on the device width without forcing a desktop-only view.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="flex h-screen items-center justify-center bg-[#020617]"><Loader size="md" /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-hidden">
            <div className="w-full min-h-screen relative">
                {children}
            </div>
        </div>
    );
}
