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
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {translations.accountLogin}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="flex-col items-center gap-4">
        <Button asChild className="w-full help" variant="secondary">
          <Link href="/help">{translations.helpCenter}</Link>
        </Button>
        <div className="text-sm text-center">
          {translations.noAccount}{' '}
          <Link
            href="/register"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {translations.registerNow}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
