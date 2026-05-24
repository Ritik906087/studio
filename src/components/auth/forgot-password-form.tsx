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
import { KeyRound, Smartphone, Eye, EyeOff, LockKeyhole, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { Loader } from "@/components/ui/loader";
import { useRouter } from "next/navigation";
import { getAuth, signInWithEmailAndPassword, updatePassword, signOut } from "firebase/auth";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { toast } = useToast();
  const { translations } = useLanguage();
  const router = useRouter();
  const auth = getAuth();
  const firestore = useFirestore();

  const formSchema = z.object({
    phone: z.string().length(10, { message: translations.phoneRequired }).regex(/^[6-9]\d{9}$/, { message: translations.phoneInvalid }),
    oldPassword: z.string().min(6, { message: "Old password is required" }),
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
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    setIsLoading(true);

    try {
      // 1. Check if user is registered in Firestore
      const userQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', values.phone), limit(1));
      const userSnap = await getDocs(userQuery);

      if (userSnap.empty) {
        throw new Error("This mobile number is not registered.");
      }

      // 2. Attempt to verify Identity by signing in with Old Password
      const email = `91${values.phone}@lgpay.app`;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, values.oldPassword);
        const user = userCredential.user;

        // 3. Update to New Password
        await updatePassword(user, values.newPassword);
        
        // 4. Sign out for security
        await signOut(auth);

        toast({
          title: "Password Changed!",
          description: "Your password has been updated. Please login with your new credentials.",
          className: "bg-green-600 text-white border-none font-bold"
        });
        router.push('/login');
      } catch (authError: any) {
        if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
          throw new Error("Old password is incorrect. Identity verification failed.");
        }
        throw authError;
      }

    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({ 
        variant: "destructive", 
        title: "Update Failed", 
        description: error.message || "Something went wrong." 
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Mobile Field */}
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
                  className="pl-20 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-sm font-black" 
                  maxLength={10} 
                  {...form.register("phone")} 
                />
              </FormControl>
            </div>
          </div>

          {/* Old Password Field */}
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Old Password</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="ENTER OLD PASSWORD" 
                  className="pl-11 h-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/40 rounded-xl text-xs font-bold" 
                  {...form.register("oldPassword")} 
                />
              </FormControl>
            </div>
          </div>

          {/* New Password Field */}
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

          {/* Confirm Password Field */}
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

          <Button type="submit" className="w-full h-14 btn-gradient rounded-2xl font-black text-sm uppercase tracking-widest shadow-teal-500/20" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader size="xs" />
                <span>UPDATING...</span>
              </div>
            ) : "RESET PASSWORD"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
