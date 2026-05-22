"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Plus, Wallet, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";

type LinkedPaymentMethod = {
  type: 'upi' | 'bank';
  name: string;
  upiId?: string;
  accountNumber?: string;
};

const paymentMethodDetails: Record<string, { logo: string; bgColor: string }> = {
  PhonePe: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Phonepay.png?alt=media&token=579a228d-121f-4d5b-933d-692d791dec2f", bgColor: "bg-violet-600" },
  Paytm: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8", bgColor: "bg-sky-500" },
  MobiKwik: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7", bgColor: "bg-blue-600" },
  Freecharge: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4", bgColor: "bg-orange-500" },
  Airtel: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Airtel%2001.png?alt=media&token=357342fd-85df-43c1-a7fb-d9d57315df1d", bgColor: "bg-red-500" },
};

export default function CollectionPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { translations } = useLanguage();
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
    if (!confirm("Are you sure?")) return;

    try {
        const updatedMethods = [...paymentMethods];
        updatedMethods.splice(index, 1);
        await updateDoc(doc(firestore, 'users', user.uid), { paymentMethods: updatedMethods });
        toast({ title: "Removed" });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my"><ChevronLeft className="h-6 w-6 text-muted-foreground" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{translations.collection}</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        {profileLoading ? (
            <div className="flex items-center justify-center pt-20"><Loader size="md" /></div>
        ) : paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method, idx) => {
                const details = paymentMethodDetails[method.name] || { logo: "", bgColor: "bg-slate-700" };
                return (
                  <div key={idx} className={`flex h-20 w-full items-center justify-between gap-4 rounded-xl px-4 py-2 text-white shadow-md ${details.bgColor}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
                        {method.type === 'bank' ? <Wallet className="text-slate-700 h-6 w-6"/> : (
                           details.logo ? <Image src={details.logo} alt="" width={32} height={32} className="object-contain" /> : <Wallet className="h-6 w-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-lg font-semibold truncate block">{method.name}</span>
                        <p className="text-xs font-mono text-white/80 truncate block">
                            {method.type === 'upi' ? method.upiId : `****${method.accountNumber?.slice(-4)}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                );
              })}
            </div>
        ) : (
             <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground">
                <Wallet className="h-16 w-16 opacity-30" />
                <p className="mt-4 text-lg font-medium">No accounts linked.</p>
            </div>
        )}

        <Link href="/my/collection/add" className="block !mt-6">
          <Card className="bg-white hover:bg-gray-50 transition-colors">
            <CardContent className="flex items-center justify-center gap-3 p-4">
              <Plus className="h-4 w-4" />
              <span className="font-semibold">Add Payment Method</span>
            </CardContent>
          </Card>
        </Link>
      </main>
    </div>
  );
}
