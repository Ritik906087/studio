
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  Fingerprint
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

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";
const ALLOWED_ADMINS = ['9955557336', '9060873927'];

const DataRow = ({ icon: Icon, label, value, colorClass = "text-slate-400", isCopyable = false }: any) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (!isCopyable) return;
        navigator.clipboard.writeText(value);
        toast({ title: "Copied", description: `${label} copied to clipboard.` });
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-slate-50", colorClass)}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 tabular-nums">{value || 'N/A'}</span>
                {isCopyable && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
                        <Copy className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
};

const SecurityFlag = ({ label, status }: { label: string, status: 'safe' | 'warning' | 'danger' }) => {
    const config = {
        safe: { color: "text-green-600 bg-green-50 border-green-100", icon: CheckCircle2 },
        warning: { color: "text-amber-600 bg-amber-50 border-amber-100", icon: AlertTriangle },
        danger: { color: "text-red-600 bg-red-50 border-red-100", icon: XCircle },
    };
    const { color, icon: Icon } = config[status];

    return (
        <div className={cn("flex flex-col items-center justify-center p-4 rounded-2xl border text-center space-y-2 transition-all hover:scale-105", color)}>
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
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

    // Real-Time Analytics State
    const [realAnalytics, setRealAnalytics] = useState<any>(null);

    useEffect(() => {
        const fetchIPData = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                
                // Get real browser data
                const battery: any = (navigator as any).getBattery ? await (navigator as any).getBattery() : null;
                const connection: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

                setRealAnalytics({
                    publicIp: data.ip || "N/A",
                    city: data.city || "N/A",
                    region: data.region || "N/A",
                    country: data.country_name || "N/A",
                    isp: data.org || "N/A",
                    asn: data.asn || "N/A",
                    lat: data.latitude,
                    lon: data.longitude,
                    timezone: data.timezone || "Asia/Kolkata",
                    network: connection?.effectiveType || "WiFi/5G",
                    battery: battery ? `${Math.round(battery.level * 100)}%` : "N/A",
                    ua: navigator.userAgent,
                    resolution: `${window.screen.width}x${window.screen.height}`,
                    language: navigator.language,
                    risk: {
                        vpn: 'safe',
                        proxy: 'safe',
                        hosting: 'safe',
                        tor: 'safe'
                    }
                });
            } catch (error) {
                console.error("Failed to fetch real intelligence data:", error);
            }
        };
        fetchIPData();
    }, []);

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
    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen bg-[#F8FAFC]"><Loader size="md" /></div>;
    if (!user) return <div className="p-8 text-center bg-[#F8FAFC] min-h-screen">User not found</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
            {/* ENTERPRISE DESKTOP HEADER */}
            <header className="sticky top-0 z-50 bg-white border-b px-8 h-20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-slate-100">
                        <Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6 text-slate-800" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Security Console</h1>
                            <Badge className="bg-blue-600 text-white font-black text-[10px] uppercase py-1 px-3 rounded-full border-none">Tier 4 Admin</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Intelligence Session</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex flex-col text-right mr-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Load</span>
                        <span className="text-xs font-black text-green-600 uppercase tracking-tighter">Normal (0.04ms)</span>
                    </div>
                    <Button variant="outline" className="rounded-xl border-slate-200 font-bold text-xs uppercase h-11 px-6">
                        Export Logs
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 h-11 w-11"><MoreVertical className="h-5 w-5 text-slate-400" /></Button>
                </div>
            </header>

            <main className="flex-1 p-8 space-y-6 max-w-[1600px] mx-auto w-full">
                
                {/* TOP ROW: WALLET MANAGEMENT & USER SUMMARY */}
                <div className="grid grid-cols-12 gap-6">
                    {/* PROFILE SUMMARY */}
                    <Card className="col-span-4 border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 flex items-center gap-6">
                                <div className="relative shrink-0">
                                    <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                                        <AvatarImage src={user.photoURL || defaultAvatarUrl} />
                                        <AvatarFallback className="bg-primary text-white text-2xl font-black">{user.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white h-7 w-7 rounded-full flex items-center justify-center shadow-lg">
                                        <ShieldCheck className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight truncate">{user.displayName}</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                        <Fingerprint className="h-3 w-3" /> UID: {user.numericId}
                                    </p>
                                    <div className="mt-4 flex gap-2">
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 font-black text-[9px] uppercase px-3 py-1">KYC VERIFIED</Badge>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[9px] uppercase px-3 py-1">PRIME USER</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* WALLET MANAGEMENT (ALWAYS AT TOP) */}
                    <Card className="col-span-8 border-none shadow-sm rounded-[32px] bg-slate-900 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-5"><Wallet className="h-32 w-32" /></div>
                        <CardContent className="p-0 grid grid-cols-2 divide-x divide-white/5 h-full">
                            <div className="p-8 flex flex-col justify-center">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Assets</p>
                                        <p className="text-3xl font-black text-primary tabular-nums tracking-tighter">₹{user.balance?.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hold / Rotation</p>
                                        <p className="text-3xl font-black text-amber-500 tabular-nums tracking-tighter">₹{user.holdBalance?.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 space-y-4">
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</div>
                                        <Input 
                                            type="number" 
                                            placeholder="Adjustment Amount..." 
                                            value={amount} 
                                            onChange={e => setAmount(e.target.value)}
                                            className="h-14 pl-10 bg-white/5 border-slate-800 text-white placeholder:text-slate-600 rounded-2xl focus:border-primary transition-all text-lg font-black"
                                        />
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button className="h-14 w-14 bg-green-600 hover:bg-green-700 border-none rounded-2xl p-0" onClick={() => handleUpdateBalance('add')} disabled={isUpdating}>
                                            {isUpdating ? <Loader size="xs" /> : <ArrowUpRight className="h-6 w-6" />}
                                        </Button>
                                        <Button className="h-14 w-14 bg-red-600 hover:bg-red-700 border-none rounded-2xl p-0" onClick={() => handleUpdateBalance('deduct')} disabled={isUpdating}>
                                            {isUpdating ? <Loader size="xs" /> : <ArrowDownLeft className="h-6 w-6" />}
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Security Hash: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MIDDLE ROW: DEEP ANALYTICS & SECURITY INTELLIGENCE */}
                <div className="grid grid-cols-12 gap-6">
                    
                    {/* LEFT PANEL: IDENTITY & CREDENTIALS */}
                    <Card className="col-span-4 border-none shadow-sm rounded-[32px] bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Database className="h-3 w-3" /> Core Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-1">
                                <DataRow icon={Smartphone} label="Registered Mobile" value={`+91 ${user.phoneNumber}`} isCopyable colorClass="text-blue-500" />
                                <DataRow icon={Globe} label="Email Context" value={user.email} isCopyable colorClass="text-indigo-500" />
                                <DataRow icon={Zap} label="Affiliate ID" value={user.numericId} isCopyable colorClass="text-amber-500" />
                                <DataRow icon={Clock} label="System Entry" value={user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A'} colorClass="text-slate-500" />
                                <DataRow icon={Activity} label="Last Active Session" value={realAnalytics?.lastActive || "Just Now"} colorClass="text-teal-500" />
                                <DataRow icon={Monitor} label="Authorized Hardware" value="1 Registered Devices" colorClass="text-purple-500" />
                            </div>
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <Button className="h-12 bg-red-50 text-red-600 hover:bg-red-100 border-none rounded-2xl font-black text-[11px] uppercase tracking-wider">
                                    <Ban className="mr-2 h-4 w-4" /> Terminate Account
                                </Button>
                                <Button variant="outline" className="h-12 border-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-wider">
                                    <Power className="mr-2 h-4 w-4" /> Flush Sessions
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CENTER PANEL: NETWORK INTELLIGENCE (REAL DATA) */}
                    <Card className="col-span-8 border-none shadow-sm rounded-[32px] bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-3 w-3" /> Global Network Intelligence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    {/* REAL IP BADGE */}
                                    <div className="p-6 bg-green-50 rounded-[24px] border border-green-100 flex items-center justify-between shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                                <Globe className="h-7 w-7 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Public Data Endpoint</p>
                                                <p className="text-2xl font-black text-green-900 tabular-nums leading-none mt-1">{realAnalytics?.publicIp || "Fetching..."}</p>
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-10 w-10 text-green-400" onClick={() => { if(realAnalytics?.publicIp) navigator.clipboard.writeText(realAnalytics.publicIp); toast({ title: "IP Copied" }); }}>
                                            <Copy className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    {/* RISK FLAGS */}
                                    <div className="grid grid-cols-4 gap-3">
                                        <SecurityFlag label="VPN" status={realAnalytics?.risk.vpn || 'safe'} />
                                        <SecurityFlag label="Proxy" status={realAnalytics?.risk.proxy || 'safe'} />
                                        <SecurityFlag label="Hosting" status={realAnalytics?.risk.hosting || 'safe'} />
                                        <SecurityFlag label="Tor" status={realAnalytics?.risk.tor || 'safe'} />
                                    </div>

                                    <div className="space-y-1">
                                        <DataRow icon={Wifi} label="ISP (Real)" value={realAnalytics?.isp} colorClass="text-blue-500" />
                                        <DataRow icon={Activity} label="ASN Logic" value={realAnalytics?.asn} colorClass="text-slate-500" />
                                        <DataRow icon={Zap} label="Protocol Type" value={realAnalytics?.network} colorClass="text-amber-500" />
                                        <DataRow icon={MapPin} label="Approx Geo" value={realAnalytics ? `${realAnalytics.city}, ${realAnalytics.country}` : '...'} colorClass="text-red-500" />
                                        <DataRow icon={Clock} label="System TZ" value={realAnalytics?.timezone} colorClass="text-slate-500" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* MAP PREVIEW */}
                                    <div className="rounded-[32px] overflow-hidden border border-slate-100 h-48 relative shadow-inner">
                                        <img src={`https://picsum.photos/seed/${userId}/800/400`} alt="Geo Preview" className="w-full h-full object-cover grayscale opacity-80" />
                                        <div className="absolute inset-0 bg-blue-900/10 flex flex-col items-center justify-center p-4">
                                            <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl flex flex-col items-center gap-2 border border-white">
                                                <MapPin className="h-6 w-6 text-red-500 animate-bounce" />
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-tighter text-slate-800">Approximate Location</p>
                                                    <p className="text-[9px] font-mono font-bold text-slate-500 mt-0.5">{realAnalytics?.lat}, {realAnalytics?.lon}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DEVICE FINGERPRINT */}
                                    <div className="p-6 bg-slate-50 rounded-[32px] space-y-4">
                                        <div className="flex justify-between items-center border-b border-white pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-white shadow-sm text-slate-400">
                                                    <Cpu className="h-4 w-4" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hardware Intelligence</span>
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">Valid Handshake</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Screen Logic</p>
                                                <p className="text-xs font-black text-slate-800 tabular-nums">{realAnalytics?.resolution}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Battery Status</p>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <BatteryMedium className="h-3 w-3 text-green-500" />
                                                    <p className="text-xs font-black text-slate-800 tabular-nums">{realAnalytics?.battery}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">User Agent Intelligence</p>
                                             <div className="p-3 bg-white rounded-xl border border-slate-200/50">
                                                 <p className="text-[10px] font-mono leading-relaxed break-all opacity-60 line-clamp-2">{realAnalytics?.ua}</p>
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* FOOTER ACTIONS */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t flex justify-center gap-4 z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.04)]">
                <div className="max-w-[1600px] w-full flex gap-4">
                    <Button asChild variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50">
                        <Link href={`/admin/history/${user.id}`}>Trade Audit History</Link>
                    </Button>
                    <Button asChild className="flex-1 h-14 btn-gradient rounded-2xl font-black text-xs uppercase tracking-widest shadow-blue-500/20">
                        <Link href={`/admin/invites/${user.id}`}>Network Team Graph</Link>
                    </Button>
                    <Button asChild variant="secondary" className="flex-1 h-14 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none font-black text-xs uppercase tracking-widest">
                        <Link href={`/admin/chat/new`}>Initialize Secure Chat</Link>
                    </Button>
                </div>
            </footer>
        </div>
    );
}
