
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";

type LinkedPaymentMethod = {
  name: string;
  upiId: string;
};

const paymentMethodDetails: { [key: string]: { logo: string; bgColor: string } } = {
  PhonePe: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Phonepay.png?alt=media&token=579a228d-121f-4d5b-933d-692d791dec2f", bgColor: "bg-violet-600" },
  Paytm: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8", bgColor: "bg-sky-500" },
  MobiKwik: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7", bgColor: "bg-blue-600" },
  Freecharge: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4", bgColor: "bg-orange-500" },
  Airtel: { logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Airtel%2001.png?alt=media&token=357342fd-85df-43c1-a7fb-d9d57315df1d", bgColor: "bg-red-500" },
};

export default function CollectionPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, loading: profileLoading } = useDoc<{ paymentMethods?: LinkedPaymentMethod[] }>(userProfileRef);

  const linkedMethods = userProfile?.paymentMethods || [];

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">My Collection</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        {profileLoading ? (
            <div className="flex items-center justify-center pt-20">
                <Loader size="md" />
            </div>
        ) : linkedMethods.length > 0 ? (
            <div className="space-y-3">
              {linkedMethods.map((method) => {
                const details = paymentMethodDetails[method.name];
                if (!details) return null;
                return (
                  <div
                    key={method.upiId}
                    className={`flex h-20 w-full items-center justify-between gap-4 rounded-xl px-4 py-2 text-white shadow-md ${details.bgColor}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
                        <Image
                          src={details.logo}
                          alt={`${method.name} logo`}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <span className="text-lg font-semibold">{method.name}</span>
                        <p className="text-xs font-mono text-white/80">{method.upiId}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center rounded-md bg-green-500/80 px-3 py-1.5 text-xs font-bold uppercase text-white">
                        ACTIVATED
                    </div>
                  </div>
                );
              })}
            </div>
        ) : (
             <div className="flex flex-col items-center justify-center pt-20 text-center text-muted-foreground">
                <Wallet className="h-16 w-16 opacity-30" />
                <p className="mt-4 text-lg font-medium">No UPI accounts linked.</p>
                <p className="text-sm">Click below to add a new account.</p>
            </div>
        )}

        <Link href="/my/collection/add" className="block !mt-6">
          <Card className="bg-white">
            <CardContent className="flex items-center justify-center gap-3 p-4">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-muted text-muted-foreground">
                <Plus className="h-4 w-4" />
              </div>
              <span className="font-semibold text-foreground">Add payment UPI</span>
            </CardContent>
          </Card>
        </Link>
      </main>
    </div>
  );
}
