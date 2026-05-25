
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
import { Eye, EyeOff, ShieldCheck, Terminal, Server, Database } from "lucide-react";
import { useState } from "react";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";

const ADMIN_CREDENTIALS: Record<string, string> = {
  '9955557336': 'Satyam7890',
  '9060873927': 'Ritik@9060',
  '7307081891': 'Anand8090',
  '9199604613': 'ritik@123'
};

const formSchema = z.object({
  phone: z.string().length(10, { message: "Admin Master ID required" }),
  password: z.string().min(6, { message: "Security Password required" }),
});

export default function AdminKeyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      if (!firestore) throw new Error("Database offline.");
      
      const hardcodedPassword = ADMIN_CREDENTIALS[values.phone];
      let isVerified = hardcodedPassword === values.password;

      if (!isVerified) {
        const adminQuery = query(
          collection(firestore, 'admins'),
          where('masterId', '==', values.phone),
          where('password', '==', values.password),
          limit(1)
        );
        const adminSnap = await getDocs(adminQuery);
        isVerified = !adminSnap.empty;
      }

      if (!isVerified) throw new Error("Invalid Security Credentials.");

      const sessionData = {
        token: 'admin_' + Math.random().toString(36).substr(2, 12),
        masterId: values.phone,
        authenticated: true,
        expires: Date.now() + (12 * 60 * 60 * 1000)
      };
      localStorage.setItem('flex_admin_session', JSON.stringify(sessionData));

      toast({ 
        title: "Admin Server Granted", 
        description: "Initializing core...",
        className: "bg-blue-600 text-white border-none font-bold"
      });
      
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 500);

    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Access Violation", 
        description: error.message 
      });
      setIsLoading(false);
      form.resetField("password");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#020617]">
      <div className="animate-fade-in mb-8 flex flex-col items-center">
        <Logo className="text-4xl" />
        <div className="flex items-center gap-2 text-blue-500 mt-2">
            <Terminal className="h-4 w-4" />
            <span className="text-[10px] font-black tracking-widest uppercase">Console v4.0.1</span>
        </div>
      </div>
      <Card className="w-full max-w-md border border-blue-900/50 bg-slate-900/50 text-white shadow-[0_0_50px_rgba(30,58,138,0.3)] backdrop-blur-md overflow-hidden rounded-3xl">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
        <CardHeader className="text-center space-y-1 py-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tighter">ADMIN CORE ACCESS</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Authorized Personnel Only
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 text-xs font-black uppercase tracking-widest">Master Identifier</FormLabel>
                    <div className="relative">
                        <Server className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <FormControl>
                        <Input 
                            placeholder="MASTER ID" 
                            className="bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-700 h-14 pl-11 focus:border-blue-500 rounded-xl transition-all" 
                            maxLength={10} 
                            autoComplete="username"
                            {...field} 
                        />
                        </FormControl>
                    </div>
                    <FormMessage className="text-red-400 text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 text-xs font-black uppercase tracking-widest">Access Key</FormLabel>
                    <div className="relative">
                      <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="bg-slate-950/50 border-slate-800 text-white pr-12 h-14 pl-11 focus:border-blue-500 rounded-xl transition-all" 
                          autoComplete="current-password"
                          {...field} 
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:bg-transparent hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    <FormMessage className="text-red-400 text-[10px]" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 h-14 text-sm font-black tracking-widest uppercase rounded-xl shadow-lg shadow-blue-900/20" disabled={isLoading}>
                {isLoading ? "SYNCHRONIZING..." : "AUTHENTICATE SYSTEM"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-8 text-[10px] text-slate-700 font-black tracking-[0.3em] uppercase">Security Level: Maximum</p>
    </main>
  );
}
