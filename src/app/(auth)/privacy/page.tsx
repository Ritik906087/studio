"use client";

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="border-none bg-white/90 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
             <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Privacy Policy</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
            Flex Pay Digital Integrity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-8">
          <ScrollArea className="h-[400px] w-full rounded-2xl border bg-slate-50 p-4 text-[11px] font-medium leading-relaxed text-slate-600">
            <p className="mb-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">
              Last Updated: {lastUpdated}
            </p>
            
            <section className="mb-4">
              <h3 className="font-black text-slate-800 uppercase text-[10px] mb-1">1. Introduction</h3>
              <p>Welcome to Flex Pay. We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information when you use our mobile-friendly payment rotation network.</p>
            </section>

            <section className="mb-4">
              <h3 className="font-black text-slate-800 uppercase text-[10px] mb-1">2. Data Collection</h3>
              <p>We collect essential information to provide secure services, including:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Phone Number: Used as your primary account identifier and for OTP verification.</li>
                <li>Display Name: For personalizing your experience.</li>
                <li>Device Intelligence: IP address, device model, and network type to prevent fraud.</li>
                <li>Payment Metadata: UPI IDs or bank details provided by you for P2P settlement.</li>
              </ul>
            </section>

            <section className="mb-4">
              <h3 className="font-black text-slate-800 uppercase text-[10px] mb-1">3. How We Use Data</h3>
              <p>Your data is used solely for:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Matching buy and sell orders in our P2P engine.</li>
                <li>Ensuring secure login sessions (Single Device Enforcement).</li>
                <li>Verifying transaction proofs and preventing fraudulent activity.</li>
                <li>Providing customer support via our Help Center.</li>
              </ul>
            </section>

            <section className="mb-4">
              <h3 className="font-black text-slate-800 uppercase text-[10px] mb-1">4. Security Features</h3>
              <p>Flex Pay utilizes "Flex Shield v4.0" which includes:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>End-to-end encryption for sensitive identifiers.</li>
                <li>Automatic VPN and Proxy detection to block malicious access.</li>
                <li>Real-time IP auditing for all financial operations.</li>
              </ul>
            </section>

            <section className="mb-4">
              <h3 className="font-black text-slate-800 uppercase text-[10px] mb-1">5. Third-Party Sharing</h3>
              <p>We do NOT sell your data to advertisers. We only share data with payment partners (like bhimupijs) strictly for VPA/UPI verification as requested by you during account linking.</p>
            </section>

            <section className="mb-4">
              <h3 className="font-black text-slate-800 uppercase text-[10px] mb-1">6. Policy Changes</h3>
              <p>We may update this policy periodically. Continued use of Flex Pay constitutes acceptance of the latest terms.</p>
            </section>

            <p className="text-center font-bold text-slate-400 mt-6 pt-4 border-t uppercase text-[9px]">
              Secured by Flex Pay Compliance Team
            </p>
          </ScrollArea>
          
          <Button asChild className="w-full h-12 btn-gradient rounded-xl font-black text-xs uppercase tracking-widest shadow-teal-500/20">
            <Link href="/register">
              <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
