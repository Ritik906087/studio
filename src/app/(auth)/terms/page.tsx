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
import { useLanguage } from '@/context/language-context';
import { useState, useEffect } from 'react';

export default function TermsPage() {
  const { translations } = useLanguage();
  const [date, setDate] = useState('');

  useEffect(() => {
    setDate(new Date().toLocaleDateString());
  }, []);

  return (
    <Card className="w-full max-w-md animate-fade-in-up rounded-2xl border-none bg-white/90 shadow-2xl shadow-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl">{translations.termsTitle}</CardTitle>
        <CardDescription>
          {translations.termsDesc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-64 w-full rounded-md border bg-white p-4 text-sm">
          <p className="mb-4">
            <strong>Last Updated: {date}</strong>
          </p>
          <p className="mb-2">
            Welcome to LG Pay! These terms and conditions outline the rules and
            regulations for the use of LG Pay's Website.
          </p>
          <p className="mb-2">
            By accessing this website we assume you accept these terms and
            conditions. Do not continue to use LG Pay if you do not agree to
            take all of the terms and conditions stated on this page.
          </p>
          <p className="mb-2">
            The following terminology applies to these Terms and Conditions,
            Privacy Statement and Disclaimer Notice and all Agreements:
            "Client", "You" and "Your" refers to you, the person log on this
            website and compliant to the Company’s terms and conditions. "The
            Company", "Ourselves", "We", "Our" and "Us", refers to our
            Company. "Party", "Parties", or "Us", refers to both the Client and
            ourselves.
          </p>
          <p className="mb-2">
            All terms refer to the offer, acceptance and consideration of
            payment necessary to undertake the process of our assistance to the
            Client in the most appropriate manner for the express purpose of
            meeting the Client’s needs in respect of provision of the Company’s
            stated services, in accordance with and subject to, prevailing law
            of Netherlands. Any use of the above terminology or other words in
            the singular, plural, capitalization and/or he/she or they, are
            taken as interchangeable and therefore as referring to same.
          </p>
          <h3 className="mt-4 mb-2 font-semibold">
            <strong>Cookies</strong>
          </h3>
          <p>
            We employ the use of cookies. By accessing LG Pay, you agreed to
            use cookies in agreement with the LG Pay's Privacy Policy.
          </p>
        </ScrollArea>
        <Button asChild className="w-full font-semibold">
          <Link href="/register">{translations.acceptAndContinue}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
