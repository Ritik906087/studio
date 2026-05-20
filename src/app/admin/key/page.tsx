
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
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
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

    if (!auth) return;
    setIsLoading(true);

    const emailFormats = [
      `91${values.phone}@lgpay.app`,
      `${values.phone}@lgpay.app`
    ];

    let success = false;

    for (const email of emailFormats) {
      if (success) break;
      try {
        await signInWithEmailAndPassword(auth, email, values.password);
        success = true;
      } catch (error: any) {
        if (email === emailFormats[emailFormats.length - 1]) {
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

    if (success) {
      toast({ title: "Welcome, Master Admin", description: "Secured session established." });
      router.push('/admin/dashboard');
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
