
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
import { Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
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
        title: "Unauthorized", 
        description: "This portal is for authorized administrators only." 
      });
      return;
    }

    if (!auth || !firestore) return;
    setIsLoading(true);

    const emailFormats = [
      `91${values.phone}@lgpay.app`,
      `${values.phone}@lgpay.app`
    ];

    let success = false;
    let loggedInUser = null;

    for (const email of emailFormats) {
      if (success) break;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
        loggedInUser = userCredential.user;
        success = true;
      } catch (error: any) {
        if (email === emailFormats[emailFormats.length - 1] && !success) {
          console.error("Admin login failed:", error);
          toast({ 
            variant: "destructive", 
            title: "Access Denied", 
            description: "Invalid administrator credentials." 
          });
          form.resetField("password");
        }
      }
    }

    if (success && loggedInUser) {
      // Ensure Admin Profile exists in Firestore for rules to pass
      try {
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
        
        toast({ title: "Welcome, Master Admin", description: "Secured session established." });
        
        // Use a small delay to ensure Auth state is recognized by providers
        setTimeout(() => {
          router.replace('/admin/dashboard');
        }, 500);

      } catch (e) {
        console.error("Error creating/checking admin profile:", e);
        // Still try to redirect
        router.replace('/admin/dashboard');
      }
    }
    
    setIsLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900">
      <Logo className="mb-8 text-4xl" />
      <Card className="w-full max-w-md border-none bg-slate-800 text-white shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Secure Key</CardTitle>
          <CardDescription className="text-slate-400">
            Authorized Personnel Only
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
                    <FormLabel>Admin ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Admin Phone Number" 
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" 
                        maxLength={10} 
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
                    <FormLabel>Security Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="bg-slate-700 border-slate-600 text-white pr-10" 
                          {...field} 
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full btn-gradient h-12 text-lg font-bold" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verify Identity"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
