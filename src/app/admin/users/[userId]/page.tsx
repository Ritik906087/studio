
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Copy, 
  ShieldCheck, 
  Globe, 
  Smartphone, 
  User as UserIcon, 
  Wallet, 
  Zap, 
  MapPin, 
  Activity, 
  Lock, 
  Power, 
  Ban,
  Cpu,
  Monitor,
  BatteryMedium,
  Wifi,
  History,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader } from '@/components/ui/loader';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";
const ALLOWED_ADMINS = ['9955557336', '9060873927'];

// Sub-component for a data row with an icon
const DataRow = ({ icon: Icon, label, value, colorClass = "text-slate-400", isCopyable = false }: any) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (!isCopyable) return;
        navigator.clipboard.writeText(value);
        toast({ title: "Copied", description: `${label} copied to clipboard.` });
    };

    return (
        <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 group">
            <div className="flex items-center gap-3">
                <div className={cn("p-1.5 rounded-lg bg-slate-50", colorClass)}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 tabular-nums">{value || 'N/A'}</span>
                {isCopyable && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
                        <Copy className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
};

// Sub-component for security flags
const SecurityFlag = ({ label, status }: { label: string, status: 'safe' | 'warning' | 'danger' }) => {
    const config = {
        safe: { color: "text-green-600 bg-green-50 border-green-100", icon: CheckCircle2 },
        warning: { color: "text-amber-600 bg-amber-50 border-amber-100", icon: AlertTriangle },
        danger: { color: "text-red-600 bg-red-50 border-red-100", icon: XCircle },
    };
    const { color, icon: Icon } = config[status];

    return (
        <div className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border text-center space-y-1.5", color)}>
            <Icon className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
        </div>
    );
};

export default function UserDetailsPage() {
    const params = useParams();
    const userId = params.userId as string;
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Mock analytics data - in production these would come from an IP Intelligence API and Device SDK
    const analytics = useMemo(() => ({
        publicIp: "103.15.244.112",
        localIp: "192.168.1.45",
        isp: "Reliance Jio Infocomm",
        asn: "AS55836",
        network: "WiFi / 5G",
        deviceId: "A-549XJ-2024",
        deviceFingerprint: "sha256:8f43...9e21",
        deviceModel: "Samsung Galaxy S23 Ultra",
        androidVersion: "14 (OneUI 6.1)",
        browser: "Chrome Mobile 122.0",
        resolution: "1440 x 3088 px",
        battery: "82%",
        appVersion: "v4.0.1 (Build 109)",
        location: "Mumbai, Maharashtra, IN",
        coords: "19.0760° N, 72.8777° E",
        simCountry: "India (IN)",
        timezone: "Asia/Kolkata (GMT+5:30)",
        language: "English / Hindi",
        lastActive: "2 minutes ago",
        risk: {
            vpn: 'safe',
            proxy: 'safe',
            hosting: 'safe',
            tor: 'safe'
        } as const
    }), []);

    useEffect(() => {
        const sessionStr = localStorage.getItem('flex_admin_session');
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                if (session.authenticated && ALLOWED_ADMINS.includes(session.masterId) && session.expires > Date.now()) {
                    setIsAdmin(true);
                } else {
                    router.replace('/admin/key');
                    return;
                }
            } catch (e) {
                router.replace('/admin/key');
                return;
            }
        } else {
            router.replace('/admin/key');
            return;
        }

        if (!firestore || !userId) return;

        const unsub = onSnapshot(doc(firestore, 'users', userId), (snap) => {
            if (snap.exists()) {
                setUser({ id: snap.id, ...snap.data() });
            }
            setLoading(false);
        }, (err) => {
            console.error("User Detail Listener Error:", err);
            setLoading(false);
        });

        return () => unsub();
    }, [firestore, userId, router]);

    const handleUpdateBalance = async (type: 'add' | 'deduct') => {
        const val = parseFloat(amount);
        if (!val || val <= 0) return;
        if (!firestore || !user) return;

        setIsUpdating(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.id);
                const userSnap = await transaction.get(userRef);
                const currentBalance = userSnap.data()?.balance || 0;
                const newBalance = type === 'add' ? currentBalance + val : currentBalance - val;

                if (newBalance < 0) throw new Error("Insufficient balance");

                transaction.update(userRef, { balance: newBalance });
                
                const txRef = doc(collection(firestore, 'users', user.id, 'transactions'));
                transaction.set(txRef, {
                    userId: user.id,
                    amount: val,
                    type: 'system_adjustment',
                    description: `Admin ${type === 'add' ? 'Added' : 'Deducted'} Balance`,
                    createdAt: serverTimestamp(),
                    orderId: `ADJ${Date.now()}`
                });
            });
            toast({ title: "Success", description: "Balance updated successfully." });
            setAmount('');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsUpdating(false);
        }
    };

    if (!isAdmin) return null;
    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen bg-[#F5F7FB]"><Loader size="md" /></div>;
    if (!user) return <div className="p-8 text-center bg-[#F5F7FB] min-h-screen">User not found</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F7FB] pb-24">
            {/* ANDROID STICKY HEADER */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 -ml-2 rounded-full">
                        <Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6 text-slate-800" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-base font-black text-slate-800 tracking-tight leading-none">User Intelligence</h1>
                        <div className="flex items-center gap-1.5 mt-1">
                             <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Session</span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-5 w-5 text-slate-400" /></Button>
            </header>

            <main className="flex-1 p-3 space-y-4 max-w-2xl mx-auto w-full">
                
                {/* PROFILE OVERVIEW CARD */}
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 flex flex-col items-center">
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                                    <AvatarImage src={user.photoURL || defaultAvatarUrl} />
                                    <AvatarFallback className="bg-primary text-white text-2xl font-black">{user.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white h-6 w-6 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="h-3.5 w-3.5 text-white" />
                                </div>
                            </div>
                            <h2 className="mt-4 text-xl font-black text-slate-800">{user.displayName}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">UID: {user.numericId}</p>
                            
                            <div className="mt-6 flex gap-2 w-full">
                                <Button className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border-none rounded-2xl font-black text-[11px] uppercase tracking-wider h-11">
                                    <Ban className="mr-2 h-4 w-4" /> Block User
                                </Button>
                                <Button variant="outline" className="flex-1 border-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-wider h-11">
                                    <Power className="mr-2 h-4 w-4" /> Logout Dev
                                </Button>
                            </div>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-4 border-t border-slate-50">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Balance</p>
                                <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">₹{user.balance?.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Rotation</p>
                                <p className="text-2xl font-black text-amber-500 tabular-nums tracking-tighter">₹{user.holdBalance?.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* USER DATA ACCORDION */}
                <Accordion type="multiple" defaultValue={['basic', 'network']} className="space-y-3">
                    
                    {/* BASIC INFO SECTION */}
                    <AccordionItem value="basic" className="border-none bg-white rounded-[24px] shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-50 text-primary">
                                    <UserIcon className="h-5 w-5" />
                                </div>
                                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">Basic Credentials</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5">
                            <div className="space-y-1">
                                <DataRow icon={Smartphone} label="Mobile Number" value={`+91 ${user.phoneNumber}`} isCopyable colorClass="text-blue-500" />
                                <DataRow icon={Globe} label="Email Context" value={user.email} isCopyable colorClass="text-indigo-500" />
                                <DataRow icon={Zap} label="Referral Code" value={user.numericId} isCopyable colorClass="text-amber-500" />
                                <DataRow icon={Clock} label="Member Since" value={user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'} colorClass="text-slate-500" />
                                <DataRow icon={Activity} label="Last Login" value={analytics.lastActive} colorClass="text-teal-500" />
                                <DataRow icon={Monitor} label="Linked Devices" value="1 Devices" colorClass="text-purple-500" />
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* NETWORK & SECURITY SECTION */}
                    <AccordionItem value="network" className="border-none bg-white rounded-[24px] shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-green-50 text-green-600">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">Network Intelligence</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5 space-y-4">
                            {/* PUBLIC IP HIGHLIGHT */}
                            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <Globe className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Public IP Address</p>
                                        <p className="text-base font-black text-green-900 tabular-nums">{analytics.publicIp}</p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => { navigator.clipboard.writeText(analytics.publicIp); toast({ title: "IP Copied" }); }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* RISK GRID */}
                            <div className="grid grid-cols-4 gap-2">
                                <SecurityFlag label="VPN" status={analytics.risk.vpn} />
                                <SecurityFlag label="Proxy" status={analytics.risk.proxy} />
                                <SecurityFlag label="Hosting" status={analytics.risk.hosting} />
                                <SecurityFlag label="Tor" status={analytics.risk.tor} />
                            </div>

                            <div className="space-y-1">
                                <DataRow icon={Wifi} label="ISP Provider" value={analytics.isp} colorClass="text-blue-500" />
                                <DataRow icon={Activity} label="ASN Number" value={analytics.asn} colorClass="text-slate-500" />
                                <DataRow icon={Zap} label="Network Type" value={analytics.network} colorClass="text-amber-500" />
                                <DataRow icon={MapPin} label="Approx. Geo" value={analytics.location} colorClass="text-red-500" />
                                <DataRow icon={History} label="SIM Region" value={analytics.simCountry} colorClass="text-indigo-500" />
                                <DataRow icon={Clock} label="Local Timezone" value={analytics.timezone} colorClass="text-slate-500" />
                            </div>

                            {/* SMALL MAP PREVIEW */}
                            <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100 h-28 relative grayscale opacity-70">
                                <img src="https://picsum.photos/seed/location/600/200" alt="Map Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                    <div className="bg-white/90 p-2 rounded-lg shadow-lg flex items-center gap-2">
                                        <MapPin className="h-3 w-3 text-red-500" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">Encrypted Coords</span>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* HARDWARE & DEVICE SECTION */}
                    <AccordionItem value="hardware" className="border-none bg-white rounded-[24px] shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">Hardware Analytics</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5 space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center border-b border-white pb-3">
                                    <div className="flex items-center gap-2">
                                        <Cpu className="h-4 w-4 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Device Fingerprint</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-800">{analytics.deviceFingerprint}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Model</p>
                                        <p className="text-xs font-black text-slate-800">{analytics.deviceModel}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">OS Version</p>
                                        <p className="text-xs font-black text-slate-800">{analytics.androidVersion}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <DataRow icon={Monitor} label="Browser" value={analytics.browser} colorClass="text-blue-500" />
                                <DataRow icon={Monitor} label="Resolution" value={analytics.resolution} colorClass="text-slate-500" />
                                <DataRow icon={BatteryMedium} label="Battery LVL" value={analytics.battery} colorClass="text-green-500" />
                                <DataRow icon={Zap} label="App Version" value={analytics.appVersion} colorClass="text-amber-500" />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* WALLET MANAGEMENT CARD */}
                <Card className="border-none shadow-sm rounded-[32px] bg-slate-900 text-white overflow-hidden mt-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Wallet Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 p-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Adjustment Amount (INR)</Label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</div>
                                <Input 
                                    type="number" 
                                    placeholder="Enter amount..." 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)}
                                    className="h-14 pl-10 bg-white/5 border-slate-800 text-white placeholder:text-slate-700 rounded-2xl focus:border-primary transition-all text-lg font-black"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button className="h-12 bg-green-600 hover:bg-green-700 border-none rounded-2xl font-black text-xs uppercase" onClick={() => handleUpdateBalance('add')} disabled={isUpdating}>
                                {isUpdating ? <Loader size="xs" /> : "Credit Balance"}
                            </Button>
                            <Button className="h-12 bg-red-600 hover:bg-red-700 border-none rounded-2xl font-black text-xs uppercase" onClick={() => handleUpdateBalance('deduct')} disabled={isUpdating}>
                                {isUpdating ? <Loader size="xs" /> : "Debit Balance"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </main>

            {/* ACTION FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex gap-3 max-w-2xl mx-auto w-full z-50">
                <Button asChild variant="outline" className="flex-1 h-12 rounded-2xl border-slate-200 font-black text-xs uppercase tracking-wider">
                    <Link href={`/admin/history/${user.id}`}>Trade History</Link>
                </Button>
                <Button asChild className="flex-1 h-12 btn-gradient rounded-2xl font-black text-xs uppercase tracking-wider">
                    <Link href={`/admin/invites/${user.id}`}>Team Graph</Link>
                </Button>
            </footer>
        </div>
    );
}

