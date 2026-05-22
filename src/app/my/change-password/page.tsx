
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ChevronLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/firebase';
import { updatePassword } from 'firebase/auth';
import { Loader } from '@/components/ui/loader';

export default function ChangePasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { translations } = useLanguage();
  const auth = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formSchema = z.object({
    newPassword: z.string().min(6, { message: translations.passwordMin }),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: translations.passwordsDontMatch,
    path: ["confirmPassword"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth?.currentUser) {
        toast({ variant: 'destructive', title: 'Session Error', description: 'User not authenticated.' });
        return;
    }
    setIsLoading(true);
    
    try {
      await updatePassword(auth.currentUser, values.newPassword);
      toast({
        title: translations.passwordUpdateSuccessTitle,
        description: translations.passwordUpdateSuccessMessage,
      });
      router.push('/my');
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        variant: "destructive",
        title: translations.passwordUpdateFailedTitle,
        description: error.code === 'auth/requires-recent-login' ? "For security, please logout and login again to update password." : error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{translations.paymentPassword}</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <Card className="bg-white border-none shadow-sm rounded-2xl">
            <CardHeader>
                <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Access Security</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Password</FormLabel>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <FormControl>
                                            <Input 
                                                type={showNewPassword ? "text" : "password"} 
                                                placeholder={translations.enterNewPassword} 
                                                className="pl-10 h-12 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/20 rounded-xl" 
                                                {...field} 
                                            />
                                        </FormControl>
                                         <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 h-auto -translate-y-1/2 p-1 text-slate-400 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirm Password</FormLabel>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <FormControl>
                                            <Input 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                placeholder={translations.enterConfirmPassword} 
                                                className="pl-10 h-12 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/20 rounded-xl" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 h-auto -translate-y-1/2 p-1 text-slate-400 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full h-14 btn-gradient rounded-2xl font-black shadow-teal-500/20" disabled={isLoading}>
                            {isLoading ? <Loader size="xs" /> : translations.updatePassword}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
