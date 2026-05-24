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
import { Label } from "@/components/ui/label";
import { KeyRound, Smartphone, Eye, EyeOff, Hash, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { Loader } from "@/components/ui/loader";
import { useRouter } from "next/navigation";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult, updatePassword } from "firebase/auth";

type Step = "phone" | "reset";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [countdown, setCountdown] = useState(0);

  const { toast } = useToast();
  const { translations } = useLanguage();
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const phoneSchema = z.object({
    phone: z.string().length(10, { message: translations.phoneRequired }).regex(/^[6-9]\d{9}$/, { message: translations.phoneInvalid }),
  });

  const resetSchema = z.object({
    otp: z.string().length(6, { message: translations.otpRequired }),
    newPassword: z.string().min(6, { message: translations.passwordMin }),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: translations.passwordsDontMatch,
    path: ["confirmPassword"],
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
  });

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
    return (window as any).recaptchaVerifier;
  }

  async function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
    setIsLoading(true);
    try {
      const verifier = setupRecaptcha();
      const fullPhoneNumber = `+91${values.phone}`;
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
      
      setConfirmationResult(result);
      setPhone(values.phone);
      setStep("reset");
      setCountdown(59);
      
      toast({
        title: translations.otpSent,
        description: `OTP sent to ${fullPhoneNumber}`,
      });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetSubmit(values: z.infer<typeof resetSchema>) {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      // 1. Confirm OTP
      const userCredential = await confirmationResult.confirm(values.otp);
      const user = userCredential.user;

      if (user) {
        // 2. Update Password
        await updatePassword(user, values.newPassword);
        toast({
          title: "Password Updated",
          description: "Your login password has been changed successfully.",
        });
        router.push('/login');
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || "Invalid OTP" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-[350px]">
      <div id="recaptcha-container"></div>
      
      {step === "phone" ? (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
           <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Mobile Identity</Label>
                <div className="relative flex items-center group">
                  <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs text-slate-400 group-focus-within:text-primary transition-colors pr-2.5 border-r">
                    <Smartphone className="h-4 w-4" />
                    <span className="font-bold">+91</span>
                  </div>
                  <FormControl>
                    <Input 
                        type="tel" 
                        placeholder="ENTER REGISTERED NUMBER" 
                        className="pl-20 h-14 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-2xl text-base font-black tracking-tight" 
                        maxLength={10} 
                        {...phoneForm.register("phone")} 
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] pl-2 text-red-500" />
              </div>
              <Button type="submit" className="w-full h-14 btn-gradient rounded-2xl font-black text-sm uppercase tracking-widest shadow-teal-500/20" disabled={isLoading}>
                {isLoading ? <Loader size="xs" className="mr-2" /> : "SEND OTP CODE"}
              </Button>
            </form>
          </Form>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
           <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Verification Code</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Hash className="h-4 w-4" /></div>
                  <FormControl>
                    <Input 
                        placeholder="6-DIGIT OTP" 
                        className="pl-11 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-base font-black tracking-[0.5em]" 
                        maxLength={6}
                        {...resetForm.register("otp")} 
                    />
                  </FormControl>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">New Access Key</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><KeyRound className="h-4 w-4" /></div>
                  <FormControl>
                    <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="NEW PASSWORD" 
                        className="px-11 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-sm font-black" 
                        {...resetForm.register("newPassword")} 
                    />
                  </FormControl>
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Repeat Access Key</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><CheckCircle2 className="h-4 w-4" /></div>
                  <FormControl>
                    <Input 
                        type="password" 
                        placeholder="CONFIRM PASSWORD" 
                        className="pl-11 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-sm font-black" 
                        {...resetForm.register("confirmPassword")} 
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-[10px] pl-2 text-red-500" />
              </div>

              <Button type="submit" className="w-full h-14 btn-gradient rounded-2xl font-black text-sm uppercase tracking-widest shadow-teal-500/20" disabled={isLoading}>
                {isLoading ? <Loader size="xs" className="mr-2" /> : "RESET PASSWORD"}
              </Button>
              
              <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Didn't receive? {countdown > 0 ? `Resend in ${countdown}s` : <span className="text-primary underline cursor-pointer" onClick={() => setStep("phone")}>Resend Code</span>}
              </p>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
