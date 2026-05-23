"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Wallet, Trash2, BadgeCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const { toast } = useToast();
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

  const handleDelete = async (idx: number) => {
    if (!confirm("Remove account?")) return;
    try {
        const updated = [...methods];
        updated.splice(idx, 1);
        await updateDoc(doc(firestore!, 'users', user!.uid), { paymentMethods: updated });
        toast({ title: "Removed" });
    } catch (e) {}
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                    <Link href="/my"><ChevronLeft className="h-5 w-5" /></Link>
                </Button>
                <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Withdrawal Hub</h1>
            </div>
            <Link href="/my/collection/add">
                <Button size="icon" className="h-8 w-8 rounded-lg btn-gradient"><Plus className="h-4 w-4" /></Button>
            </Link>
      </header>

      <main className="p-3 space-y-3">
        {loading ? (
            <div className="flex justify-center pt-20"><Loader size="sm" /></div>
        ) : methods.length > 0 ? (
            methods.map((m, i) => {
                const cfg = providerConfig[m.name] || { logo: "", brandColor: "#cbd5e1" };
                return (
                    <div key={i} className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between group">
                         <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cfg.brandColor }} />
                         <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center p-1.5 border border-slate-100">
                                 {cfg.logo ? <Image src={cfg.logo} alt="" width={28} height={28} /> : <Wallet className="h-4 w-4" />}
                             </div>
                             <div>
                                 <p className="font-black text-slate-800 text-[13px] leading-none">{m.name}</p>
                                 <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 truncate max-w-[150px]">{m.upiId}</p>
                             </div>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="flex flex-col items-end gap-1">
                                <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-[8px] font-black text-slate-300 uppercase">Active</span>
                             </div>
                             <Button variant="ghost" size="icon" onClick={() => handleDelete(i)} className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                             </Button>
                         </div>
                    </div>
                )
            })
        ) : (
             <div className="text-center py-32 opacity-20 px-10">
                <Wallet className="h-12 w-12 mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest">No Linked Accounts</p>
                <Button asChild className="mt-6 h-9 px-6 rounded-lg btn-gradient text-[10px] font-black uppercase tracking-widest">
                    <Link href="/my/collection/add">Connect Now</Link>
                </Button>
            </div>
        )}
        <div className="pt-6 text-center opacity-30">
            <ShieldCheck className="h-6 w-6 mx-auto mb-1" />
            <p className="text-[8px] font-black uppercase tracking-widest">Encrypted by Flex Shield 4.0</p>
        </div>
      </main>
    </div>
  );
}
