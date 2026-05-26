
"use client";

import { RegisterForm } from '@/components/auth/register-form';
import { Turnstile } from '@/components/auth/turnstile';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const { translations } = useLanguage();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-sm py-4">
      <div className="text-center py-2 mb-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          {translations.register}
        </h1>
        <p className="text-slate-400 text-[10px] mt-1 font-medium italic uppercase tracking-widest">Join Flex Pay Network</p>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm ring-1 ring-slate-100">
        <RegisterForm 
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

      <div className="mt-6 text-center">
        <div className="text-xs text-slate-500 font-medium">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary font-black hover:underline"
          >
            {translations.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
