
"use client";

import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useState } from 'react';

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

      {/* Inputs are inside card in RegisterForm, Button/Turnstile are outside */}
      <RegisterForm 
        turnstileToken={turnstileToken} 
        onVerify={(token) => setTurnstileToken(token)}
      />

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
