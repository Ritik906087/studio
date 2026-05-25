'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { Download } from 'lucide-react';

export default function DownloadPage() {
  const apkUrl = "https://files.catbox.moe/7za6rf.apk";
  const logoUrl = "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Banner/IMG_20260525_122039_723.jpg";

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <main className="flex flex-grow items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20">
          <CardHeader className="items-center text-center">
             <div className="relative h-28 w-28 mb-4">
                <Image
                    src={logoUrl}
                    fill
                    alt="Flex Pay Logo"
                    className="rounded-[28px] object-cover shadow-xl"
                    unoptimized
                />
             </div>
            <CardTitle className="text-2xl font-black pt-2 uppercase tracking-tight">Flex Pay</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Version 4.0.0 Global Node
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 mt-2">
            <Button asChild size="lg" className="h-14 w-full text-sm font-black btn-gradient rounded-[20px] uppercase tracking-widest">
              <a href={apkUrl} download>
                <Download className="mr-2 h-5 w-5" />
                Download APK
              </a>
            </Button>
            <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">Secured by Flex Shield v4.0</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
