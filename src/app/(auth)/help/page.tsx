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

export default function HelpPage() {
  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Help Center</CardTitle>
        <CardDescription>
          Find answers to common questions about LG Pay.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <LifeBuoy className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="space-y-1">
            <h3 className="font-semibold">How do I reset my password?</h3>
            <p className="text-sm text-muted-foreground">
              You can reset your password by navigating to the{' '}
              <Link
                href="/forgot-password"
                className="font-semibold text-accent hover:underline"
              >
                Forgot Password
              </Link>{' '}
              page and following the instructions.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <UserPlus className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="space-y-1">
            <h3 className="font-semibold">How do I create an account?</h3>
            <p className="text-sm text-muted-foreground">
              To create an account, go to the{' '}
              <Link
                href="/register"
                className="font-semibold text-accent hover:underline"
              >
                Sign Up
              </Link>{' '}
              page and enter your phone number. You will receive an OTP to
              verify your number and set up your account.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col">
        <Button asChild className="w-full font-semibold btn-gradient rounded-full">
          <Link href="/login">Back to Sign In</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
