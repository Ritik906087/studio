"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Smartphone, LockKeyhole, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Link from 'next/link';
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Turnstile } from "./turnstile";

const ADMIN_PHONES = ['9955557336', '9060873927'];

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { translations } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();

  const formSchema = z.object({
    phone: z.string().length(10, { message: translations.phoneRequired }).regex(/^[6-9]\d{9}$/, { message: translations.phoneInvalid }),
    password: z.string().min(6, { message: translations.passwordMin }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!turnstileToken) {
      toast({ variant: "destructive", title: "Verification Required", description: "Please complete the human verification." });
      return;
    }
    if (ADMIN_PHONES.includes(values.phone)) {
      toast({ variant: "destructive", title: "Access Restricted", description: "Use admin gateway." });
      return;
    }
    if (!auth) return;
    setIsLoading(true);

    const email = `91${values.phone}@lgpay.app`;
    try {
      await signInWithEmailAndPassword(auth, email, values.password);
      toast({ title: "Welcome Back!" });
      router.push('/home');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: "Wrong credentials." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 group-focus-within:text-primary transition-colors border-r pr-2.5">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-bold text-xs">+91</span>
                </div>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder={translations.phoneNumber} 
                    className="pl-[74px] h-12 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px]" 
                    maxLength={10} 
                    {...field} 
                  />
                </FormControl>
              </div>
              <FormMessage className="text-[10px] pl-2" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <FormControl>
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={translations.password} 
                    className="px-11 h-12 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px]" 
                    {...field} 
                  />
                </FormControl>
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 active:text-primary" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-0.5">
                <Link href="/forgot-password" weights="bold" className="text-[10px] font-black text-teal-600 uppercase tracking-wider hover:opacity-70">
                  {translations.forgotPassword}
                </Link>
              </div>
              <FormMessage className="text-[10px] pl-2" />
            </FormItem>
          )}
        />

        <Turnstile 
          onVerify={(token) => setTurnstileToken(token)} 
          onExpire={() => setTurnstileToken(null)}
          onError={() => setTurnstileToken(null)}
        />
        
        <Button type="submit" className="w-full btn-gradient rounded-2xl h-12 text-[13px] font-black mt-1 shadow-teal-500/20" disabled={isLoading || !turnstileToken}>
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : translations.login}
        </Button>
      </form>
    </Form>
  );
}
