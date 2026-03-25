

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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";


const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();
  const { translations } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const invitationCodeFromUrl = searchParams.get("ref") || "";

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  

  const registerSchema = z
    .object({
      phone: z
        .string()
        .length(10, { message: translations.phoneRequired })
        .regex(/^[6-9]\d{9}$/, {
          message: translations.phoneInvalid,
        }),
      otp: z.string().length(6, { message: translations.otpRequired }),
      password: z
        .string()
        .min(6, { message: translations.passwordMin }),
      confirmPassword: z.string(),
      invitationCode: z.string().min(1, { message: translations.invitationCodeRequired }),
      agreement: z.literal(true, {
        errorMap: () => ({ message: translations.agreementRequired }),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: translations.passwordsDontMatch,
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: "",
      otp: "",
      password: "",
      confirmPassword: "",
      invitationCode: invitationCodeFromUrl,
      agreement: false,
    },
  });

  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);

    try {
      const fullPhoneNumber = `+91${values.phone}`;

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhoneNumber,
        token: values.otp,
        type: 'sms',
      });

      if (verifyError) throw verifyError;
      if (!verifyData.session) throw new Error("OTP verification failed. No session created.");

      const { error: signUpError } = await supabase.auth.updateUser({
        password: values.password
      })

      if (signUpError) throw signUpError;
      
      const { data: inviterData, error: inviterError } = await supabase
        .from('users')
        .select('uid')
        .eq('numericId', values.invitationCode)
        .single();
      
      if (inviterError && inviterError.code !== 'PGRST116') { // PGRST116: no rows found
        throw new Error("Invalid invitation code.");
      }
      
      const user = verifyData.user;
      if (user) {
        const numericId = Math.floor(10000000 + Math.random() * 90000000).toString();
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            uid: user.id,
            numericId: numericId,
            phoneNumber: values.phone,
            displayName: `User${values.phone.slice(-4)}`,
            photoURL: defaultAvatarUrl,
            inviterUid: inviterData?.uid || null
          });

        if (profileError) throw profileError;
      }
      
      toast({
        title: translations.registrationSuccessTitle,
        description: translations.registrationSuccessMessage,
      });

      // Log out the user after successful registration data save to force a new login
      await supabase.auth.signOut();
      
      router.push("/login");

    } catch (error: any) {
      console.error("Registration failed:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.message.includes('already registered')) {
          description = "An account with this phone number already exists. Please log in instead.";
      } else if (error.message.includes('Invalid OTP')) {
          description = "The OTP you entered is incorrect. Please try again.";
      }
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleSendOtp() {
    const phone = form.getValues("phone");
    const phoneResult = z.string().length(10).regex(/^[6-9]\d{9}$/).safeParse(phone);

    if (!phoneResult.success) {
      form.setError("phone", { type: "manual", message: translations.phoneInvalid });
      return;
    }

    setIsOtpLoading(true);
    try {
        const fullPhoneNumber = `+91${phone}`;

        const { error } = await supabase.auth.signInWithOtp({
            phone: fullPhoneNumber,
        });

        if (error) throw error;
        
        setCountdown(59);
        toast({
            title: translations.otpSent,
            description: `${translations.otpSentTo.replace('{phone}', fullPhoneNumber)}`,
        });
    } catch (error: any) {
        console.error("OTP send error:", error);
        toast({
            variant: "destructive",
            title: "Failed to send OTP",
            description: error.message || "Please try again. Make sure you have a stable network connection.",
        });
    } finally {
        setIsOtpLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onRegisterSubmit)}
        className="space-y-4"
      >
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
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{translations.verificationCode}</FormLabel>
              <div className="relative flex items-center">
                <FormControl>
                  <Input placeholder={translations.enterVerificationCode} {...field} className="pr-28 text-base" />
                </FormControl>
                <Button 
                  type="button" 
                  variant="secondary" 
                  className={cn("absolute right-1.5 h-auto rounded-md bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30", (isOtpLoading || countdown > 0) && "px-2")}
                  onClick={handleSendOtp}
                  disabled={isOtpLoading || countdown > 0}
                >
                  {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (countdown > 0 ? `${countdown}s` : "Send")}
                </Button>
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
              <FormLabel>{translations.password}</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={translations.enterPassword}
                    {...field}
                    className="pr-10 text-base"
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
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{translations.confirmPassword}</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={translations.enterConfirmPassword}
                    {...field}
                    className="pr-10 text-base"
                  />
                </FormControl>
                 <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 h-auto -translate-y-1/2 p-1 text-accent/80 hover:bg-transparent hover:text-accent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invitationCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{translations.invitationCode}</FormLabel>
               <div className="relative">
                <FormControl>
                  <Input 
                    placeholder={translations.enterInvitationCode} 
                    {...field} 
                    className="text-base"
                    disabled={!!invitationCodeFromUrl}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agreement"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none text-sm">
                <FormLabel className="font-normal text-muted-foreground">
                  {translations.iAgreeTo}{" "}
                  <Link
                    href="/terms"
                    className="font-semibold text-accent underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    {translations.userAgreement}
                  </Link>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full font-semibold btn-gradient rounded-full"
          disabled={isLoading || !form.formState.isValid}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? translations.registering : translations.register}
        </Button>
      </form>
    </Form>
  );
}
