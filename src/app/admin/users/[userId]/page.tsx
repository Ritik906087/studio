'use client';

import React, { useState, useEffect } from 'react';
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
  Wallet, 
  Zap, 
  MapPin, 
  Activity, 
  Lock, 
  Power, 
  Ban,
  Cpu,
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 opacity-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
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
        <div className={cn("flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl border text-center space-y-2 transition-all active:scale-95 md:hover:scale-105", color)}>
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">{label}</span>
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
    const [realAnalytics, setRealAnalytics] = useState<any>(null);

    useEffect(() => {
        const fetchIPData = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
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
                    risk: { vpn: 'safe', proxy: 'safe', hosting: 'safe', tor: 'safe' }
                });
            } catch (error) { console.error("Intel fetch failed", error); }
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
                } else { router.replace('/admin/key'); return; }
            } catch (e) { router.replace('/admin/key'); return; }
        } else { router.replace('/admin/key'); return; }

        if (!firestore || !userId) return;
        const unsub = onSnapshot(doc(firestore, 'users', userId), (snap) => {
            if (snap.exists()) setUser({ id: snap.id, ...snap.data() });
            setLoading(false);
        });
        return () => unsub();
    }, [firestore, userId, router]);

    const handleUpdateBalance = async (type: 'add' | 'deduct') => {
        const val = parseFloat(amount);
        if (!val || val <= 0 || isNaN(val)) return;
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
        } catch (e: any) { toast({ variant: 'destructive', title: "Error", description: e.message }); } finally { setIsUpdating(false); }
    };

    if (!isAdmin) return null;
    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen bg-[#F8FAFC]"><Loader size="md" /></div>;
    if (!user) return <div className="p-8 text-center bg-[#F8FAFC] min-h-screen">User not found</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC] pb-24">
            {/* RESPONSIVE HEADER */}
            <header className="sticky top-0 z-50 bg-white border-b px-4 md:px-8 h-16 md:h-20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 md:gap-6">
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-50">
                        <Link href="/admin/dashboard"><ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-slate-800" /></Link>
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm md:text-xl font-black text-slate-900 tracking-tight uppercase truncate">Audit Console</h1>
                            <Badge className="bg-blue-600 text-white font-black text-[8px] md:text-[10px] uppercase py-0.5 px-2 rounded-full border-none hidden xs:inline-flex">Tier 4</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="hidden sm:inline-flex rounded-xl border-slate-200 font-bold text-xs h-10 px-4">Export</Button>
                    <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 h-10 w-10"><MoreVertical className="h-5 w-5 text-slate-400" /></Button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
                
                {/* WALLET MANAGEMENT (STACKS ON MOBILE) */}
                <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Wallet className="h-32 w-32 md:h-40 md:w-40" /></div>
                    <CardContent className="p-0 grid grid-cols-1 lg:grid-cols-12 lg:divide-x divide-white/5">
                        <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-12">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available</p>
                                    <p className="text-2xl md:text-4xl font-black text-primary tabular-nums tracking-tighter">₹{user.balance?.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hold</p>
                                    <p className="text-2xl md:text-4xl font-black text-amber-500 tabular-nums tracking-tighter">₹{user.holdBalance?.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Assets</p>
                                    <p className="text-2xl md:text-4xl font-black text-white tabular-nums tracking-tighter">₹{(user.balance + user.holdBalance)?.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-5 p-6 md:p-10 space-y-4 bg-white/5">
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</div>
                                    <Input 
                                        type="number" 
                                        placeholder="Amount..." 
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)}
                                        className="h-12 md:h-16 pl-10 bg-black/40 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-primary transition-all text-base md:text-xl font-black"
                                    />
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button className="h-12 w-12 md:h-16 md:w-16 bg-green-600 hover:bg-green-700 rounded-xl p-0" onClick={() => handleUpdateBalance('add')} disabled={isUpdating}>
                                        {isUpdating ? <Loader size="xs" /> : <ArrowUpRight className="h-6 w-6 md:h-8 md:w-8" />}
                                    </Button>
                                    <Button className="h-12 w-12 md:h-16 md:w-16 bg-red-600 hover:bg-red-700 rounded-xl p-0" onClick={() => handleUpdateBalance('deduct')} disabled={isUpdating}>
                                        {isUpdating ? <Loader size="xs" /> : <ArrowDownLeft className="h-6 w-6 md:h-8 md:w-8" />}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Liquidity Adjustment Terminal</p>
                        </div>
                    </CardContent>
                </Card>

                {/* INFO GRID (1 COLUMN MOBILE, 2 COLUMN TABLET, 3 COLUMN DESKTOP) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* PROFILE SUMMARY */}
                    <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 flex items-center gap-4 md:gap-6">
                                <div className="relative shrink-0">
                                    <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-white shadow-xl">
                                        <AvatarImage src={user.photoURL || defaultAvatarUrl} />
                                        <AvatarFallback className="bg-primary text-white text-xl font-black">{user.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white h-6 w-6 rounded-full flex items-center justify-center shadow-lg">
                                        <ShieldCheck className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight truncate">{user.displayName}</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                        <Fingerprint className="h-3 w-3" /> {user.numericId}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 font-black text-[8px] uppercase px-2 py-0.5">KYC</Badge>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[8px] uppercase px-2 py-0.5">PRIME</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* IDENTITY PANEL */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Database className="h-3 w-3" /> Registry Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <DataRow icon={Smartphone} label="Mobile" value={`+91 ${user.phoneNumber}`} isCopyable colorClass="text-blue-500" />
                            <DataRow icon={Zap} label="Affiliate" value={user.numericId} isCopyable colorClass="text-amber-500" />
                            <DataRow icon={Clock} label="Joined" value={user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'} colorClass="text-slate-500" />
                        </CardContent>
                    </Card>

                    {/* ACTION CONTROLS */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white sm:col-span-2 lg:col-span-1">
                         <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Lock className="h-3 w-3" /> Security Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                             <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                                <Button className="h-12 bg-red-50 text-red-600 hover:bg-red-100 border-none rounded-xl font-black text-[10px] uppercase tracking-wider">
                                    <Ban className="mr-2 h-4 w-4" /> Terminate
                                </Button>
                                <Button variant="outline" className="h-12 border-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-wider">
                                    <Power className="mr-2 h-4 w-4" /> Flush Sess
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* NETWORK INTELLIGENCE (RESPONSIVE) */}
                <Card className="border-none shadow-sm rounded-[32px] bg-white">
                    <CardHeader className="p-6 md:p-10 pb-0">
                        <CardTitle className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Cyber Intelligence & Security Map
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 md:p-10 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                            <div className="space-y-6">
                                {/* REAL IP BADGE */}
                                <div className="p-5 md:p-6 bg-green-50 rounded-3xl border border-green-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                            <Globe className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-green-700 uppercase">Access Endpoint</p>
                                            <p className="text-lg md:text-2xl font-black text-green-900 tabular-nums truncate">{realAnalytics?.publicIp || "..."}</p>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-10 w-10 text-green-400" onClick={() => { if(realAnalytics?.publicIp) { navigator.clipboard.writeText(realAnalytics.publicIp); toast({ title: "Copied" }); } }}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-4 gap-2 md:gap-4">
                                    <SecurityFlag label="VPN" status={realAnalytics?.risk.vpn || 'safe'} />
                                    <SecurityFlag label="Proxy" status={realAnalytics?.risk.proxy || 'safe'} />
                                    <SecurityFlag label="Host" status={realAnalytics?.risk.hosting || 'safe'} />
                                    <SecurityFlag label="TOR" status={realAnalytics?.risk.tor || 'safe'} />
                                </div>

                                <div className="space-y-1">
                                    <DataRow icon={Wifi} label="ISP" value={realAnalytics?.isp} colorClass="text-blue-500" />
                                    <DataRow icon={MapPin} label="Geo" value={realAnalytics ? `${realAnalytics.city}, ${realAnalytics.country}` : '...'} colorClass="text-red-500" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                                    <div className="flex justify-between items-center border-b border-white pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white text-slate-400"><Cpu className="h-4 w-4" /></div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hardware</span>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Verified</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Resolution</p>
                                            <p className="text-xs font-black text-slate-800">{realAnalytics?.resolution}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Energy</p>
                                            <div className="flex items-center justify-end gap-1">
                                                <BatteryMedium className="h-3 w-3 text-green-500" />
                                                <p className="text-xs font-black text-slate-800">{realAnalytics?.battery}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white rounded-xl border border-slate-200/50">
                                         <p className="text-[9px] font-mono text-slate-400 break-all line-clamp-2">{realAnalytics?.ua}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* RESPONSIVE FOOTER ACTION BAR */}
            <footer className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t p-4 z-40 flex justify-center gap-3">
                <Button asChild variant="outline" className="flex-1 md:flex-none md:w-48 h-12 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest">
                    <Link href={`/admin/history/${user.id}`}>Audit Logs</Link>
                </Button>
                <Button asChild className="flex-1 md:flex-none md:w-48 h-12 btn-gradient rounded-xl font-black text-[10px] uppercase tracking-widest">
                    <Link href={`/admin/invites/${user.id}`}>Team Map</Link>
                </Button>
            </footer>
        </div>
    );
}
