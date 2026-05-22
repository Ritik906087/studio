
"use client";

import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { UserPlus2 } from 'lucide-react';

export default function RegisterPage() {
  const { translations } = useLanguage();
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="text-center py-2 mb-2">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-primary border border-teal-100 shadow-sm">
           <UserPlus2 className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          {translations.register}
        </h1>
        <p className="text-slate-400 text-[10px] mt-1 font-medium italic uppercase tracking-widest">Join Flex Pay Network</p>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-sm ring-1 ring-slate-100">
        <RegisterForm />
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
