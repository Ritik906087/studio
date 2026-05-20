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
import Image from 'next/image';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const { translations } = useLanguage();
  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
      <CardHeader className="items-center text-center pt-8">
        <CardTitle className="text-3xl font-extrabold text-white tracking-tight">
          {translations.register}
        </CardTitle>
        <div className="mt-4 p-1 bg-white rounded-full shadow-lg">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec"
            width={64}
            height={64}
            alt="Flex Pay Logo"
            className="rounded-full"
          />
        </div>
      </CardHeader>
      <CardContent className="px-8">
        <div className="bg-white/95 p-6 rounded-2xl shadow-inner">
          <RegisterForm />
        </div>
      </CardContent>
      <CardFooter className="justify-center pb-8 pt-2">
        <div className="text-sm text-white/80 text-center">
          <Button asChild variant="link" className="p-0 h-auto text-accent font-bold">
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
  );
}