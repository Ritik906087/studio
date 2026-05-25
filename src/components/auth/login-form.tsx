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
import { Smartphone, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Link from 'next/link';
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Turnstile } from "./turnstile";
import { Loader } from "@/components/ui/loader";

const ADMIN_PHONES = ['9955557336', '9060873927'];

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  
  const { translations } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const formSchema = z.object({
    phone: z.string().length(10, { message: translations.phoneRequired }).regex(/^[6-9]\d{9}$/, { message: translations.phoneInvalid }),
    password: z.string().min(6, { message: translations.passwordMin }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (ADMIN_PHONES.includes(values.phone)) {
      toast({ variant: "destructive", title: "Access Restricted", description: "Use admin gateway." });
      return;
    }
    
    if (!turnstileToken) {
      toast({ variant: "destructive", title: "Verification Required", description: "Please complete the captcha." });
      return;
    }

    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      // 1. Backend Verification of Turnstile Token
      const verifyRes = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.error || "Captcha verification failed");
      }

      // 2. Firebase Sign In
      const email = `91${values.phone}@lgpay.app`;
      const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
      const user = userCredential.user;

      // 3. Session Enforcement
      const newSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await updateDoc(doc(firestore, 'users', user.uid), {
        sessionId: newSessionId
      });
      localStorage.setItem(`session_${user.uid}`, newSessionId);
      
      router.push('/home');
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ 
        variant: "destructive", 
        title: "Access Denied", 
        description: error.message === "Captcha verification failed" ? error.message : "Invalid login details" 
      });
      setIsLoading(false);
      // Reset turnstile on failure to force new verification
      setTurnstileToken(null);
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
          onError={() => {
            setTurnstileToken(null);
            toast({ variant: "destructive", title: "Security Error", description: "Captcha failed to load. Refresh page." });
          }}
        />
        
        <Button 
          type="submit" 
          className="w-full btn-gradient rounded-2xl h-12 text-[13px] font-black mt-1 shadow-teal-500/20 uppercase tracking-widest" 
          disabled={isLoading || !turnstileToken}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader size="xs" className="h-4 w-4" />
              <span>{translations.loggingIn}</span>
            </div>
          ) : translations.login}
        </Button>
      </form>
    </Form>
  );
}
