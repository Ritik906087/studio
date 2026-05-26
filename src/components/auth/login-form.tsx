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
import { Smartphone, LockKeyhole, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import Link from 'next/link';
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Loader } from "@/components/ui/loader";
import { Turnstile } from "./turnstile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ADMIN_PHONES = ['9955557336', '9060873927'];

interface LoginFormProps {
  turnstileToken: string | null;
  onVerify: (token: string | null) => void;
}

export function LoginForm({ turnstileToken, onVerify }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  
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

  async function performLogin(values: z.infer<typeof formSchema>, token: string) {
    if (!auth || !firestore) return;
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

      const email = `91${values.phone}@lgpay.app`;
      const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
      const user = userCredential.user;

      const newSessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      await updateDoc(doc(firestore, 'users', user.uid), { sessionId: newSessionId });
      localStorage.setItem(`session_${user.uid}`, newSessionId);
      
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/home');
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ variant: "destructive", title: "Access Denied", description: error.message || "Invalid login details" });
      setIsLoading(false);
    }
  }

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;

    const values = form.getValues();
    if (ADMIN_PHONES.includes(values.phone)) {
      toast({ variant: "destructive", title: "Access Restricted", description: "Use admin gateway." });
      return;
    }

    setIsVerificationOpen(true);
  };

  const handleTurnstileVerify = (token: string) => {
    onVerify(token);
    setTimeout(() => {
      setIsVerificationOpen(false);
      performLogin(form.getValues(), token);
    }, 800);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={handlePreSubmit} className="flex flex-col gap-6">
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-6 shadow-xl shadow-blue-500/5 ring-1 ring-slate-100 space-y-4">
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
          </div>

          <div className="px-2">
            <Button 
              type="submit" 
              className="w-full btn-gradient rounded-[22px] h-14 text-sm font-black shadow-teal-500/20 uppercase tracking-widest" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader size="xs" className="h-4 w-4" />
                  <span>{translations.loggingIn}</span>
                </div>
              ) : translations.login}
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
