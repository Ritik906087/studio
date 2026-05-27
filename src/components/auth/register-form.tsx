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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Smartphone, LockKeyhole, KeyRound, Zap, ShieldCheck, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, limit, serverTimestamp } from "firebase/firestore";
import { Loader } from "@/components/ui/loader";
import { Turnstile } from "./turnstile";
import { sendOtpAction } from "@/app/actions/otp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

interface RegisterFormProps {
  turnstileToken: string | null;
  onVerify: (token: string | null) => void;
}

export function RegisterForm({ turnstileToken, onVerify }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { translations } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();

  const invitationCodeFromUrl = searchParams.get("ref") || "";

  const registerSchema = z
    .object({
      phone: z.string().length(10, { message: translations.phoneRequired }).regex(/^[6-9]\d{9}$/, { message: translations.phoneInvalid }),
      otp: z.string().length(6, { message: "OTP must be 6 digits" }),
      password: z.string().min(6, { message: translations.passwordMin }),
      confirmPassword: z.string(),
      invitationCode: z.string().min(1, { message: translations.invitationCodeRequired }),
      agreement: z.literal(true, { errorMap: () => ({ message: translations.agreementRequired }) }),
    })
    .refine((data) => data.password === data.confirmPassword, { message: translations.passwordsDontMatch, path: ["confirmPassword"] });

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: "", otp: "", password: "", confirmPassword: "", invitationCode: invitationCodeFromUrl, agreement: false },
  });

  useEffect(() => {
    if (invitationCodeFromUrl) {
      form.setValue("invitationCode", invitationCodeFromUrl);
    }
  }, [invitationCodeFromUrl, form]);

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

    setIsOtpSending(true);
    try {
      const res = await sendOtpAction(phone);
      if (res.success && res.otp) {
        setSentOtp(res.otp);
        setCountdown(60);
        toast({ title: "OTP Sent", description: "Verification code sent to your mobile." });
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "OTP Error", description: e.message });
    } finally {
      setIsOtpSending(false);
    }
  };

  const generateHardwareFingerprint = () => {
    let gpuInfo = "Unknown";
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
            gpuInfo = debugInfo ? (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Generic";
        }
    } catch (e) {}

    const components = [
        navigator.hardwareConcurrency || 0,
        (navigator as any).deviceMemory || 0,
        gpuInfo,
        window.screen.width,
        window.screen.height,
        window.screen.colorDepth,
        navigator.platform,
        navigator.maxTouchPoints || 0,
        new Date().getTimezoneOffset(),
        navigator.language
    ];

    const raw = components.join('|');
    return btoa(raw).replace(/[/+=]/g, '').slice(0, 32).toUpperCase();
  };

  async function performRegistration(values: z.infer<typeof registerSchema>, token: string) {
    if (!auth || !firestore) return;

    // Verify OTP
    if (values.otp !== sentOtp) {
      toast({ variant: "destructive", title: "Verification Failed", description: "The OTP you entered is incorrect." });
      return;
    }

    setIsLoading(true);

    try {
        const verifyRes = await fetch('/api/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          onVerify(null);
          throw new Error("Security verification expired. Please try again.");
        }

        const fingerprint = generateHardwareFingerprint();
        const fingerprintQuery = query(collection(firestore, 'users'), where('hardwareFingerprint', '==', fingerprint), limit(1));
        const fingerprintSnap = await getDocs(fingerprintQuery);
        
        if (!fingerprintSnap.empty) {
          throw new Error("Account already exists on this device. Please login.");
        }

        const phoneCheckQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', values.phone), limit(1));
        const phoneCheckSnap = await getDocs(phoneCheckQuery);
        if (!phoneCheckSnap.empty) throw new Error("This phone number is already registered.");

        let inviterUid = null;
        const inviterQuery = query(collection(firestore, 'users'), where('numericId', '==', values.invitationCode), limit(1));
        const inviterSnap = await getDocs(inviterQuery);
        
        if (inviterSnap.empty) throw new Error("Invalid invitation code.");
        inviterUid = inviterSnap.docs[0].id;

        const email = `91${values.phone}@lgpay.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
        const user = userCredential.user;
        const numericId = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        const newSessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

        await setDoc(doc(firestore, 'users', user.uid), {
            uid: user.uid,
            email: email,
            numericId: numericId,
            phoneNumber: values.phone,
            displayName: `User${values.phone.slice(-4)}`,
            photoURL: defaultAvatarUrl,
            inviterUid: inviterUid,
            balance: 0,
            holdBalance: 0,
            paymentMethods: [],
            upiIds: [],
            claimedUserRewards: [],
            hardwareFingerprint: fingerprint,
            sessionId: newSessionId,
            createdAt: serverTimestamp(),
        });

        localStorage.setItem(`session_${user.uid}`, newSessionId);
        toast({ title: "Welcome!", description: "Registration successful." });
        router.push("/login");
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast({ variant: "destructive", title: "Registration Failed", description: error.message });
      setIsLoading(false);
    }
  }

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;

    if (!sentOtp) {
      toast({ variant: "destructive", title: "OTP Required", description: "Please get and verify OTP first." });
      return;
    }

    setIsVerificationOpen(true);
  };

  const handleTurnstileVerify = (token: string) => {
    onVerify(token);
    setTimeout(() => {
      setIsVerificationOpen(false);
      performRegistration(form.getValues(), token);
    }, 800);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={handlePreSubmit} className="flex flex-col gap-6">
          <div className="bg-white rounded-[32px] p-5 shadow-sm ring-1 ring-slate-100 space-y-3">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="relative flex items-center group">
                    <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs text-slate-400 group-focus-within:text-primary transition-colors pr-2.5 border-r">
                      <span className="font-bold">+91</span>
                    </div>
                    <FormControl>
                      <Input type="tel" placeholder="Mobile Number" className="pl-14 pr-24 h-11 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px]" maxLength={10} {...field} />
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
                  <FormMessage className="text-[10px] pl-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <FormControl>
                      <Input placeholder="Enter 6-digit OTP" className="pl-11 h-11 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px]" maxLength={6} {...field} />
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
                      <Input type={showPassword ? "text" : "password"} placeholder="Create Password" className="pl-11 h-11 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px]" {...field} />
                    </FormControl>
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormMessage className="text-[10px] pl-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} placeholder="Confirm Password" className="pl-11 h-11 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px]" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage className="text-[10px] pl-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invitationCode"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="Invitation Code" 
                        className="pl-11 h-11 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px] font-bold tracking-widest disabled:opacity-70 disabled:cursor-not-allowed" 
                        {...field} 
                        disabled={!!invitationCodeFromUrl}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-[10px] pl-2" />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2 py-1">
              <Checkbox id="agreement" onCheckedChange={(checked) => form.setValue("agreement", checked === true)} checked={form.watch("agreement")} />
              <label htmlFor="agreement" className="text-[10px] text-slate-500 font-medium leading-none cursor-pointer">
                I agree to the <Link href="/privacy" className="text-primary font-bold hover:underline">Privacy Policy</Link>
              </label>
            </div>
          </div>

          <div className="px-2">
            <Button 
              type="submit" 
              className="w-full btn-gradient rounded-[22px] h-14 text-sm font-black shadow-teal-500/20 uppercase tracking-widest" 
              disabled={isLoading || !turnstileToken && !!sentOtp}
            >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader size="xs" className="h-4 w-4" />
                    <span>SECURING...</span>
                  </div>
                ) : "REGISTER"}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={isVerificationOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-[340px] rounded-[16px] p-6 border-none shadow-2xl bg-white overflow-hidden select-none [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Security Verification</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-2">
             <Turnstile 
                onVerify={handleTurnstileVerify} 
                onExpire={() => onVerify(null)}
                onError={() => onVerify(null)}
                theme="light"
             />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
