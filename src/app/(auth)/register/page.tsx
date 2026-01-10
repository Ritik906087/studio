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

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl font-bold">
          Register
        </CardTitle>
        <Image
          src="https://cdn-icons-png.flaticon.com/512/1077/1077035.png"
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
            ← Back to Login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
