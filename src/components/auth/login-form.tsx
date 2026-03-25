
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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Link from 'next/link';
import Image from "next/image";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { translations } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();

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
    setIsLoading(true);
    const fullPhoneNumber = `+91${values.phone}`;
    const derivedEmail = `${fullPhoneNumber}@lgpay.app`;

    try {
      // First, try to sign in with the derived email. This works for new users.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: derivedEmail,
        password: values.password,
      });

      if (error) {
        // If email sign-in fails, it might be an old user with a phone-only identity.
        // Try to sign in with the phone number.
        const { data: phoneData, error: phoneError } = await supabase.auth.signInWithPassword({
          phone: fullPhoneNumber,
          password: values.password,
        });

        if (phoneError) {
          // If both methods fail, it's likely invalid credentials.
          throw phoneError;
        }

        // If phone sign-in succeeds, update the user's auth email for future logins.
        if (phoneData.user) {
          await supabase.auth.updateUser({ email: derivedEmail });
        }
        
        if (!phoneData.session) throw new Error("Login failed, please try again.");
        await postLoginSuccess(phoneData.session, phoneData.user.id);
        
      } else {
         if (!data.session) throw new Error("Login failed, please try again.");
         await postLoginSuccess(data.session, data.user.id);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      let description = "Invalid credentials. Please try again.";
      if (error.message.includes('Invalid login credentials')) {
        description = "Incorrect phone number or password. Please check and try again, or register if you don't have an account.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: description,
      });
      form.resetField("password");
    } finally {
      setIsLoading(false);
    }
  }

  async function postLoginSuccess(session: any, userId: string) {
      const { error: updateError } = await supabase
          .from('users')
          .update({ session_id: session.access_token })
          .eq('uid', userId);

      if (updateError) {
          console.error("Failed to update session ID:", updateError);
          // Don't block login, just log the error.
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });

      router.push("/home");
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{translations.phoneNumber}</FormLabel>
              <div className="relative flex items-center">
                 <div className="absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-sm text-muted-foreground">
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg"
                    width={20}
                    height={14}
                    alt="India Flag"
                  />
                  <span>+91</span>
                </div>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder={translations.enterPhoneNumber}
                    className="pl-[88px] text-base"
                    maxLength={10}
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{translations.password}</FormLabel>
                <Link href="/forgot-password" className="text-sm font-semibold text-accent hover:underline">
                  {translations.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={translations.enterPassword}
                    className="pl-4 pr-10 text-base"
                    {...field}
                  />
                </FormControl>
                 <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 h-auto -translate-y-1/2 p-1 text-accent/80 hover:bg-transparent hover:text-accent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button
          type="submit"
          className="w-full font-semibold btn-gradient rounded-full"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? translations.loggingIn : translations.login}
        </Button>
      </form>
    </Form>
  );
}
