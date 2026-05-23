
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Plus, Wallet, Trash2, ShieldCheck, BadgeCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type LinkedPaymentMethod = {
  type: 'upi' | 'bank';
  name: string;
  upiId?: string;
  accountNumber?: string;
  verifiedName?: string;
};

const providerConfig: Record<string, { logo: string; brandColor: string }> = {
  PhonePe: { 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(4).png", 
    brandColor: "#6739B7" 
  },
  Paytm: { 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(5).png", 
    brandColor: "#00BAF2" 
  },
  MobiKwik: { 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png", 
    brandColor: "#0057E0" 
  },
  Freecharge: { 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(3).png", 
    brandColor: "#FF5E00" 
  },
  Airtel: { 
    logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(2).png", 
    brandColor: "#E11900" 
  },
};

export default function CollectionPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [paymentMethods, setPaymentMethods] = useState<LinkedPaymentMethod[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  
  useEffect(() => {
    if (!user || !firestore) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const unsubscribe = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setPaymentMethods(snapshot.data().paymentMethods || []);
      }
      setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const handleDelete = async (index: number) => {
    if (!user || !firestore) return;
    if (!confirm("Are you sure you want to remove this account?")) return;

    try {
        const updatedMethods = [...paymentMethods];
        updatedMethods.splice(index, 1);
        await updateDoc(doc(firestore, 'users', user.uid), { paymentMethods: updatedMethods });
        toast({ title: "Account Removed", description: "Your withdrawal method has been updated." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FB]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b px-4 py-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-100">
                    <Link href="/my"><ChevronLeft className="h-6 w-6 text-slate-800" /></Link>
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Withdrawal Hub</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage your linked accounts</p>
                </div>
            </div>
            <Link href="/my/collection/add">
                <Button size="icon" className="h-10 w-10 rounded-2xl btn-gradient">
                    <Plus className="h-5 w-5" />
                </Button>
            </Link>
        </div>
      </header>

      <main className="flex-grow space-y-6 p-4 pb-32">
        {profileLoading ? (
            <div className="flex items-center justify-center pt-20"><Loader size="md" /></div>
        ) : paymentMethods.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence>
                {paymentMethods.map((method, idx) => {
                    const config = providerConfig[method.name] || { logo: "", brandColor: "#1e293b" };
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative overflow-hidden rounded-[32px] p-6 bg-white border border-slate-100 shadow-xl shadow-blue-500/5 group"
                            style={{ borderLeft: `8px solid ${config.brandColor}` }}
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                <ShieldCheck className="h-32 w-32" />
                            </div>
                            
                            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-white border border-slate-50 flex items-center justify-center p-2 shadow-sm">
                                            {config.logo ? (
                                              <Image src={config.logo} alt={method.name} width={36} height={32} className="object-contain" />
                                            ) : (
                                              <Wallet className="h-6 w-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg tracking-tight leading-none text-slate-800">{method.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Primary Settlement</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)} className="h-9 w-9 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">UPI Identifier</p>
                                    <p className="text-xl font-mono font-black tracking-tighter truncate text-slate-800">
                                        {method.upiId}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{method.verifiedName || 'Active'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-green-50 text-green-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-green-100">
                                        <BadgeCheck className="h-2.5 w-2.5" />
                                        Linked
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
              </AnimatePresence>
            </div>
        ) : (
             <div className="flex flex-col items-center justify-center pt-20 text-center px-10">
                <div className="h-24 w-24 rounded-[32px] bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-6">
                    <Wallet className="h-10 w-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">No Accounts Found</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium">Link your primary UPI to start receiving settlements directly to your bank.</p>
                <Button asChild className="mt-8 px-10 rounded-2xl btn-gradient h-12 shadow-blue-500/20">
                    <Link href="/my/collection/add">Add First Account</Link>
                </Button>
            </div>
        )}
      </main>
    </div>
  );
}
