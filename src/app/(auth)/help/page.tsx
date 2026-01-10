"use client";

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LifeBuoy, UserPlus } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export default function HelpPage() {
  const { translations } = useLanguage();

  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{translations.helpTitle}</CardTitle>
        <CardDescription>
          {translations.helpDesc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <LifeBuoy className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="space-y-1">
            <h3 className="font-semibold">{translations.howResetPassword}</h3>
            <p className="text-sm text-muted-foreground">
              {translations.howResetPasswordDesc.replace('{forgotPasswordLink}', '')}
              <Link
                href="/forgot-password"
                className="font-semibold text-accent hover:underline"
              >
                {translations.forgotPassword}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <UserPlus className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="space-y-1">
            <h3 className="font-semibold">{translations.howCreateAccount}</h3>
            <p className="text-sm text-muted-foreground">
              {translations.howCreateAccountDesc.replace('{signUpLink}', '')}
              <Link
                href="/register"
                className="font-semibold text-accent hover:underline"
              >
                {translations.registerNow.replace(' »', '')}
              </Link>
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col">
        <Button asChild className="w-full font-semibold btn-gradient rounded-full">
          <Link href="/login">{translations.backToSignInBtn}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
