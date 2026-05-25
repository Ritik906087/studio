'use client';

import React, { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { useRouter } from 'next/navigation';

/**
 * AdminLayout provides a strict auth shell for management routes.
 * It obscurs admin content until a valid session is verified.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isAuthorized, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
        
        const sessionStr = localStorage.getItem('flex_admin_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            const ALLOWED_ADMINS = ['9955557336', '9060873927'];
            if (session.authenticated && ALLOWED_ADMINS.includes(session.masterId) && session.expires > Date.now()) {
              setIsAdmin(true);
            } else {
              router.replace('/admin/key');
            }
          } catch (e) {
            router.replace('/admin/key');
          }
        } else {
          // If accessing an admin route without session, redirect to secure portal
          if (window.location.pathname !== '/admin/key') {
             router.replace('/admin/key');
          } else {
             setIsAdmin(true); // Allow rendering the login/key page itself
          }
        }
    }, [router]);

    if (!isMounted || (!isAuthorized && window.location.pathname !== '/admin/key')) {
      return <div className="flex h-screen items-center justify-center bg-[#020617]"><Loader size="md" /></div>;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-hidden">
            {/* Reset viewport/touch settings specifically for admin if needed, 
                but keeping standard responsive behavior for management simplicity. */}
            <div className="w-full min-h-screen relative">
                {children}
            </div>
        </div>
    );
}