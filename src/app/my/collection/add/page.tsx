"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, AlertTriangle, Info, User, Landmark, Zap } from "lucide-react";
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
import { verifyUpiAction, type UpiVerificationResult } from "@/app/actions/upi-verification";

type ProviderConfig = {
  id: string;
  name: string;
  logo: string;
  brandColor: string;
  handles: string[];
  tpapKeywords: string[]; // Keywords to match against the API's 'tpap' field
};

const PROVIDERS: ProviderConfig[] = [
  { 
    id: "phonepe",
    name: "PhonePe", 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(4).png", 
    brandColor: "#6739B7",
    handles: ["@ybl", "@ibl", "@axl"],
    tpapKeywords: ["PHONEPE", "YBL", "IBL", "AXL"]
  },
  { 
    id: "paytm",
    name: "Paytm", 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(5).png", 
    brandColor: "#00BAF2",
    handles: ["@paytm", "@ptyes"],
    tpapKeywords: ["PAYTM", "PPBL"]
  },
  { 
    id: "mobikwik",
    name: "MobiKwik", 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png", 
    brandColor: "#0057E0",
    handles: ["@ikwik", "@mbkns"],
    tpapKeywords: ["MOBIKWIK", "IKWIK"]
  },
  { 
    id: "freecharge",
    name: "Freecharge", 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(3).png", 
    brandColor: "#FF5E00",
    handles: ["@freecharge"],
    tpapKeywords: ["FREECHARGE"]
  },
  { 
    id: "airtel",
    name: "Airtel", 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(2).png", 
    brandColor: "#E11900",
    handles: ["@airtel"],
    tpapKeywords: ["AIRTEL"]
  },
];

