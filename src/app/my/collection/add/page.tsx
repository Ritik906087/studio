
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
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, signOut } from "firebase/auth";
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, runTransaction } from 'firebase/firestore';
import { Loader } from "@/components/ui/loader";


type PaymentMethod = {
  name: string;
  logo: string;
  bgColor: string;
  maintenance?: boolean;
};

const initialPaymentMethods: PaymentMethod[] = [
  { name: "PhonePe", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Phonepay.png?alt=media&token=579a228d-121f-4d5b-933d-692d791dec2f", bgColor: "bg-violet-600" },
  { name: "Paytm", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download%20(2).png?alt=media&token=1fd9f09a-1f02-4dd9-ab3b-06c756856bd8", bgColor: "bg-sky-500" },
  { name: "MobiKwik", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/MobiKwik.png?alt=media&token=bf924e98-9b78-459d-8eb7-396c305a11d7", bgColor: "bg-blue-600" },
  { name: "Freecharge", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/download.png?alt=media&token=fab572ac-b45e-4c62-8276-8c87108756e4", bgColor: "bg-orange-500" },
  { name: "Airtel", logo: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/Airtel%2001.png?alt=media&token=357342fd-85df-43c1-a7fb-d9d57315df1d", bgColor: "bg-red-500", maintenance: true },
];

export default function AddCollectionPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
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

  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const confirmationResult = useRef<ConfirmationResult | null>(null);

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
        "Paytm": /^[a-zA-Z0-9.\-_]{2,256}@(ptaap|ptpy|pthdfc|ptsbi|ptaxis)$/,
        "MobiKwik": /^[a-zA-Z0-9.\-_]{2,256}@(ikwik|mbk|mbkns)$/,
        "Freecharge": /^[a-zA-Z0-9.\-_]{2,256}@(freecharge|axisbank)$/,
        "Airtel": /^[a-zA-Z0-9.\-_]{2,256}@airtel$/,
    };

    const regex = upiRegexMap[methodName];
    if (regex) {
        return regex.test(upi);
    }
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
  }

  const handleLinkSubmit = async () => {
    // Capture the original user's UID at the start.
    if (!user) {
        toast({ variant: "destructive", title: "You are not logged in.", description: "Please log in and try again." });
        return;
    }
    const originalUserUid = user.uid;

    // --- Validations ---
    if (!otp || !upiId) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please enter OTP and UPI ID." });
        return;
    }
    if (selectedMethod && !validateUpi(upiId, selectedMethod.name)) {
        toast({ 
            variant: "destructive", 
            title: "Invalid UPI ID", 
            description: `Please enter a valid UPI ID for ${selectedMethod.name}` 
        });
        return;
    }
    // --- End Validations ---

    setIsLinking(true);
    try {
      if (!confirmationResult.current) {
        throw new Error("OTP has not been sent yet. Please send OTP first.");
      }
      
      // This call might change the auth state if the phone number is associated with another account
      await confirmationResult.current.confirm(otp);
      
      // OTP is confirmed. Now, write to the ORIGINAL user's document.
      if (selectedMethod && firestore) {
          const userProfileRefForUpdate = doc(firestore, 'users', originalUserUid);

          await runTransaction(firestore, async (transaction) => {
              const userDoc = await transaction.get(userProfileRefForUpdate);
              if (!userDoc.exists()) {
                  throw new Error("Your user profile could not be found.");
              }

              const currentMethods = userDoc.data().paymentMethods || [];
              const isDuplicate = currentMethods.some((pm: any) => pm.upiId === upiId);
              if (isDuplicate) {
                  throw new Error("This UPI ID is already linked to your account.");
              }

              const updatedMethods = [...currentMethods, { name: selectedMethod.name, upiId: upiId }];
              
              transaction.set(userProfileRefForUpdate, {
                  paymentMethods: updatedMethods
              }, { merge: true });
          });
      }

      toast({
        title: "Success!",
        description: `${selectedMethod?.name} has been linked successfully. Please log in again.`,
      });
      
      // Log out the user after successful linking for security
      await signOut(auth);
      document.cookie = 'firebase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';

    } catch (error: any) {
       console.error("Linking error:", error);
       toast({
        variant: "destructive",
        title: "Failed to link UPI",
        description: error.message || "The verification code is incorrect or another error occurred. Please try again.",
      });
       setIsLinking(false); // Only set linking to false on error, success navigates away.
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <div id="recaptcha-container"></div>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my/collection">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Add UPI</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Select the receiving UPI to link
        </h2>
        <div className="space-y-3">
          {initialPaymentMethods.map((method) => (
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
                </div>
              </div>
              {method.maintenance ? (
                  <div className="rounded-md bg-orange-100 px-3 py-1.5 text-xs font-bold uppercase text-orange-600">
                      Maintenance
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
