
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";

const ADMIN_PHONE = '9060873927';

const formSchema = z.object({
  phone: z.string().length(10, { message: "Must be 10 digits" }),
  password: z.string().min(6, { message: "Minimum 6 characters" }),
});

export default function AdminKeyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.phone !== ADMIN_PHONE) {
      toast({ 
        variant: "destructive", 
        title: "Access Restricted", 
        description: "This portal is for the designated Master Admin only." 
      });
      return;
    }

    if (!auth || !firestore) {
      toast({ variant: "destructive", title: "System Error", description: "Firebase is not ready. Refresh and try again." });
      return;
    }
    
    setIsLoading(true);

    const emailFormats = [
      `91${values.phone}@lgpay.app`,
      `${values.phone}@lgpay.app`
    ];

    let success = false;
    let loggedInUser = null;
    let lastError = "Invalid credentials.";

    for (const email of emailFormats) {
      if (success) break;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
        loggedInUser = userCredential.user;
        success = true;
      } catch (error: any) {
        lastError = error.message;
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            lastError = "Incorrect admin ID or security password.";
        }
      }
    }

    if (success && loggedInUser) {
      try {
        // Ensure Admin Profile exists in Firestore
        const adminRef = doc(firestore, 'users', loggedInUser.uid);
        const adminSnap = await getDoc(adminRef);
        
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid: loggedInUser.uid,
            numericId: "00000000",
            phoneNumber: ADMIN_PHONE,
            displayName: "Master Admin",
            balance: 0,
            holdBalance: 0,
            createdAt: serverTimestamp(),
          });
        }
        
        toast({ 
          title: "Access Granted", 
          description: "Admin Server Granted",
          className: "bg-green-600 text-white border-none"
        });
        
        // Short delay to allow session to propagate
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1000);

      } catch (e) {
        console.error("Profile check error:", e);
        // If profile check fails but auth is good, still try to redirect
        router.push('/admin/dashboard');
      }
    } else {
      toast({ 
        variant: "destructive", 
        title: "Login Failed", 
        description: lastError 
      });
      form.resetField("password");
    }
    
    setIsLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900">
      <div className="animate-fade-in mb-8">
        <Logo className="text-4xl" />
      </div>
      <Card className="w-full max-w-md border-none bg-slate-800 text-white shadow-2xl shadow-primary/10 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-accent via-primary to-accent animate-pulse"></div>
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Secure Admin Access</CardTitle>
          <CardDescription className="text-slate-400">
            Verify identity to access management server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Master ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Admin Phone Number" 
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 h-12 focus:ring-primary/50" 
                        maxLength={10} 
                        autoComplete="username"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Security Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="bg-slate-700/50 border-slate-600 text-white pr-12 h-12 focus:ring-primary/50" 
                          autoComplete="current-password"
                          {...field} 
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full btn-gradient h-14 text-lg font-bold shadow-lg" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : "Verify Identity"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <div className="bg-slate-700/30 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <AlertCircle className="h-3 w-3" />
                <span>Encrypted Session Management Active</span>
            </div>
        </div>
      </Card>
      <p className="mt-8 text-xs text-slate-600">FLEX PAY SERVER v2.0.4</p>
    </main>
  );
}