export default function AddCollectionPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState<UpiVerificationResult | null>(null);
  const [manualName, setManualName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleProviderClick = (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setIsSheetOpen(true);
    setUpiId("");
    setVerificationData(null);
    setManualName("");
  };

  const handleVerify = async () => {
    if (!selectedProvider || !upiId) return;
    
    setIsVerifying(true);
    try {
        const result = await verifyUpiAction(upiId.trim().toLowerCase());

        if (!result.success || !result.data) {
            throw new Error(result.error || "Verification failed.");
        }

        const data = result.data;

        // 1. Check if VPA is actually verified
        if (!data.isVpaVerified) {
            throw new Error("UPI ID is not registered or inactive.");
        }

        // 2. Validate TPAP matches the chosen provider
        const matchedTpap = selectedProvider.tpapKeywords.some(keyword => 
            data.tpap.toUpperCase().includes(keyword)
        );

        if (!matchedTpap) {
            throw new Error(`Security Alert: This UPI ID belongs to ${data.tpap}, but you selected ${selectedProvider.name}. Please select the correct provider.`);
        }

        setVerificationData(data);
        if (data.payeeAccountName) {
            setManualName(data.payeeAccountName);
        }

        toast({ title: "Account Verified", description: `Matched with ${data.pspBank}` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Verification Failed", description: error.message });
        setVerificationData(null);
    } finally {
        setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!user || !firestore || !selectedProvider || !verificationData) return;
    
    const finalName = manualName.trim() || verificationData.payeeAccountName;
    if (!finalName) {
        toast({ variant: "destructive", title: "Name Required", description: "Please enter your bank account holder name." });
        return;
    }

    setIsSaving(true);
    try {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) throw new Error("Profile not found.");

        const currentMethods = userSnap.data().paymentMethods || [];
        const isDuplicate = currentMethods.some((pm: any) => pm.upiId === verificationData.vpa);

        if (isDuplicate) throw new Error("This UPI ID is already linked.");
        
        const methodData = {
            type: 'upi',
            name: selectedProvider.name,
            upiId: verificationData.vpa,
            verifiedName: finalName,
            pspBank: verificationData.pspBank,
            tpap: verificationData.tpap,
            linkedAt: new Date().toISOString()
        };

        await updateDoc(userRef, { paymentMethods: [...currentMethods, methodData] });
      
        toast({ title: "Success", description: `${selectedProvider.name} linked successfully.` });
        setIsSheetOpen(false);
    } catch (error: any) {
       toast({ variant: "destructive", title: "Link Failed", description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FB]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b px-4 py-6">
        <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-100">
                <Link href="/my/collection"><ChevronLeft className="h-6 w-6 text-slate-800" /></Link>
            </Button>
            <div className="flex flex-col">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Link Payment</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select your UPI provider</p>
            </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-32">
        <div className="space-y-4">
            {PROVIDERS.map((provider, index) => (
                <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <div 
                        className={cn(
                            "relative overflow-hidden rounded-[28px] border bg-white shadow-sm cursor-pointer active:scale-[0.98] transition-all",
                            "hover:shadow-md hover:border-slate-200"
                        )}
                        onClick={() => handleProviderClick(provider)}
                    >
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-white border border-slate-50 flex items-center justify-center p-2 shadow-sm">
                                    {provider.logo && (
                                      <Image src={provider.logo} alt={provider.name} width={42} height={42} className="object-contain" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">{provider.name}</h3>
                                    <div className="flex gap-1 mt-1">
                                        {provider.handles.slice(0, 2).map(h => (
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

        <div className="p-10 text-center opacity-40 grayscale pointer-events-none">
            <ShieldCheck className="h-10 w-10 mx-auto mb-2" />
            <p className="text-[9px] font-bold uppercase tracking-[0.3em]">Flex Shield 4.0 Encrypted</p>
        </div>
      </main>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[40px] px-6 pb-10 pt-8 border-none shadow-2xl h-[90vh] overflow-y-auto no-scrollbar">
          <SheetHeader className="text-left mb-6">
            <div className="flex items-center gap-4 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center p-2 shadow-sm">
                    {selectedProvider?.logo && (
                      <Image src={selectedProvider.logo} alt="logo" width={32} height={32} className="object-contain" />
                    )}
                </div>
                <SheetTitle className="text-2xl font-black tracking-tight">Link {selectedProvider?.name}</SheetTitle>
            </div>
            <SheetDescription className="text-xs font-medium text-slate-500">
                BHIM UPI Verification Engine will confirm your identity.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Enter UPI ID</Label>
                <div className="relative">
                    <Input 
                        placeholder="example@handle" 
                        value={upiId}
                        onChange={(e) => { setUpiId(e.target.value.toLowerCase()); setVerificationData(null); }}
                        className="h-14 rounded-2xl bg-slate-50 border-none ring-2 ring-slate-100 focus-visible:ring-primary/20 text-lg font-black"
                        disabled={isVerifying}
                    />
                    <AnimatePresence>
                        {verificationData?.isVpaVerified && (
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
            </div>

            {verificationData && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <Landmark className="h-2 w-2" /> PSP Bank
                                </p>
                                <p className="font-bold text-xs truncate">{verificationData.pspBank}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 justify-end">
                                    <Zap className="h-2 w-2" /> App
                                </p>
                                <p className="font-bold text-xs truncate">{verificationData.tpap}</p>
                            </div>
                        </div>
                        
                        <div className="border-t border-white/5 pt-3">
                            <Label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Bank Account Name</Label>
                            {verificationData.payeeAccountName ? (
                                <p className="font-black text-base flex items-center gap-2">
                                    {verificationData.payeeAccountName} <CheckCircle2 className="h-4 w-4 text-green-400" />
                                </p>
                            ) : (
                                <div className="space-y-2 mt-1">
                                    <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 p-2 rounded-lg border border-amber-500/20 mb-2">
                                        <Info className="h-3 w-3" />
                                        <p className="text-[9px] font-bold uppercase">Name not found. Please enter manually.</p>
                                    </div>
                                    <Input 
                                        placeholder="Full Bank Name" 
                                        value={manualName}
                                        onChange={(e) => setManualName(e.target.value.toUpperCase())}
                                        className="h-10 bg-white/5 border-white/10 text-white rounded-xl text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex gap-2 items-start">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-blue-700 font-bold uppercase leading-relaxed">
                            Verification Success. This account belongs to UID: {verificationData.userId}. Ensure the name matches your official bank records.
                        </p>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4">
                <Button variant="outline" className="h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest" onClick={() => setIsSheetOpen(false)} disabled={isSaving}>
                    Cancel
                </Button>
                {verificationData ? (
                    <Button 
                        onClick={handleSave} 
                        className="h-14 btn-gradient rounded-2xl font-black uppercase tracking-widest shadow-blue-500/20"
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader size="xs" /> : "Link Now"}
                    </Button>
                ) : (
                    <Button 
                        onClick={handleVerify} 
                        className="h-14 btn-gradient rounded-2xl font-black uppercase tracking-widest shadow-blue-500/20"
                        disabled={isVerifying || !upiId}
                    >
                        {isVerifying ? <Loader size="xs" /> : "Verify Identity"}
                    </Button>
                )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
