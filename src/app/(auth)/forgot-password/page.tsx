"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';

export default function ForgotPasswordPage() {
  const { translations } = useLanguage();
  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{translations.forgotPasswordTitle}</CardTitle>
        <CardDescription>
          {translations.forgotPasswordDesc}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button asChild className="help" variant="secondary">
          <Link href="/help">{translations.helpCenter}</Link>
        </Button>
        <div className="text-sm">
          <Link
            href="/login"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {translations.backToSignIn}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
