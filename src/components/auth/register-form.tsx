
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
import { Eye, EyeOff, Smartphone, LockKeyhole, KeyRound, Zap, CheckCircle2 } from "lucide-react";
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

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

interface RegisterFormProps {
  turnstileToken: string | null;
  onVerify: (token: string | null) => void;
}

export function RegisterForm({ turnstileToken, onVerify }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
      password: z.string().min(6, { message: translations.passwordMin }),
      confirmPassword: z.string(),
      invitationCode: z.string().min(1, { message: translations.invitationCodeRequired }),
      agreement: z.literal(true, { errorMap: () => ({ message: translations.agreementRequired }) }),
    })
    .refine((data) => data.password === data.confirmPassword, { message: translations.passwordsDontMatch, path: ["confirmPassword"] });

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: "", password: "", confirmPassword: "", invitationCode: invitationCodeFromUrl, agreement: false },
  });

  useEffect(() => {
    if (invitationCodeFromUrl) {
      form.setValue("invitationCode", invitationCodeFromUrl);
    }
  }, [invitationCodeFromUrl, form]);

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

  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    if (!turnstileToken) {
      toast({ variant: "destructive", title: "Security Check", description: "Please complete human verification." });
      return;
    }

    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
        const verifyRes = await fetch('/api/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          onVerify(null);
          throw new Error("Security verification expired. Please solve again.");
        }

        const fingerprint = generateHardwareFingerprint();
        const fingerprintQuery = query(collection(firestore, 'users'), where('hardwareFingerprint', '==', fingerprint), limit(1));
        const fingerprintSnap = await getDocs(fingerprintQuery);
        
        if (!fingerprintSnap.empty) {
          throw new Error("Already account created by this device please login");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onRegisterSubmit)} className="flex flex-col gap-6">
        {/* INNER UI CARD (FIELDS ONLY) */}
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
                    <Input type="tel" placeholder="Mobile Number" className="pl-14 h-11 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-primary/40 rounded-2xl text-[13px]" maxLength={10} {...field} />
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

        {/* OUTSIDE UI - CLOUDFLARE AND BUTTON */}
        <div className="space-y-4 px-2">
          {!turnstileToken ? (
            <div className="animate-in fade-in duration-300">
              <Turnstile 
                onVerify={(token) => onVerify(token)} 
                onExpire={() => onVerify(null)}
                onError={() => onVerify(null)}
              />
            </div>
          ) : (
            <div className="flex justify-center animate-in zoom-in duration-300 py-1">
              <div className="bg-teal-50 border border-teal-100 text-teal-600 px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm shadow-teal-500/5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Identity Verified</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full btn-gradient rounded-[22px] h-14 text-sm font-black shadow-teal-500/20 uppercase tracking-widest" 
            disabled={isLoading || !turnstileToken}
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
  );
}
