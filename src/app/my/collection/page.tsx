
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Wallet, BadgeCheck, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";

const providerConfig: Record<string, { logo: string; brandColor: string }> = {
  PhonePe: { logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(4).png", brandColor: "#6739B7" },
  Paytm: { logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(5).png", brandColor: "#00BAF2" },
  MobiKwik: { logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png", brandColor: "#0057E0" },
  Freecharge: { logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(3).png", brandColor: "#FF5E00" },
  Airtel: { logo: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(2).png", brandColor: "#E11900" },
};

export default function CollectionPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user || !firestore) return;
    const unsub = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
      if (snap.exists()) setMethods(snap.data().paymentMethods || []);
      setLoading(false);
    });
    return () => unsub();
  }, [user, firestore]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                    <Link href="/my"><ChevronLeft className="h-5 w-5" /></Link>
                </Button>
                <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Account</h1>
            </div>
            <Link href="/my/collection/add">
                <Button size="icon" className="h-8 w-8 rounded-lg btn-gradient"><Plus className="h-4 w-4" /></Button>
            </Link>
      </header>

      <main className="p-2 space-y-2">
        {loading ? (
            <div className="flex justify-center pt-20"><Loader size="sm" /></div>
        ) : methods.length > 0 ? (
            methods.map((m, i) => {
                const cfg = providerConfig[m.name] || { logo: "", brandColor: "#cbd5e1" };
                return (
                    <div key={i} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between group">
                         <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cfg.brandColor }} />
                         <div className="flex items-center gap-2.5">
                             <div className="h-9 w-9 bg-slate-50 rounded-lg flex items-center justify-center p-1.5 border border-slate-100 shrink-0">
                                 {cfg.logo ? <Image src={cfg.logo} alt="" width={24} height={24} /> : <Wallet className="h-4 w-4" />}
                             </div>
                             <div className="min-w-0">
                                 <p className="font-black text-slate-800 text-[12px] leading-tight truncate">{m.name}</p>
                                 <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5 truncate max-w-[120px]">{m.upiId}</p>
                             </div>
                         </div>
                         <div className="flex items-center gap-2">
                             <div className="flex flex-col items-end shrink-0">
                                <div className="flex items-center gap-1">
                                    <BadgeCheck className="h-3 w-3 text-blue-500" />
                                    <Lock className="h-2.5 w-2.5 text-slate-300" />
                                </div>
                                <span className="text-[7px] font-black text-slate-300 uppercase">Linked & Locked</span>
                             </div>
                         </div>
                    </div>
                )
            })
        ) : (
             <div className="text-center py-24 opacity-20 px-8">
                <Wallet className="h-10 w-10 mx-auto mb-3" />
                <p className="text-[9px] font-black uppercase tracking-widest">No Linked Accounts</p>
                <Button asChild className="mt-4 h-8 px-5 rounded-lg btn-gradient text-[9px] font-black uppercase tracking-widest">
                    <Link href="/my/collection/add">Connect Now</Link>
                </Button>
            </div>
        )}
        
        {methods.length > 0 && (
            <div className="p-4 mt-2 bg-orange-50/50 border border-orange-100 rounded-xl flex gap-3">
                <Info className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-[9px] text-orange-800 font-bold uppercase leading-relaxed">
                    SECURITY LOCK: LINKED ACCOUNTS CANNOT BE REMOVED OR EDITED. CONTACT SUPPORT FOR VERIFICATION CHANGES.
                </p>
            </div>
        )}

        <div className="pt-6 text-center opacity-30">
            <ShieldCheck className="h-5 w-5 mx-auto mb-1" />
            <p className="text-[7px] font-black uppercase tracking-widest">Secured by Flex Pay Network</p>
        </div>
      </main>
    </div>
  );
}
