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

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-gradient">
          Account Login
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="flex-col items-center gap-4">
        <Button asChild className="w-full help" variant="secondary">
          <Link href="/help">Help Center</Link>
        </Button>
        <div className="text-sm text-center">
          No Account?{' '}
          <Link
            href="/register"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            Register Now »
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
