
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Loader } from '@/components/ui/loader';

export default function AdminLoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (
      (phone === '9060873927' && password === 'Ritik@9060') ||
      (phone === '7050396570' && password === 'Admin@7050') ||
      (phone === '9199604613' && password === 'ritik@123') ||
      (phone === '9955557336' && password === 'Satyam@9955') ||
      (phone === '7307081891' && password === 'Anand8090') ||
      (phone === '9798630209' && password === 'Aman@12')
    ) {
      toast({ title: 'Login Successful', description: "Welcome, Admin!" });
      // Set a cookie with the admin's phone number to maintain session and permissions
      document.cookie = `admin-phone=${phone}; path=/; max-age=86400`; // 24 hours
      window.location.href = '/admin/dashboard';
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid phone number or password.',
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <Logo className="mb-6 text-center text-3xl" />
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Panel</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="1234567890"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-input"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full btn-gradient font-semibold" disabled={isLoading}>
                {isLoading && <Loader size="xs" className="mr-2" />}
                Log In
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}

    