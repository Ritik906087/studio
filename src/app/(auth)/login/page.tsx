"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { UserCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { translations } = useLanguage();

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="text-center py-4">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-primary border border-teal-100 shadow-sm">
           <UserCircle2 className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          {translations.accountLogin}
        </h1>
        <p className="text-slate-400 text-xs mt-1 font-medium italic">Your gateway to digital finance</p>
      </div>

      <div className="mt-2">
        <LoginForm />
      </div>

      <div className="mt-8 text-center space-y-4">
        <div className="text-sm text-slate-500 font-medium">
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
          className="inline-block text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-0.5"
        >
          {translations.helpCenter}
        </Link>
      </div>
    </div>
  );
}