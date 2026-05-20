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

export default function LoginPage() {
  const { translations } = useLanguage();

  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-3xl font-extrabold text-white tracking-tight">
          {translations.accountLogin}
        </CardTitle>
        <p className="text-white/60 text-sm mt-1">Welcome back to Flex Pay</p>
      </CardHeader>
      <CardContent className="px-8">
        <div className="bg-white/95 p-6 rounded-2xl shadow-inner">
          <LoginForm />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-center gap-4 pb-8">
        <Button asChild className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/10" variant="ghost">
          <Link href="/help">{translations.helpCenter}</Link>
        </Button>
        <div className="text-sm text-white/80 text-center">
          {translations.noAccount}{' '}
          <Button asChild variant="link" className="p-0 h-auto text-accent font-bold">
            <Link
              href="/register"
              className="underline-offset-4 hover:underline"
            >
              {translations.registerNow}
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}