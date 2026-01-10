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
import { Gift, Award, Crown } from 'lucide-react';

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
        <div className="w-full space-y-2 text-left text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <span className="font-semibold text-foreground">New User Reward:</span> Exclusive gift pack for new users, complete simple steps to receive instantly
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
             <div>
              <span className="font-semibold text-foreground">Trading Reward:</span> The more you trade, the higher the commission, enjoy long-term benefits
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
               <span className="font-semibold text-foreground">Member Exclusive:</span> Level tasks open for a limited time, extra rewards available
            </div>
          </div>
        </div>
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
