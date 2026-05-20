"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';
import { UserCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { translations } = useLanguage();

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="w-full border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl rounded-[2rem] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary"></div>
        <CardHeader className="text-center pt-10 pb-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/20 text-primary border border-primary/30 shadow-inner">
             <UserCircle2 className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tight">
            {translations.accountLogin}
          </CardTitle>
          <p className="text-sky-200/60 text-sm mt-2 font-medium">Elevating your digital payments</p>
        </CardHeader>
        <CardContent className="px-6">
          <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl">
            <LoginForm />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-center gap-6 pb-10 pt-4">
          <div className="text-sm text-white/70 font-medium">
            {translations.noAccount}{' '}
            <Link
              href="/register"
              className="text-accent font-bold hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              {translations.registerNow}
            </Link>
          </div>
          <Button asChild className="w-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10 rounded-xl transition-all" variant="ghost">
            <Link href="/help">{translations.helpCenter}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}