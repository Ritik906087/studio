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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, Smartphone, LockKeyhole } from "lucide-react";
import { useState } from "react";
import Link from 'next/link';
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import Image from "next/image";

const ADMIN_PHONE = '9060873927';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { translations } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();

  const formSchema = z.object({
    phone: z
      .string()
      .length(10, { message: translations.phoneRequired })
      .regex(/^[6-9]\d{9}$/, {
        message: translations.phoneInvalid,
      }),
    password: z
      .string()
      .min(1, { message: translations.passwordRequired })
      .min(6, { message: translations.passwordMin }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.phone === ADMIN_PHONE) {
      toast({ 
        variant: "destructive", 
        title: "Access Restricted", 
        description: "Please use the admin gateway for this account." 
      });
      return;
    }

    if (!auth) {
        toast({ variant: "destructive", title: "Error", description: "Authentication not available." });
        return;
    }
    setIsLoading(true);

    const emailFormats = [
      `91${values.phone}@lgpay.app`,
      `${values.phone}@lgpay.app`
    ];

    let success = false;

    for (const email of emailFormats) {
      if (success) break;
      try {
        await signInWithEmailAndPassword(auth, email, values.password);
        success = true;
      } catch (error: any) {
        if (email === emailFormats[emailFormats.length - 1]) {
          console.error("Final login attempt failed:", error);
          let msg = "Incorrect phone number or password.";
          toast({ variant: "destructive", title: "Login Failed", description: msg });
          form.resetField("password");
        }
      }
    }

    if (success) {
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/home');
    }
    
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-600 font-bold text-xs uppercase tracking-wider">{translations.phoneNumber}</FormLabel>
              <div className="relative flex items-center group">
                 <div className="absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-sm text-slate-400 group-focus-within:text-primary transition-colors border-r pr-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-bold">+91</span>
                </div>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder={translations.enterPhoneNumber} 
                    className="pl-[84px] h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl" 
                    maxLength={10} 
                    {...field} 
                  />
                </FormControl>
              </div>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-slate-600 font-bold text-xs uppercase tracking-wider">{translations.password}</FormLabel>
                <Link href="/forgot-password" className="text-xs font-bold text-accent hover:text-primary transition-colors">
                  {translations.forgotPassword}
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <FormControl>
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={translations.enterPassword} 
                    className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl" 
                    {...field} 
                  />
                </FormControl>
                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full font-black text-base btn-gradient rounded-xl h-14 mt-4" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          {isLoading ? translations.loggingIn : translations.login}
        </Button>
      </form>
    </Form>
  );
}