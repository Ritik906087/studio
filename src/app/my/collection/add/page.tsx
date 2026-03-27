
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Landmark } from "lucide-react";
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
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/lib/supabase';
import { Loader } from "@/components/ui/loader";
import { ScrollArea } from "@/components/ui/scroll-area";


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
  const [isUpiDialogOpen, setIsUpiDialogOpen] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [upiId, setUpiId] = useState("");

  // Bank form state
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const { toast } = useToast();
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState<{phoneNumber: string} | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if(user) {
        const {data} = await supabase.from('users').select('phoneNumber').eq('id', user.id).single();
        setUserProfile(data);
      }
    }
    fetchProfile();
  }, [user]);

  const specialBankUsers = ['7050396570', '7307081891', '9798630209', '9965567336', '9199604613', '9955557336'];
  const showBankOption = userProfile?.phoneNumber && specialBankUsers.includes(userProfile.phoneNumber);
  

  const handleUpiLinkClick = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsUpiDialogOpen(true);
    setUpiId("");
  };
  
  const handleBankLinkClick = () => {
    setIsBankDialogOpen(true);
    setAccountHolderName('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
  }

  const validateUpi = (upi: string, methodName: string): boolean => {
    const upiLower = upi.toLowerCase();
    const upiRegexMap: { [key: string]: RegExp } = {
        "PhonePe": /^[a-z0-9.\-_]{2,256}@(ybl|ibl|axl)$/,
        "Paytm": /^[a-z0-9.\-_]{2,256}@(paytm|ptaap|ptpy|pthdfc|ptsbi|ptaxis|ptyes)$/,
        "MobiKwik": /^[a-z0-9.\-_]{2,256}@(ikwik|mbk|mbkns)$/,
        "Freecharge": /^[a-z0-9.\-_]{2,256}@(freecharge|axisbank)$/,
    };

    const regex = upiRegexMap[methodName];
    if (regex) {
        return regex.test(upiLower);
    }
    return /^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/.test(upiLower);
  }

  const handleLinkSubmit = async (methodData: any) => {
    if (!user) {
        toast({ variant: "destructive", title: "You are not logged in.", description: "Please log in and try again." });
        return;
    }

    setIsLinking(true);
    try {
        const { data: userProfile, error: fetchError } = await supabase
            .from('users')
            .select('paymentMethods')
            .eq('id', user.id)
            .single();

        if(fetchError) throw fetchError;

        const currentMethods = userProfile?.paymentMethods || [];
        const isDuplicate = currentMethods.some((pm: any) => (pm.upiId && pm.upiId === methodData.upiId) || (pm.accountNumber && pm.accountNumber === methodData.accountNumber));
        if (isDuplicate) {
            throw new Error(methodData.type === 'upi' ? "This UPI ID is already linked." : "This Bank Account is already linked.");
        }
        
        const updatedMethods = [...currentMethods, methodData];

        const { error: updateError } = await supabase
            .from('users')
            .update({ paymentMethods: updatedMethods })
            .eq('id', user.id);
        
        if (updateError) throw updateError;
      
      toast({
        title: "Success!",
        description: `${methodData.name} has been linked successfully.`,
      });
      setIsUpiDialogOpen(false);
      setIsBankDialogOpen(false);

    } catch (error: any) {
       console.error("Linking error:", error);
       toast({
        variant: "destructive",
        title: "Failed to link method",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
        setIsLinking(false);
    }
  };

  const handleUpiFormSubmit = () => {
    if (!selectedMethod) return;
    if (!validateUpi(upiId, selectedMethod.name)) {
        toast({ 
            variant: "destructive", 
            title: "Invalid UPI ID", 
            description: `Please enter a valid UPI ID for ${selectedMethod.name}` 
        });
        return;
    }
    handleLinkSubmit({ type: 'upi', name: selectedMethod.name, upiId });
  }
  
  const handleBankFormSubmit = () => {
    if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please fill all bank details." });
        return;
    }
     handleLinkSubmit({
        type: 'bank',
        name: bankName,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode
     });
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my/collection">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Add Payment Method</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        {showBankOption && (
            <>
                <h2 className="text-sm font-semibold text-muted-foreground">Link Bank Account</h2>
                <div
                    onClick={handleBankLinkClick}
                    className="flex h-20 w-full items-center justify-between gap-4 rounded-xl px-4 py-2 text-white shadow-md bg-slate-700 cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
                            <Landmark className="h-6 w-6 text-slate-700"/>
                        </div>
                        <div>
                        <span className="text-lg font-semibold">Bank Account</span>
                        </div>
                    </div>
                    <Button className="rounded-full bg-white/20 px-6 font-semibold text-white shadow-sm hover:bg-white/30">
                        Link
                    </Button>
                </div>
            </>
        )}
        <h2 className="text-sm font-semibold text-muted-foreground pt-2">
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
                  onClick={() => handleUpiLinkClick(method)}
                  className="rounded-full bg-white/20 px-6 font-semibold text-white shadow-sm hover:bg-white/30"
                >
                  Link
                </Button>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* UPI Dialog */}
      {selectedMethod && (
        <Dialog open={isUpiDialogOpen} onOpenChange={setIsUpiDialogOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold">
                Link {selectedMethod.name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                 <Label htmlFor="upiId">Enter your {selectedMethod.name} UPI</Label>
                <Input id="upiId" placeholder="yourname@upi" className="h-12 text-base" value={upiId} onChange={(e) => setUpiId(e.target.value)} type="text" />
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button type="submit" onClick={handleUpiFormSubmit} className="w-full h-12 rounded-full btn-gradient font-bold text-base" disabled={isLinking || !upiId}>
                {isLinking && <Loader size="xs" className="mr-2" />}
                Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bank Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle className="text-center text-xl font-bold">Link Bank Account</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="grid gap-4 p-6">
                  <div className="grid gap-2">
                    <Label>Account Holder Name</Label>
                    <Input placeholder="Full Name" className="h-12" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Bank Name</Label>
                    <Input placeholder="e.g., State Bank of India" className="h-12" value={bankName} onChange={e => setBankName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Account Number</Label>
                    <Input placeholder="Bank Account Number" className="h-12" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>IFSC Code</Label>
                    <Input placeholder="IFSC Code" className="h-12" value={ifscCode} onChange={e => setIfscCode(e.target.value)} />
                  </div>
                </div>
            </ScrollArea>
            <DialogFooter className="sm:justify-center p-6 pt-4 border-t">
              <Button type="submit" onClick={handleBankFormSubmit} className="w-full h-12 rounded-full btn-gradient font-bold text-base" disabled={isLinking || !accountNumber}>
                {isLinking && <Loader size="xs" className="mr-2" />}
                Link Bank Account
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
