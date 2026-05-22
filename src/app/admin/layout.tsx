
'use client';

import React, { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { Monitor, AlertTriangle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isTooSmall, setIsTooSmall] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const checkSize = () => {
            setIsTooSmall(window.innerWidth < 1280);
        };
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    if (!isMounted) return <div className="flex h-screen items-center justify-center bg-[#020617]"><Loader size="md" /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
            {/* Desktop Only Enforcement */}
            {isTooSmall && (
                <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center text-white p-8 text-center">
                    <div className="h-20 w-20 rounded-3xl bg-blue-600/10 flex items-center justify-center mb-6 border border-blue-500/20">
                        <Monitor className="h-10 w-10 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter uppercase mb-2">Desktop Access Only</h1>
                    <p className="text-slate-400 max-w-md text-sm font-medium leading-relaxed mb-6">
                        The Enterprise Management Console is optimized for large screens (min 1280px). 
                        Please switch to a desktop or laptop to manage the system securely.
                    </p>
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Security Requirement: Tier 4</span>
                    </div>
                </div>
            )}
            
            {/* Forced Desktop Container */}
            <div className="min-w-[1280px] h-full">
                {children}
            </div>
        </div>
    );
}
