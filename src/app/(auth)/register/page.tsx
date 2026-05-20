"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { UserPlus2 } from 'lucide-react';

export default function RegisterPage() {
  const { translations } = useLanguage();
  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="w-full border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl rounded-[2rem] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary"></div>
        <CardHeader className="text-center pt-10 pb-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/20 text-white border border-accent/30 shadow-inner">
             <UserPlus2 className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tight">
            {translations.register}
          </CardTitle>
          <p className="text-sky-200/60 text-sm mt-2 font-medium">Start your journey with Flex Pay</p>
        </CardHeader>
        <CardContent className="px-6">
          <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl">
            <RegisterForm />
          </div>
        </CardContent>
        <CardFooter className="justify-center pb-10 pt-4">
          <div className="text-sm text-white/70 font-medium text-center">
            Already have an account?{' '}
            <Button asChild variant="link" className="p-0 h-auto text-accent font-bold hover:text-white">
              <Link
                href="/login"
                className="underline-offset-4 hover:underline"
              >
                {translations.backToLogin}
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}