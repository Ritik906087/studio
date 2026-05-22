
"use client";

import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { Smartphone } from 'lucide-react';

export default function LoginPage() {
  const { translations } = useLanguage();

  return (
    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 py-4 flex flex-col justify-center min-h-[80vh]">
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
        <LoginForm />
      </div>

      <div className="mt-8 text-center space-y-4">
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
