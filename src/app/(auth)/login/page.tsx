
"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Turnstile } from '@/components/auth/turnstile';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { Smartphone, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const { translations } = useLanguage();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  return (
    <div className="w-full max-sm animate-in fade-in slide-in-from-bottom-2 duration-500 py-4 flex flex-col justify-center min-h-[80vh]">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
           <Smartphone className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          {translations.accountLogin}
        </h1>
        <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest italic">Digital Liquidity Network</p>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-blue-500/5 ring-1 ring-slate-100">
        <LoginForm 
          turnstileToken={turnstileToken} 
          onVerificationError={() => setTurnstileToken(null)}
        />
      </div>

      {/* Cloudflare Logic: Hide when verified */}
      <div className="mt-4 px-2">
        {!turnstileToken ? (
          <div className="animate-in fade-in duration-300">
            <Turnstile 
              onVerify={(token) => setTurnstileToken(token)} 
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>
        ) : (
          <div className="flex justify-center animate-in zoom-in duration-300 py-2">
            <div className="bg-teal-50 border border-teal-100 text-teal-600 px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm shadow-teal-500/5">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Identity Verified</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center space-y-4">
        <div className="text-xs text-slate-500 font-bold">
          {translations.noAccount}{' '}
          <Link
            href="/register"
            className="text-primary font-black hover:underline"
          >
            {translations.registerNow}
          </Link>
        </div>
        <Link 
          href="/help" 
          className="inline-block text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-0.5"
        >
          {translations.helpCenter}
        </Link>
      </div>
    </div>
  );
}
