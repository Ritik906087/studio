
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Send } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";


type PaymentMethod = {
  name: string;
  logo: string;
  bgColor: string;
};

type LinkedPaymentMethod = PaymentMethod & {
  linked: boolean;
  upiId?: string;
};

const initialPaymentMethods: PaymentMethod[] = [
  {
    name: "PhonePe",
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(1).png?alt=media&token=205260a4-bfcf-46dd-8dc6-5b440852f2ae",
    bgColor: "bg-violet-600",
  },
  {
    name: "Paytm",
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8",
    bgColor: "bg-sky-500",
  },
  {
    name: "MobiKwik",
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=ffb28e60-0b26-4802-9b54-bc6bbb02f35f",
    bgColor: "bg-blue-600",
  },
  {
    name: "Freecharge",
    logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4",
    bgColor: "bg-orange-500",
  },
];

export default function CollectionPage() {
  const [paymentMethods, setPaymentMethods] = useState<LinkedPaymentMethod[]>(
    initialPaymentMethods.map(pm => ({...pm, linked: false, upiId: ''}))
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  const { toast } = useToast();
  const auth = getAuth();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<{ paymentMethods?: { name: string, upiId: string }[] }>(userProfileRef);

  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const confirmationResult = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    if (userProfile && userProfile.paymentMethods) {
        setPaymentMethods(prevMethods => 
            initialPaymentMethods.map(pm => {
                const linked = userProfile.paymentMethods?.find(upm => upm.name === pm.name);
                return { 
                    ...pm, 
                    linked: !!linked, 
                    upiId: linked ? linked.upiId : '' 
                };
            })
        );
    } else {
        setPaymentMethods(initialPaymentMethods.map(pm => ({ ...pm, linked: false, upiId: '' })));
    }
  }, [userProfile]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  const setupRecaptcha = () => {
    if (!recaptchaVerifier.current) {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response: any) => {},
            'expired-callback': () => {}
        });
    }
    return recaptchaVerifier.current;
  }

  const handleLinkClick = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsDialogOpen(true);
    setOtpSent(false);
    setPhone("");
    setOtp("");
    setUpiId("");
    setCountdown(0);
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Phone Number" });
      return;
    }
    setIsOtpSending(true);
    try {
        const verifier = setupRecaptcha();
        const fullPhoneNumber = `+91${phone}`;
        const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        confirmationResult.current = result;
        setOtpSent(true);
        setCountdown(59);
        toast({
            title: "OTP Sent!",
            description: `OTP sent to ${fullPhoneNumber}.`,
        });
    } catch (error) {
        console.error("OTP send error:", error);
        toast({
            variant: "destructive",
            title: "Failed to send OTP",
            description: "Please try again later.",
        });
    } finally {
        setIsOtpSending(false);
    }
  };
  
  const validateUpi = (upi: string, methodName: string): boolean => {
    const upiRegexMap: { [key: string]: RegExp } = {
        "PhonePe": /^[a-zA-Z0-9.\-_]{2,256}@(ybl|ibl|axl)$/,
        "Paytm": /^[a-zA-Z0-9.\-_]{2,256}@(paytm|ptaxis|ptyes|ptsbi|pthdfc)$/,
        "MobiKwik": /^[a-zA-Z0-9.\-_]{2,256}@(ikwik|mbk)$/,
        "Freecharge": /^[a-zA-Z0-9.\-_]{2,256}@freecharge$/,
    };

    const regex = upiRegexMap[methodName];
    if (regex) {
        return regex.test(upi);
    }
    // Fallback for any other payment method
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
  }


  const handleLinkSubmit = async () => {
    if (!otp || !upiId) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please enter OTP and UPI ID." });
        return;
    }
    if (selectedMethod && !validateUpi(upiId, selectedMethod.name)) {
        toast({ 
            variant: "destructive", 
            title: "Invalid UPI ID", 
            description: `Please enter the correct UPI of ${selectedMethod.name}` 
        });
        return;
    }
    setIsLinking(true);
    try {
      if (!confirmationResult.current) {
        throw new Error("OTP not sent yet.");
      }
      await confirmationResult.current.confirm(otp);
      
      if (selectedMethod && userProfileRef) {
          const currentMethods = userProfile?.paymentMethods || [];
          const updatedMethods = [...currentMethods.filter(pm => pm.name !== selectedMethod.name), { name: selectedMethod.name, upiId: upiId }];
          
          await setDoc(userProfileRef, {
              paymentMethods: updatedMethods
          }, { merge: true });
      }

      toast({
        title: "Success!",
        description: `${selectedMethod?.name} has been linked successfully.`,
      });
      setIsDialogOpen(false);

    } catch (error) {
       console.error("Linking error:", error);
       toast({
        variant: "destructive",
        title: "Failed to link UPI",
        description: "The verification code is incorrect or another error occurred. Please try again.",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <div id="recaptcha-container"></div>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Add UPI</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Select the receiving UPI
        </h2>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.name}
              className={`flex h-20 w-full items-center justify-between gap-4 rounded-xl px-4 py-2 text-white shadow-md ${method.bgColor}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
                  <Image
                    src={method.logo}
                    alt={`${method.name} logo`}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div>
                  <span className="text-lg font-semibold">{method.name}</span>
                  {method.linked && method.upiId && (
                     <p className="text-xs font-mono text-white/80">{method.upiId}</p>
                  )}
                </div>
              </div>
              {method.linked ? (
                 <div className="flex items-center justify-center rounded-md bg-green-500/80 px-3 py-1.5 text-xs font-bold uppercase text-white">
                    ACTIVATED
                </div>
              ) : (
                <Button
                  onClick={() => handleLinkClick(method)}
                  className="rounded-full bg-white/20 px-6 font-semibold text-white shadow-sm hover:bg-white/30"
                >
                  Link
                </Button>
              )}
            </div>
          ))}
        </div>
      </main>

      {selectedMethod && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold">
                Link {selectedMethod.name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Enter your {selectedMethod.name} registered number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Phone Number"
                  className="h-12 text-base"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="otp">OTP</Label>
                <div className="relative flex items-center">
                  <Input
                    id="otp"
                    placeholder="Verification Code"
                    className="h-12 pr-28 text-base"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={!otpSent}
                  />
                   <Button 
                    type="button" 
                    variant="secondary" 
                    className={cn("absolute right-1.5 h-auto rounded-md bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30", (isOtpSending || countdown > 0) && "px-2")}
                    onClick={handleSendOtp}
                    disabled={isOtpSending || countdown > 0}
                  >
                    {isOtpSending ? <Loader size="xs" /> : (countdown > 0 ? `${countdown}s` : (otpSent ? "Resend" : "Send"))}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="upiId">Enter your {selectedMethod.name} UPI</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  className="h-12 text-base"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  type="text"
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                type="submit"
                onClick={handleLinkSubmit}
                className="w-full h-12 rounded-full btn-gradient font-bold text-base"
                disabled={isLinking || !otpSent || !otp || !upiId}
              >
                {isLinking && <Loader size="xs" className="mr-2" />}
                Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
