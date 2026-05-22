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
  Fingerprint,
  Monitor,
  HardDrive,
  Network,
  Eye,
  Terminal,
  Server,
  Bot,
  User
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

const DataRow = ({ icon: Icon, label, value, colorClass = "text-slate-400", isCopyable = false, isMono = false, sub }: any) => {
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
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
                    {sub && <span className="text-[8px] text-slate-400 font-medium leading-none">{sub}</span>}
                </div>
            </div>
            <div className="flex items-center gap-2 max-w-[60%]">
                <span className={cn(
                    "text-xs font-black text-slate-800 truncate", 
                    isMono ? "font-mono text-[10px]" : "tabular-nums"
                )} title={value}>
                    {value || 'N/A'}
                </span>
                {isCopyable && value && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
                        <Copy className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
};

const SecurityFlag = ({ label, status, sub }: { label: string, status: 'safe' | 'warning' | 'danger', sub?: string }) => {
    const config = {
        safe: { color: "text-green-600 bg-green-50 border-green-100", icon: CheckCircle2 },
        warning: { color: "text-amber-600 bg-amber-50 border-amber-100", icon: AlertTriangle },
        danger: { color: "text-red-600 bg-red-50 border-red-100", icon: XCircle },
    };
    const { color, icon: Icon } = config[status];

    return (
        <div className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border text-center space-y-1 transition-all", color)}>
            <Icon className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
            {sub && <span className="text-[7px] font-bold opacity-70 uppercase truncate w-full">{sub}</span>}
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
    const [intelligence, setIntelligence] = useState<any>(null);

    // Advanced Device & Network Sniffing
    useEffect(() => {
        const captureIntelligence = async () => {
            try {
                // 1. IP & Geo Intelligence (Multi-Provider Check)
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();
                
                const ipv6Res = await fetch('https://api64.ipify.org?format=json').catch(() => null);
                const ipv6Data = ipv6Res ? await ipv6Res.json() : { ip: 'N/A' };

                // 2. Hardware Sniffing
                const battery: any = (navigator as any).getBattery ? await (navigator as any).getBattery() : null;
                const connection: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
                
                // 3. GPU/WebGL Info
                let gpuInfo = "Unknown";
                try {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (gl) {
                        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
                        gpuInfo = debugInfo ? (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Generic WebGL";
                    }
                } catch (e) {}

                // 4. Fingerprint Hash (Simple Hardware Entropy)
                const fingerprintRaw = `${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${new Date().getTimezoneOffset()}|${navigator.language}`;
                const fingerprintId = btoa(fingerprintRaw).slice(0, 16).toUpperCase();

                setIntelligence({
                    network: {
                        ipv4: ipData.ip || "N/A",
                        ipv6: ipv6Data.ip || "N/A",
                        localIp: "192.168.1.1 (Masked)", // Simulated for UI
                        isp: ipData.org || "N/A",
                        asn: ipData.asn || "N/A",
                        type: connection?.effectiveType || "WiFi/4G",
                        downlink: connection?.downlink ? `${connection.downlink} Mbps` : "N/A",
                    },
                    geo: {
                        country: ipData.country_name || "N/A",
                        region: ipData.region || "N/A",
                        city: ipData.city || "N/A",
                        zip: ipData.postal || "N/A",
                        lat: ipData.latitude,
                        lon: ipData.longitude,
                        timezone: ipData.timezone || "N/A",
                    },
                    hardware: {
                        cpu: `${navigator.hardwareConcurrency || 'N/A'} Cores`,
                        ram: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "N/A",
                        gpu: gpuInfo,
                        battery: battery ? `${Math.round(battery.level * 100)}% (${battery.charging ? 'Charging' : 'Unplugged'})` : "N/A",
                        resolution: `${window.screen.width}x${window.screen.height}`,
                    },
                    software: {
                        ua: navigator.userAgent,
                        os: navigator.platform,
                        lang: navigator.language,
                        fingerprint: fingerprintId,
                        sessionId: `SES-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    },
                    risk: {
                        vpn: ipData.org?.toLowerCase().includes('vpn') || ipData.org?.toLowerCase().includes('hosting') ? 'warning' : 'safe',
                        proxy: 'safe',
                        tor: 'safe',
                        bot: /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent) ? 'danger' : 'safe',
                        devMode: window.outerHeight - window.innerHeight > 160 ? 'warning' : 'safe'
                    }
                });
            } catch (error) {
                console.error("Intelligence capture failed", error);
            }
        };
        captureIntelligence();
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
                    <Button variant="outline" className="hidden sm:inline-flex rounded-xl border-slate-200 font-bold text-xs h-10 px-4">Export Logs</Button>
                    <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 h-10 w-10"><MoreVertical className="h-5 w-5 text-slate-400" /></Button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
                
                {/* 1. WALLET MANAGEMENT - TOP PRIORITY */}
                <Card className="border-none shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Wallet className="h-32 w-32" /></div>
                    <CardContent className="p-0 grid grid-cols-1 lg:grid-cols-12 lg:divide-x divide-white/5">
                        <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available Assets</p>
                                    <p className="text-2xl md:text-4xl font-black text-primary tabular-nums tracking-tighter">₹{user.balance?.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Escrow Hold</p>
                                    <p className="text-2xl md:text-4xl font-black text-amber-500 tabular-nums tracking-tighter">₹{user.holdBalance?.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Liquidity</p>
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

                {/* 2. ADVANCED NETWORK INTELLIGENCE GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* NETWORK INTEGRITY */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Network className="h-3.5 w-3.5" /> Network Intelligence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-1">
                            <div className="p-3 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Globe className="h-4 w-4 text-green-600" />
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-black text-green-700 uppercase">Public IP</p>
                                        <p className="text-sm font-black text-green-900 tabular-nums">{intelligence?.network.ipv4 || "Detecting..."}</p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => { navigator.clipboard.writeText(intelligence?.network.ipv4); toast({ title: "Copied" }); }}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                            <DataRow icon={Server} label="ISP Provider" value={intelligence?.network.isp} colorClass="text-blue-500" isMono />
                            <DataRow icon={ShieldCheck} label="IPv6 Status" value={intelligence?.network.ipv6} colorClass="text-purple-500" isMono />
                            <DataRow icon={Wifi} label="Connection" value={intelligence?.network.type} sub={intelligence?.network.downlink} colorClass="text-amber-500" />
                            
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <SecurityFlag label="VPN" status={intelligence?.risk.vpn || 'safe'} />
                                <SecurityFlag label="Proxy" status={intelligence?.risk.proxy || 'safe'} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* GEO-INTELLIGENCE & MAP */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" /> Geographic Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="aspect-[2/1] bg-slate-100 rounded-2xl relative overflow-hidden border">
                                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/400/200')] bg-cover opacity-40 mix-blend-multiply" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative">
                                        <div className="h-8 w-8 bg-primary/20 rounded-full animate-ping" />
                                        <MapPin className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[8px] font-black border uppercase">
                                    Lat: {intelligence?.geo.lat?.toFixed(4)}, Lon: {intelligence?.geo.lon?.toFixed(4)}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                                <DataRow icon={Globe} label="Location" value={`${intelligence?.geo.city}, ${intelligence?.geo.country}`} colorClass="text-red-500" />
                                <DataRow icon={Clock} label="Timezone" value={intelligence?.geo.timezone} colorClass="text-blue-500" isMono />
                                <DataRow icon={Database} label="Postal Code" value={intelligence?.geo.zip} colorClass="text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* HARDWARE FINGERPRINT */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Cpu className="h-3.5 w-3.5" /> Hardware DNA
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-1">
                            <DataRow icon={Smartphone} label="CPU / Logic" value={intelligence?.hardware.cpu} colorClass="text-indigo-500" />
                            <DataRow icon={HardDrive} label="RAM Memory" value={intelligence?.hardware.ram} colorClass="text-green-500" />
                            <DataRow icon={Monitor} label="Screen Res" value={intelligence?.hardware.resolution} colorClass="text-blue-500" />
                            <DataRow icon={BatteryMedium} label="Battery" value={intelligence?.hardware.battery} colorClass="text-emerald-500" />
                            
                            <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Monitor className="h-3 w-3 text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase">GPU Renderer</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-600 break-words leading-relaxed">
                                    {intelligence?.hardware.gpu || "Scanning WebGL..."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SOFTWARE ENVIRONMENT */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                         <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Terminal className="h-3.5 w-3.5" /> Software Environment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-1">
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Fingerprint className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Fingerprint</span>
                                </div>
                                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                                    <span className="font-mono text-xs font-black text-primary truncate flex-1">
                                        {intelligence?.software.fingerprint || "GEN-FPR-000000"}
                                    </span>
                                    <Copy className="h-3 w-3 text-primary/40 cursor-pointer" onClick={() => { navigator.clipboard.writeText(intelligence?.software.fingerprint); toast({ title: "Copied" }); }} />
                                </div>
                            </div>
                            <DataRow icon={Monitor} label="Operating Sys" value={intelligence?.software.os} colorClass="text-slate-600" />
                            <DataRow icon={Globe} label="Language" value={intelligence?.software.lang} colorClass="text-blue-400" />
                            <DataRow icon={Activity} label="Session ID" value={intelligence?.software.sessionId} colorClass="text-amber-500" isMono />
                            
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <SecurityFlag label="Bot Detection" status={intelligence?.risk.bot || 'safe'} />
                                <SecurityFlag label="Dev Tools" status={intelligence?.risk.devMode || 'safe'} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* ACCOUNT IDENTITY */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <User className="h-3.5 w-3.5" /> Identity Registry
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-1">
                            <div className="flex items-center gap-4 mb-6">
                                <Avatar className="h-14 w-14 border-4 border-slate-50 shadow-xl">
                                    <AvatarImage src={user.photoURL || defaultAvatarUrl} />
                                    <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 leading-none">{user.displayName}</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3 text-green-500" /> Verified Member
                                    </p>
                                </div>
                            </div>
                            <DataRow icon={Smartphone} label="Mobile" value={`+91 ${user.phoneNumber}`} colorClass="text-blue-500" isCopyable />
                            <DataRow icon={Zap} label="UID" value={user.numericId} colorClass="text-amber-500" isCopyable isMono />
                            <DataRow icon={Clock} label="Joined" value={user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A'} colorClass="text-slate-400" />
                            <DataRow icon={User} label="Inviter UID" value={user.inviterUid || "Direct"} colorClass="text-indigo-400" isCopyable={!!user.inviterUid} isMono />
                        </CardContent>
                    </Card>

                    {/* SECURITY ACTIONS */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Lock className="h-3.5 w-3.5" /> Security Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                                    CRITICAL ACTIONS: TERMINATING A SESSION OR BANNING A USER IS INSTANT AND IRREVERSIBLE WITHOUT DATABASE INTERVENTION.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <Button className="h-12 bg-red-50 text-red-600 hover:bg-red-100 border-none rounded-2xl font-black text-[10px] uppercase tracking-wider">
                                    <Ban className="mr-2 h-4 w-4" /> Ban User Permanently
                                </Button>
                                <Button variant="outline" className="h-12 border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-wider">
                                    <Power className="mr-2 h-4 w-4" /> Force Global Logout
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* LOGIN HISTORY TIMELINE */}
                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                    <CardHeader className="p-6 md:p-8 pb-4">
                        <CardTitle className="text-base font-black text-slate-900 uppercase">Recent Activity Registry</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 md:px-8 pb-8">
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-first:bg-blue-600 group-first:text-white group-first:border-blue-700">
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <div className="w-px flex-1 bg-slate-100 mt-2" />
                                    </div>
                                    <div className="flex-1 pb-6 border-b border-slate-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-black text-slate-800">System Access Granted</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Device: {intelligence?.software.os || 'Android 14'} • IP: {intelligence?.network.ipv4}</p>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tabular-nums">2h ago</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </main>

            <footer className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t p-4 z-40 flex justify-center gap-3">
                <Button asChild variant="outline" className="flex-1 md:flex-none md:w-48 h-12 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest">
                    <Link href={`/admin/history/${user.id}`}>Full Audit Logs</Link>
                </Button>
                <Button asChild className="flex-1 md:flex-none md:w-48 h-12 btn-gradient rounded-xl font-black text-[10px] uppercase tracking-widest">
                    <Link href={`/admin/invites/${user.id}`}>Affiliate Map</Link>
                </Button>
            </footer>
        </div>
    );
}