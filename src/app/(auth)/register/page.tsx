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

export default function RegisterPage() {
  const { translations } = useLanguage();
  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl font-bold">
          {translations.register}
        </CardTitle>
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6"
          width={64}
          height={64}
          alt="Gift"
          className="my-2"
        />
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="justify-center">
        <div className="text-sm text-center">
          <Link
            href="/login"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {translations.backToLogin}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
