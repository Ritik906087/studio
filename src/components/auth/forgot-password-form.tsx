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
import { KeyRound, Smartphone, Eye, EyeOff, CheckCircle2, Zap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { Loader } from "@/components/ui/loader";
import { useRouter } from "next/navigation";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Turnstile } from "./turnstile";
import { sendOtpAction } from "@/app/actions/otp";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [sentOtp, setSentOtp] = useState<string | null>(null);

  const { toast } = useToast();
  const { translations } = useLanguage();
  const router = useRouter();
  const firestore = useFirestore();

  const formSchema = z.object({
    phone: z.string().length(10, { message: translations.phoneRequired }).regex(/^[6-9]\d{9}$/, { message: translations.phoneInvalid }),
    otp: z.string().length(6, { message: "OTP must be 6 digits" }),
    newPassword: z.string().min(6, { message: translations.passwordMin }),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: translations.passwordsDontMatch,
    path: ["confirmPassword"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleGetOtp = async () => {
    const phone = form.getValues("phone");
    if (!phone || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      form.setError("phone", { message: translations.phoneInvalid });
      return;
    }

    if (!firestore) return;
    setIsOtpSending(true);

    try {
      const userQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', phone), limit(1));
      const userSnap = await getDocs(userQuery);

      if (userSnap.empty) {
        throw new Error("Mobile number not registered.");
      }

      const res = await sendOtpAction(phone);
      if (res.success && res.otp) {
        setSentOtp(res.otp);
        setCountdown(60);
        toast({ title: "OTP Sent", description: "Verification code sent to your mobile." });
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Request Failed", description: e.message });
    } finally {
      setIsOtpSending(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!turnstileToken) {
        toast({ variant: "destructive", title: "Security Check", description: "Please complete human verification." });
        return;
    }

    if (values.otp !== sentOtp) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "The code you entered is incorrect." });
      return;
    }

    setIsLoading(true);

    try {
      const verifyRes = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error("Security verification failed. Try again.");

      toast({
        title: "Request Received",
        description: "Your identity is verified. Admin is auditing your reset request.",
        className: "bg-blue-600 text-white border-none font-bold"
      });

      setTimeout(() => {
        toast({ title: "Updated Successfully", description: "Please login with your new password." });
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({ 
        variant: "destructive", 
        title: "Update Failed", 
        description: error.message 
      });
      setTurnstileToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Registered Mobile</Label>
            <div className="relative flex items-center group">
              <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs text-slate-400 group-focus-within:text-primary transition-colors pr-2.5 border-r">
                <Smartphone className="h-4 w-4" />
                <span className="font-bold">+91</span>
              </div>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="10-DIGIT NUMBER" 
                  className="pl-20 pr-24 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-sm font-black" 
                  maxLength={10} 
                  {...form.register("phone")} 
                />
              </FormControl>
              <Button 
                type="button" 
                onClick={handleGetOtp} 
                disabled={isOtpSending || countdown > 0} 
                className="absolute right-1.5 h-8 px-3 rounded-xl bg-primary text-[9px] font-black uppercase tracking-widest shadow-none"
              >
                {isOtpSending ? <Loader2 className="h-3 w-3 animate-spin" /> : (countdown > 0 ? `${countdown}s` : "Get OTP")}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Verification Code</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <Zap className="h-4 w-4" />
              </div>
              <FormControl>
                <Input 
                  placeholder="ENTER 6-DIGIT OTP" 
                  className="pl-11 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-xs font-bold" 
                  maxLength={6}
                  {...form.register("otp")} 
                />
              </FormControl>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">New Password</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <KeyRound className="h-4 w-4" />
              </div>
              <FormControl>
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="CREATE NEW PASSWORD" 
                  className="px-11 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-xs font-bold" 
                  {...form.register("newPassword")} 
                />
              </FormControl>
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Confirm New Password</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="REPEAT NEW PASSWORD" 
                  className="pl-11 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-xs font-bold" 
                  {...form.register("confirmPassword")} 
                />
              </FormControl>
            </div>
            <FormMessage className="text-[10px] pl-2" />
          </div>

          <Turnstile 
            onVerify={(token) => setTurnstileToken(token)} 
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />

          <Button type="submit" className="w-full h-14 btn-gradient rounded-2xl font-black text-sm uppercase tracking-widest shadow-teal-500/20" disabled={isLoading || !turnstileToken || !sentOtp}>
            {isLoading ? "UPDATING..." : "RESET PASSWORD"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
