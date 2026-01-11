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
import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { createUserWithEmailAndPassword, getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";


export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const { translations } = useLanguage();
  const firestore = useFirestore();
  const router = useRouter();
  const auth = getAuth();

  const registerSchema = z
    .object({
      phone: z
        .string()
        .length(10, { message: translations.phoneRequired })
        .regex(/^[6-9]\d{9}$/, {
          message: translations.phoneInvalid,
        }),
      otp: z.string().optional(), // OTP is handled separately now
      password: z
        .string()
        .min(6, { message: translations.passwordMin }),
      confirmPassword: z.string(),
      invitationCode: z.string().optional(),
      agreement: z.boolean().refine((val) => val === true, {
        message: translations.agreementRequired,
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
      invitationCode: "",
      agreement: false,
    },
  });

  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      // Firebase phone auth is complex to set up securely without backend.
      // We will use email/password auth, creating a "fake" email from the phone number.
      // This is a common pattern for phone-first login flows.
      const email = `${values.phone}@lgpay.app`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
      const user = userCredential.user;

      if (user && firestore) {
        // Create a user profile document in Firestore
        const userRef = doc(firestore, "users", user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          phoneNumber: values.phone,
          balance: 0.00, // Initial balance
          createdAt: serverTimestamp(),
          displayName: `User${values.phone.slice(-4)}`
        });
      }

      toast({
        title: translations.registrationSuccessTitle,
        description: translations.registrationSuccessMessage,
      });
      router.push("/home");

    } catch (error: any) {
      console.error("Registration failed:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
          description = "An account with this phone number already exists.";
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
  
  function handleSendOtp() {
    // This is a mock function. Real OTP would require a backend and Firebase Functions.
    const phone = form.getValues("phone");
    const phoneResult = z.string().length(10).regex(/^[6-9]\d{9}$/).safeParse(phone);

    if (!phoneResult.success) {
      form.setError("phone", { type: "manual", message: translations.phoneInvalid });
      return;
    }

    setIsOtpLoading(true);
    setTimeout(() => {
        setIsOtpLoading(false);
        toast({
            title: translations.otpSent,
            description: `A mock OTP has been sent to +91${phone}. Enter any 6 digits.`,
        });
        // In a real app, you'd initialize Recaptcha and call signInWithPhoneNumber here
    }, 1500);
  }

  return (
    <Form {...form}>
       <div id="recaptcha-container"></div>
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
                    className="pl-[88px] text-sm"
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
                  <Input placeholder={translations.enterVerificationCode} {...field} className="pr-24 text-sm" />
                </FormControl>
                <Button 
                  type="button" 
                  variant="secondary" 
                  className={cn("absolute right-1.5 h-auto rounded-md bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30", isOtpLoading && "px-2")}
                  onClick={handleSendOtp}
                  disabled={isOtpLoading}
                >
                  {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : translations.send}
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
                    className="pr-10 text-sm"
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
                    className="pr-10 text-sm"
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
              <FormLabel>{translations.invitationCodeOptional}</FormLabel>
               <div className="relative">
                <FormControl>
                  <Input placeholder={translations.enterInvitationCode} {...field} className="text-sm"/>
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
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? translations.registering : translations.register}
        </Button>
      </form>
    </Form>
  );
}
