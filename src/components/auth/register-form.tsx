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
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
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
      toast({ variant: "destructive", title: "System Error", description: "Firebase is not initialized." });
      return;
    }
    setIsLoading(true);
    try {
        const email = `91${values.phone}@lgpay.app`;
        
        // 1. Check if user already exists in Firestore (via phone)
        const phoneCheckQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', values.phone), limit(1));
        const phoneCheckSnap = await getDocs(phoneCheckQuery);
        if (!phoneCheckSnap.empty) {
            throw new Error("This phone number is already registered. Please login.");
        }

        // 2. Verify Inviter (Only if code is provided)
        let inviterUid = null;
        if (values.invitationCode) {
            const inviterQuery = query(collection(firestore, 'users'), where('numericId', '==', values.invitationCode), limit(1));
            const inviterSnap = await getDocs(inviterQuery);
            if (!inviterSnap.empty) {
                inviterUid = inviterSnap.docs[0].id;
            } else {
                throw new Error("Invalid invitation code.");
            }
        }

        // 3. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
        const user = userCredential.user;

        // 4. Generate a unique-ish numeric ID
        const numericId = Math.floor(10000000 + Math.random() * 90000000).toString();

        // 5. Create Firestore Profile
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

        toast({ title: "Registration Successful", description: "Please log in with your new account." });
        
        // Sign out automatically after registration to force standard login
        await signOut(auth);
        router.push("/login");
    } catch (error: any) {
      console.error("Registration failed:", error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
          errorMessage = "An account with this phone number already exists.";
      }
      toast({ variant: "destructive", title: "Registration Failed", description: errorMessage });
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
              <FormLabel>{translations.phoneNumber}</FormLabel>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-sm text-muted-foreground">
                  <Image src="https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg" width={20} height={14} alt="India Flag" />
                  <span>+91</span>
                </div>
                <FormControl><Input type="tel" placeholder={translations.enterPhoneNumber} className="pl-[88px] text-base" maxLength={10} {...field} /></FormControl>
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
                <FormControl><Input type={showPassword ? "text" : "password"} placeholder={translations.enterPassword} className="pl-4 pr-10 text-base" {...field} /></FormControl>
                <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              <FormControl><Input type={showPassword ? "text" : "password"} placeholder={translations.enterConfirmPassword} className="text-base" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invitationCode"
          render={({ field }) => (
            <FormItem>
                <FormLabel>{translations.invitationCode} (Optional)</FormLabel>
                <FormControl><Input placeholder={translations.enterInvitationCode} {...field} /></FormControl>
                <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agreement"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 pt-2">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <div className="text-sm leading-none"><FormLabel className="font-normal">{translations.iAgreeTo} <Link href="/terms" className="text-accent font-bold">User Agreement</Link></FormLabel><FormMessage /></div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full btn-gradient rounded-full h-12 text-lg font-bold" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {isLoading ? translations.registering : translations.register}
        </Button>
      </form>
    </Form>
  );
}
