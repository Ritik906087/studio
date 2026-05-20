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
import { Loader2, Eye, EyeOff, Smartphone, LockKeyhole, UserPlus, KeyRound } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, limit, serverTimestamp } from "firebase/firestore";

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";

export function RegisterForm() {
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
      invitationCode: z.string().optional(),
      agreement: z.literal(true, { errorMap: () => ({ message: translations.agreementRequired }) }),
    })
    .refine((data) => data.password === data.confirmPassword, { message: translations.passwordsDontMatch, path: ["confirmPassword"] });

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: "", password: "", confirmPassword: "", invitationCode: invitationCodeFromUrl, agreement: false },
  });

  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    if (!auth || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Firebase is not ready. Please try again." });
      return;
    }
    setIsLoading(true);
    try {
        const email = `91${values.phone}@lgpay.app`;
        
        const phoneCheckQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', values.phone), limit(1));
        const phoneCheckSnap = await getDocs(phoneCheckQuery);
        if (!phoneCheckSnap.empty) {
            throw new Error("This phone number is already registered.");
        }

        let inviterUid = null;
        if (values.invitationCode) {
            const inviterQuery = query(collection(firestore, 'users'), where('numericId', '==', values.invitationCode), limit(1));
            const inviterSnap = await getDocs(inviterQuery);
            if (!inviterSnap.empty) {
                inviterUid = inviterSnap.docs[0].id;
            } else {
                toast({ variant: "destructive", title: "Notice", description: "Invalid invitation code. Registering without it." });
            }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
        const user = userCredential.user;

        const numericId = Math.floor(10000000 + Math.random() * 90000000).toString();

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
            claimedUserRewards: [],
            createdAt: serverTimestamp(),
        });

        toast({ title: "Welcome!", description: "Registration successful." });
        router.push("/home");
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast({ variant: "destructive", title: "Registration Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onRegisterSubmit)} className="space-y-4">
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
                <FormControl><Input type="tel" placeholder={translations.enterPhoneNumber} className="pl-[84px] h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary rounded-xl" maxLength={10} {...field} /></FormControl>
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
              <FormLabel className="text-slate-600 font-bold text-xs uppercase tracking-wider">{translations.password}</FormLabel>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <FormControl><Input type={showPassword ? "text" : "password"} placeholder={translations.enterPassword} className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary rounded-xl" {...field} /></FormControl>
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-600 font-bold text-xs uppercase tracking-wider">{translations.confirmPassword}</FormLabel>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <KeyRound className="h-4 w-4" />
                </div>
                <FormControl><Input type={showPassword ? "text" : "password"} placeholder={translations.enterConfirmPassword} className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary rounded-xl" {...field} /></FormControl>
              </div>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invitationCode"
          render={({ field }) => (
            <FormItem>
                <FormLabel className="text-slate-600 font-bold text-xs uppercase tracking-wider">{translations.invitationCode} (Optional)</FormLabel>
                <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <FormControl><Input placeholder={translations.enterInvitationCode} className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary rounded-xl" {...field} /></FormControl>
                </div>
                <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agreement"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
              <div className="text-[11px] leading-snug"><FormLabel className="font-semibold text-slate-600">{translations.iAgreeTo} <Link href="/terms" className="text-primary font-black hover:underline transition-all">User Agreement</Link></FormLabel><FormMessage className="text-[10px]" /></div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full btn-gradient rounded-xl h-14 text-base font-black mt-4 shadow-xl shadow-primary/20" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {isLoading ? translations.registering : translations.register}
        </Button>
      </form>
    </Form>
  );
}