'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Clipboard, Send, ChevronLeft, Users, Zap, CheckCircle2, Info, Gift } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useUser } from '@/hooks/use-user';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function InvitePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    const unsub = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    });
    return () => unsub();
  }, [user, firestore]);

  const getShareDetails = () => {
    if (!profile?.numericId) return null;
    const code = profile.numericId;
    const url = `${window.location.origin}/register?ref=${code}`;
    return { url, text: `Join me on Flex Pay and earn rewards! Use my code: ${code}\n\n${url}`, code };
  }

  const handleCopyLink = () => {
    const d = getShareDetails();
    if (!d) return;
    navigator.clipboard.writeText(d.url).then(() => toast({ title: 'Link Copied' }));
  };

  const shareVia = (p: string) => {
    const d = getShareDetails();
    if (!d) return;
    const urls: any = { 
        wa: `https://wa.me/?text=${encodeURIComponent(d.text)}`,
        tg: `https://t.me/share/url?url=${encodeURIComponent(d.url)}&text=${encodeURIComponent(d.text)}`
    };
    window.open(urls[p], '_blank');
    setIsShareSheetOpen(false);
  };

  return (
    <div className="min-h-screen bg-white pb-24">
        <header className="flex items-center gap-2 px-4 py-3 sticky top-0 z-10 border-b bg-white">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2"><Link href="/home"><ChevronLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Affiliate Program</h1>
        </header>

        <main className="p-4 space-y-4">
          {/* PERSONAL CODE CARD */}
          <div className="bg-slate-900 rounded-[28px] p-6 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Zap className="h-24 w-24" /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Personal Code</p>
              <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-3xl font-black tracking-tighter">{profile?.numericId || '........'}</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={handleCopyLink}>
                      <Clipboard className="h-4 w-4" />
                  </Button>
              </div>
              <div className="mt-4 flex gap-2">
                  <div className="px-2 py-0.5 rounded-full bg-white/10 border border-white/5 text-[8px] font-black uppercase">Lv.1 (+1%)</div>
                  <div className="px-2 py-0.5 rounded-full bg-white/10 border border-white/5 text-[8px] font-black uppercase">Lv.2 (+0.8%)</div>
              </div>
          </div>

          {/* COMMISSION CARDS */}
          <div className="grid grid-cols-2 gap-3">
              <Card className="border-none bg-blue-50/50 rounded-[20px] p-4">
                  <div className="h-8 w-8 bg-blue-100 rounded-xl flex items-center justify-center mb-3"><Users className="h-4 w-4 text-blue-600" /></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Level 1 (Direct)</p>
                  <p className="text-[11px] font-bold text-slate-700 leading-tight mt-1">Earn 1% bonus on every order of A</p>
              </Card>
              <Card className="border-none bg-teal-50/50 rounded-[20px] p-4">
                  <div className="h-8 w-8 bg-teal-100 rounded-xl flex items-center justify-center mb-3"><CheckCircle2 className="h-4 w-4 text-teal-600" /></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Level 2 (Indirect)</p>
                  <p className="text-[11px] font-bold text-slate-700 leading-tight mt-1">Earn 0.8% bonus on every order of B</p>
              </Card>
          </div>

          {/* NEWBIE BONUS NOTICE */}
          <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-5 relative overflow-hidden">
              <div className="absolute -top-1 -right-1 opacity-10 rotate-12"><Gift className="h-12 w-12 text-orange-600" /></div>
              <p className="text-[11px] font-black text-orange-800 leading-relaxed uppercase">
                If your invited user completes all Newbie Reward tasks, you will receive an instant ₹100 bonus. Detailed reports are available in the My Family section.
              </p>
          </div>

          {/* HOW IT WORKS DIAGRAM */}
          <div className="bg-blue-50/50 rounded-[24px] p-5 border border-blue-100 space-y-3">
             <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-blue-600" />
                <h3 className="font-black text-[11px] text-blue-800 uppercase tracking-widest">How it works</h3>
             </div>
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">You</div>
                    <div className="flex-1 h-0.5 bg-slate-200 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[8px] font-black text-blue-600">Invited A</div>
                    </div>
                    <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black">A</div>
                    <div className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black">1%</div>
                </div>
                <div className="flex items-center gap-3 ml-6">
                    <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black">A</div>
                    <div className="flex-1 h-0.5 bg-slate-200 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[8px] font-black text-teal-600">Invited B</div>
                    </div>
                    <div className="h-6 w-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-black">B</div>
                    <div className="bg-teal-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black">0.8%</div>
                </div>
             </div>
             <p className="text-[9px] text-slate-400 font-medium italic mt-2">Example: If you invite A, you get 1%. If A invites B, you get 0.8% from B's orders too.</p>
          </div>

          {/* STEPS */}
          <div className="bg-slate-50 rounded-[24px] p-5 space-y-4 border border-slate-100">
              <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed">Share your unique invitation link with friends via WhatsApp or Telegram.</p>
              </div>
              <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed">Friends register and recharge assets in the rotation engine.</p>
              </div>
              <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed">Receive instant liquidity bonus credited directly to your master balance.</p>
              </div>
          </div>

          <div className="pt-4 space-y-3">
              <Button onClick={() => setIsShareSheetOpen(true)} className="w-full h-14 btn-gradient rounded-[20px] font-black text-sm shadow-blue-500/20" disabled={loading}>
                  {loading ? <Loader size="xs" /> : "START INVITING"}
              </Button>
              <Button asChild variant="ghost" className="w-full h-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Link href="/my/team">Audit Family Registry</Link>
              </Button>
          </div>
        </main>

        <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
            <SheetContent side="bottom" className="rounded-t-[32px] px-6 pb-12 pt-8 border-none shadow-2xl">
                <SheetHeader className="text-center mb-8">
                    <SheetTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Broadcast Invite</SheetTitle>
                    <SheetDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select secure channel</SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-6">
                    <button onClick={() => shareVia('wa')} className="flex flex-col items-center gap-2 group">
                        <div className="h-14 w-14 rounded-[20px] bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20 active:scale-90 transition-transform">
                            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.197 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">WhatsApp</span>
                    </button>
                    <button onClick={() => shareVia('tg')} className="flex flex-col items-center gap-2 group">
                        <div className="h-14 w-14 rounded-[20px] bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 active:scale-90 transition-transform">
                            <Send className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Telegram</span>
                    </button>
                    <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 group">
                        <div className="h-14 w-14 rounded-[20px] bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm active:scale-90 transition-transform border border-slate-200">
                            <Clipboard className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Copy Link</span>
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    </div>
  );
}
