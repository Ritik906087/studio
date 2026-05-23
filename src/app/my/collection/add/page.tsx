
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type PaymentMethod = {
  id: string;
  name: string;
  logo: string;
  gradient: string;
  handles: string[];
  description: string;
};

const PROVIDERS: PaymentMethod[] = [
  { 
    id: "phonepe",
    name: "PhonePe", 
    logo: "https://gfpzygqegzakluihhkkr.supabase.co/storage/v1/object/sign/Lg%20pay/download%20(4).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMWRjNDIxNy1iODI0LTQ4ZjEtODQ3ZS04OWU1NWI3YzdhMjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMZyBwYXkvZG93bmxvYWQgKDQpLnBuZyIsImlhdCI6MTc3NTE0ODYyMSwiZXhwIjoxODA2Njg0NjIxfQ.b_cMHhiCw52krGt2edtt1k5C1Keo8uGJwYIWpe6vZVo", 
    gradient: "from-[#6739B7] to-[#512DA8]",
    handles: ["@ybl", "@ibl", "@axl"],
    description: "Link your primary PhonePe UPI"
  },
  { 
    id: "paytm",
    name: "Paytm", 
    logo: "https://gfpzygqegzakluihhkkr.supabase.co/storage/v1/object/sign/Lg%20pay/download%20(5).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMWRjNDIxNy1iODI0LTQ4ZjEtODQ3ZS04OWU1NWI3YzdhMjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMZyBwYXkvZG93bmxvYWQgKDUpLnBuZyIsImlhdCI6MTc3NTE0ODYzMiwiZXhwIjoxODA2Njg0NjMyfQ.QXSbgSLV3ULTcV3ss9Co9ZMe1oj3tb9bR_OP8xY-Nds", 
    gradient: "from-[#00BAF2] to-[#002E6E]",
    handles: ["@paytm", "@ptyes"],
    description: "Instant settlement via Paytm Wallet"
  },
  { 
    id: "mobikwik",
    name: "MobiKwik", 
    logo: "https://gfpzygqegzakluihhkkr.supabase.co/storage/v1/object/sign/Lg%20pay/download%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMWRjNDIxNy1iODI0LTQ4ZjEtODQ3ZS04OWU1NWI3YzdhMjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMZyBwYXkvZG93bmxvYWQgKDEpLnBuZyIsImlhdCI6MTc3NTE0ODU3MywiZXhwIjoxODA2Njg0NTczfQ.m8Z7gn5FV-0ss58kTEUZ833u8Wv_bFun3YZeZtyIa9s", 
    gradient: "from-[#0057E0] to-[#002B70]",
    handles: ["@ikwik", "@mbkns"],
    description: "Secure payments with MobiKwik"
  },
  { 
    id: "freecharge",
    name: "Freecharge", 
    logo: "https://gfpzygqegzakluihhkkr.supabase.co/storage/v1/object/sign/Lg%20pay/download%20(3).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMWRjNDIxNy1iODI0LTQ4ZjEtODQ3ZS04OWU1NWI3YzdhMjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMZyBwYXkvZG93bmxvYWQgKDMpLnBuZyIsImlhdCI6MTc3NTE0ODYwOSwiZXhwIjoxODA2Njg0NjA5fQ.pus8pOlgEXCFb2pjIzNsVtU9DxnIxEeaVaeR3TuIQPc", 
    gradient: "from-[#FF5E00] to-[#E64A19]",
    handles: ["@freecharge"],
    description: "Fast UPI link for Freecharge users"
  },
  { 
    id: "airtel",
    name: "Airtel", 
    logo: "https://gfpzygqegzakluihhkkr.supabase.co/storage/v1/object/sign/Lg%20pay/download%20(2).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMWRjNDIxNy1iODI0LTQ4ZjEtODQ3ZS04OWU1NWI3YzdhMjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMZyBwYXkvZG93bmxvYWQgKDIpLnBuZyIsImlhdCI6MTc3NTE0ODU5OSwiZXhwIjoxODA2Njg0NTk5fQ.yDb5CBUsF_MCejlDIzrQVjg6IMylJbAzEmHFaozfNjE", 
    gradient: "from-[#E11900] to-[#B71C1C]",
    handles: ["@airtel"],
    description: "Link Airtel Payments Bank UPI"
  },
];

