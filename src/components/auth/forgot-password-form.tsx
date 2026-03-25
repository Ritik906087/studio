
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
import { KeyRound, Phone, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { Loader } from "@/components/ui/loader";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Step = "phone" | "reset";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { translations } = useLanguage();
  const router = useRouter();
  
  const phoneSchema = z.object({
    phone: z
      .string()
      .min(10, { message: translations.phoneRequired }),
  });

  const resetSchema = z
    .object({
      otp: z.string().length(6, { message: translations.otpRequired }),
      password: z
        .string()
        .min(6, { message: translations.passwordMin }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: translations.passwordsDontMatch,
      path: ["confirmPassword"],
    });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
    setIsLoading(true);
    try {
      const fullPhoneNumber = `+91${values.phone}`;
      // Supabase uses email to send reset links, but we can trigger OTP for phone verification
      // then update password after verification.
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) throw error;
      setPhone(values.phone);
      setStep("reset");
      toast({
        title: translations.otpSent,
        description: translations.otpSentReset.replace('{phone}', values.phone),
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetSubmit(values: z.infer<typeof resetSchema>) {
    setIsLoading(true);
    try {
      const fullPhoneNumber = `+91${phone}`;
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone: fullPhoneNumber, token: values.otp, type: 'sms' });
      if (verifyError) throw verifyError;
      if (!data.session) throw new Error("Invalid OTP or session expired.");
      
      const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
      if (updateError) throw updateError;
      
      toast({
        title: translations.passwordResetSuccess,
        description: translations.passwordResetMessage,
      });
      router.push('/login');

    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes("Token has expired or is invalid")) {
        errorMessage = "Invalid or expired OTP. Please try again.";
      }
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden h-[330px]">
      <div
        className={cn(
          "w-full transition-all duration-500 absolute top-0",
          step === "phone" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
        )}
      >
        <Form {...phoneForm}>
          <form
            onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
            className="space-y-6"
          >
            <FormField
              control={phoneForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.phoneNumber}</FormLabel>
                   <div className="relative flex items-center">
                     <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={translations.enterPhoneNumber}
                        className="pl-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full btn-gradient rounded-full font-semibold" disabled={isLoading}>
              {isLoading && <Loader size="xs" className="mr-2" />}
              {isLoading ? translations.sending : translations.sendResetCode}
            </Button>
          </form>
        </Form>
      </div>

      <div
        className={cn(
          "w-full transition-all duration-500 absolute top-0",
          step === "reset" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
        )}
      >
        <Form {...resetForm}>
          <form
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
            className="space-y-4"
          >
            <p className="text-center text-sm text-muted-foreground">
              {translations.enterOtpAndNewPassword.replace('{phone}', phone)}
            </p>
            <FormField
              control={resetForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.verificationCode}</FormLabel>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        placeholder={translations.enterVerificationCode}
                        className="pl-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={resetForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.newPassword}</FormLabel>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={translations.createNewPassword}
                        className="pl-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={resetForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.confirmPassword}</FormLabel>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={translations.confirmNewPassword}
                        className="pl-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full btn-gradient rounded-full font-semibold" disabled={isLoading}>
              {isLoading && <Loader size="xs" className="mr-2" />}
              {isLoading ? translations.resetting : translations.resetPassword}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
