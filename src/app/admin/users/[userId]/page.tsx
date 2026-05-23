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
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Network,
  Server,
  User,
  CreditCard,
  Landmark,
  BadgeCheck
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader } from '@/components/ui/loader';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/LG%20PAY%20AVATAR.png?alt=media&token=707ce79d-15fa-4e58-9d1d-a7d774cfe5ec";
const ALLOWED_ADMINS = ['9955557336', '9060873927'];

const providerLogos: Record<string, string> = {
  PhonePe: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(4).png",
  Paytm: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(5).png",
  MobiKwik: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(1).png",
  Freecharge: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(3).png",
  Airtel: "https://gcfmifxdqlcfmorsozek.supabase.co/storage/v1/object/public/Payment%20icons/download%20(2).png",
};

const DataRow = ({ icon: Icon, label, value, colorClass = "text-slate-400", isCopyable = false, isMono = false, sub }: any) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (!isCopyable || !value) return;
        navigator.clipboard.writeText(value);
        toast({ title: "Copied" });
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
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300" onClick={handleCopy}>
                        <Copy className="h-3 w-3" />
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
        <div className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border text-center space-y-1 transition-all", color)}>
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
            if (snap.exists()) {
                setUser({ id: snap.id, ...snap.data() });
            }
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
                    description: `Admin Adjustment`,
                    createdAt: serverTimestamp(),
                    orderId: `ADJ${Date.now()}`
                });
            });
            toast({ title: "Success" });
            setAmount('');
        } catch (e: any) { toast({ variant: 'destructive', title: "Error" }); } finally { setIsUpdating(false); }
    };

    if (!isAdmin) return null;
    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen"><Loader size="md" /></div>;
    if (!user) return <div className="p-8 text-center min-h-screen">User not found</div>;

    const intel = user.intelligence;
    const paymentMethods = user.paymentMethods || [];

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC] pb-24">
            <header className="sticky top-0 z-50 bg-white border-b px-4 md:px-8 h-16 md:h-20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50">
                        <Link href="/admin/dashboard"><ChevronLeft className="h-5 w-5 text-slate-800" /></Link>
                    </Button>
                    <h1 className="text-sm md:text-xl font-black text-slate-900 tracking-tight uppercase">User Audit</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <Activity className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-[10px] font-black text-blue-700 uppercase">Live Trace</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
                
                {/* WALLET AT TOP */}
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
                                        className="h-12 md:h-16 pl-10 bg-black/40 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-primary text-base md:text-xl font-black"
                                    />
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button className="h-12 w-12 md:h-16 md:w-16 bg-green-600 hover:bg-green-700 rounded-xl p-0" onClick={() => handleUpdateBalance('add')} disabled={isUpdating}>
                                        {isUpdating ? <Loader size="xs" /> : <ArrowUpRight className="h-6 w-6" />}
                                    </Button>
                                    <Button className="h-12 w-12 md:h-16 md:w-16 bg-red-600 hover:bg-red-700 rounded-xl p-0" onClick={() => handleUpdateBalance('deduct')} disabled={isUpdating}>
                                        {isUpdating ? <Loader size="xs" /> : <ArrowDownLeft className="h-6 w-6" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
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
                                    <div>
                                        <p className="text-[8px] font-black text-green-700 uppercase">Public IP</p>
                                        <p className="text-sm font-black text-green-900 tabular-nums">{intel?.network?.ipv4 || "No Data"}</p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => { if(intel?.network?.ipv4) { navigator.clipboard.writeText(intel.network.ipv4); toast({ title: "Copied" }); } }}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                            <DataRow icon={Server} label="ISP Provider" value={intel?.network?.isp} colorClass="text-blue-500" isMono />
                            <DataRow icon={Activity} label="Connection" value={intel?.network?.type} sub={intel?.network?.downlink} colorClass="text-amber-500" />
                            
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <SecurityFlag label="VPN" status={intel?.risk?.vpn || 'safe'} />
                                <SecurityFlag label="Proxy" status={intel?.risk?.proxy || 'safe'} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" /> Geo Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-center">
                            <div className="aspect-[2/1] bg-slate-100 rounded-2xl flex items-center justify-center border border-dashed text-slate-300">
                                <MapPin className="h-8 w-8" />
                            </div>
                            <DataRow icon={Globe} label="Location" value={intel?.geo ? `${intel.geo.city}, ${intel.geo.country}` : "No Data"} colorClass="text-red-500" />
                            <DataRow icon={Clock} label="Timezone" value={intel?.geo?.timezone} colorClass="text-blue-500" isMono />
                        </CardContent>
                    </Card>

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
                        </CardContent>
                    </Card>

                </div>

                {/* PAYMENT METHODS SECTION */}
                <div className="space-y-4">
                    <h2 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] px-1">Linked Settlement Channels</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {paymentMethods.length > 0 ? (
                            paymentMethods.map((method: any, idx: number) => (
                                <Card key={idx} className="border-none shadow-sm rounded-3xl bg-white overflow-hidden group">
                                    <CardHeader className="p-0">
                                        <div className="h-2 w-full" style={{ backgroundColor: providerLogos[method.name] ? 'transparent' : '#cbd5e1' }} />
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 shadow-sm">
                                                    {providerLogos[method.name] ? (
                                                        <Image src={providerLogos[method.name]} alt={method.name} width={40} height={40} className="object-contain" />
                                                    ) : (
                                                        <CreditCard className="h-6 w-6 text-slate-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 uppercase tracking-tight">{method.name}</h4>
                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase mt-0.5">
                                                        <BadgeCheck className="h-3 w-3" /> Identity Confirmed
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                                                <p className="text-[10px] font-black text-slate-800 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100 mt-0.5">{method.type}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-0.5">
                                            <DataRow icon={Zap} label="Linked UPI ID" value={method.upiId} colorClass="text-primary" isCopyable isMono />
                                            <DataRow icon={User} label="Bank Record Name" value={method.verifiedName} colorClass="text-teal-500" />
                                            <DataRow icon={Landmark} label="PSP Bank" value={method.pspBank} colorClass="text-amber-500" />
                                            <DataRow icon={Smartphone} label="TPAP Engine" value={method.tpap} colorClass="text-blue-500" sub="NPCI Gate" />
                                            <DataRow icon={Clock} label="Link Date" value={method.linkedAt ? new Date(method.linkedAt).toLocaleString() : 'N/A'} colorClass="text-slate-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card className="col-span-full border-none shadow-sm rounded-3xl bg-white p-12 text-center">
                                <CreditCard className="h-12 w-12 mx-auto text-slate-100 mb-4" />
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">No settlement channels linked by user</p>
                            </Card>
                        )}
                    </div>
                </div>
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