export default function AddCollectionPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedProvider, setSelectedProvider] = useState<PaymentMethod | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleProviderClick = (provider: PaymentMethod) => {
    setSelectedProvider(provider);
    setIsSheetOpen(true);
    setUpiId("");
    setVerifiedName(null);
  };

  const validateHandle = (id: string, provider: PaymentMethod) => {
    const handle = id.substring(id.lastIndexOf("@"));
    return provider.handles.includes(handle.toLowerCase());
  };

  const handleVerify = async () => {
    if (!selectedProvider) return;
    
    if (!upiId.includes("@")) {
        toast({ variant: "destructive", title: "Invalid Format", description: "Please enter a complete UPI ID (e.g. name@handle)" });
        return;
    }

    if (!validateHandle(upiId, selectedProvider)) {
        toast({ 
            variant: "destructive", 
            title: "Invalid Handle", 
            description: `Only ${selectedProvider.handles.join(", ")} handles are allowed for ${selectedProvider.name}.` 
        });
        return;
    }

    setIsVerifying(true);
    // Simulate real bank verification delay
    setTimeout(() => {
        setVerifiedName(profile?.displayName || "Verified Account User");
        setIsVerifying(false);
        toast({ title: "UPI Verified", description: "Bank account details fetched successfully." });
    }, 2000);
  };

  const handleSave = async () => {
    if (!user || !firestore || !selectedProvider || !verifiedName) return;

    setIsSaving(true);
    try {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) throw new Error("Profile not found.");

        const currentMethods = userSnap.data().paymentMethods || [];
        const isDuplicate = currentMethods.some((pm: any) => pm.upiId === upiId);

        if (isDuplicate) throw new Error("This UPI ID is already linked.");
        
        const methodData = {
            type: 'upi',
            name: selectedProvider.name,
            upiId: upiId,
            verifiedName: verifiedName,
            linkedAt: new Date().toISOString()
        };

        await updateDoc(userRef, { paymentMethods: [...currentMethods, methodData] });
      
        toast({ title: "Account Linked!", description: `${selectedProvider.name} has been added to your wallet.` });
        setIsSheetOpen(false);
    } catch (error: any) {
       toast({ variant: "destructive", title: "Link Failed", description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FB]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b px-4 py-6">
        <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-100">
                <Link href="/my/collection"><ChevronLeft className="h-6 w-6 text-slate-800" /></Link>
            </Button>
            <div className="flex flex-col">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Add Payment Method</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link your receiving UPI securely</p>
            </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-32">
        <div className="bg-blue-600 rounded-3xl p-5 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="h-24 w-24" /></div>
            <div className="relative z-10">
                <h2 className="text-lg font-black">Secure Link</h2>
                <p className="text-xs opacity-80 mt-1 max-w-[200px]">Link your UPI once to receive instant P2P settlements directly into your bank.</p>
            </div>
        </div>

        <div className="space-y-4">
            {PROVIDERS.map((provider, index) => (
                <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <div 
                        className={cn(
                            "relative overflow-hidden rounded-[28px] border-none shadow-sm cursor-pointer active:scale-[0.98] transition-all",
                            "bg-white hover:shadow-md"
                        )}
                        onClick={() => handleProviderClick(provider)}
                    >
                        <div className={cn("absolute inset-y-0 left-0 w-2 bg-gradient-to-b", provider.gradient)} />
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn("h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center p-2 shadow-inner", provider.gradient)}>
                                    {provider.logo && (
                                      <Image src={provider.logo} alt={provider.name} width={40} height={40} className="object-contain brightness-0 invert" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">{provider.name}</h3>
                                    <div className="flex gap-1.5 mt-1.5">
                                        {provider.handles.map(h => (
                                            <span key={h} className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full border uppercase">{h}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                    <ChevronRight className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>

        <div className="p-6 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Verified by Flex Shield 4.0</p>
        </div>
      </main>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[40px] px-6 pb-10 pt-8 border-none shadow-2xl">
          <SheetHeader className="text-left mb-6">
            <div className="flex items-center gap-4 mb-2">
                <div className={cn("h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center p-2.5", selectedProvider?.gradient)}>
                    {selectedProvider?.logo && (
                      <Image src={selectedProvider.logo} alt="logo" width={32} height={32} className="object-contain brightness-0 invert" />
                    )}
                </div>
                <SheetTitle className="text-2xl font-black tracking-tight">Link {selectedProvider?.name}</SheetTitle>
            </div>
            <SheetDescription className="text-xs font-medium text-slate-500">
                Link your {selectedProvider?.name} UPI to receive payments instantly.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Registered Mobile</Label>
                <div className="h-14 w-full bg-slate-50 rounded-2xl border-none ring-1 ring-slate-100 flex items-center px-4 font-black text-slate-800 tabular-nums">
                    +91 {profile?.phoneNumber || "XXXXXXXXXX"}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Enter UPI ID</Label>
                <div className="relative">
                    <Input 
                        placeholder="yourname@handle" 
                        value={upiId}
                        onChange={(e) => { setUpiId(e.target.value.toLowerCase()); setVerifiedName(null); }}
                        className="h-14 rounded-2xl bg-white border-none ring-2 ring-slate-100 focus-visible:ring-primary/20 text-lg font-black"
                    />
                    <AnimatePresence>
                        {verifiedName && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-100"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase">Verified</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {!verifiedName && upiId && (
                    <p className="text-[10px] font-bold text-slate-400 mt-1 ml-1 uppercase">
                        Supported handles: {selectedProvider?.handles.join(", ")}
                    </p>
                )}
            </div>

            {verifiedName && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-900 rounded-2xl text-white flex items-center justify-between"
                >
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Receiver Name</p>
                        <p className="font-black text-base">{verifiedName} ✓</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-400" />
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4">
                <Button variant="outline" className="h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest" onClick={() => setIsSheetOpen(false)}>
                    Cancel
                </Button>
                {verifiedName ? (
                    <Button 
                        onClick={handleSave} 
                        className="h-14 btn-gradient rounded-2xl font-black uppercase tracking-widest shadow-blue-500/20"
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader size="xs" /> : "Save Account"}
                    </Button>
                ) : (
                    <Button 
                        onClick={handleVerify} 
                        className="h-14 btn-gradient rounded-2xl font-black uppercase tracking-widest shadow-blue-500/20"
                        disabled={isVerifying || !upiId}
                    >
                        {isVerifying ? <Loader size="xs" /> : "Verify UPI"}
                    </Button>
                )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
