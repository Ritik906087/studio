'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Loader, Paperclip } from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { supabase, uploadToSupabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const buyProblemTypes = [
  'Deposit Not Credited',
  'Deposit Failed',
  'Wrong UTR / Screenshot',
  'Payment Pending',
  'Other Issue',
];

const sellProblemTypes = [
  'Withdrawal Not Received',
  'Withdrawal Amount Incorrect',
  'Payment Reversed',
  'Other Issue',
];

type Order = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: Timestamp;
};

const FileUploadProgress = ({ file, progress }: { file: File | null; progress: number | null }) => {
    if (!file) return null;

    return (
        <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="truncate flex-1">{file.name}</span>
                {progress !== null && <span className="text-xs font-mono">{Math.round(progress)}%</span>}
            </div>
            {progress !== null && <Progress value={progress} className="h-1" />}
        </div>
    );
};

function ReportProblemForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const orderId = params.orderId as string;
  const orderType = searchParams.get('orderType') as 'buy' | 'sell';

  const { user, profile } = useUser();
  const firestore = useFirestore();

  const [problemType, setProblemType] = useState('');
  const [message, setMessage] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);

  const [screenshotProgress, setScreenshotProgress] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [bankStatementProgress, setBankStatementProgress] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const orderRef = useMemo(() => {
    if (!firestore || !user || !orderId || !orderType) return null;
    const collectionName = orderType === 'buy' ? 'orders' : 'sellOrders';
    return doc(firestore, 'users', user.uid, collectionName, orderId);
  }, [firestore, user, orderId, orderType]);
  const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'screenshot' | 'video' | 'statement') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileType === 'screenshot' && !file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Upload an image for screenshot.' });
        return;
    }
    if (fileType === 'video' && !file.type.startsWith('video/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Upload a video file.' });
        return;
    }

    if (fileType === 'screenshot') setScreenshotFile(file);
    if (fileType === 'video') setVideoFile(file);
    if (fileType === 'statement') setBankStatementFile(file);

    toast({ title: 'File selected', description: file.name });
  };
  
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if(text.length <= 150) {
        setMessage(text);
        setCharCount(text.length);
    }
  };

  const handleSubmit = async () => {
    if (!problemType) {
        toast({ variant: 'destructive', title: 'Select a problem type.' });
        return;
    }
    if (!user || !profile || !order) {
        toast({ variant: 'destructive', title: 'Session Error', description: 'Try again.' });
        return;
    }
    
    setIsSubmitting(true);
    const caseId = `LGRPT${Date.now()}`;

    try {
        const fileData: { [key: string]: string } = {};

        // 1. Upload evidence to Supabase Storage "payment" bucket
        if (screenshotFile) {
            setScreenshotProgress(50);
            fileData.screenshotURL = await uploadToSupabase(screenshotFile, `reports/${user.uid}/screenshot_${Date.now()}`);
            setScreenshotProgress(100);
        }

        if (bankStatementFile) {
            setBankStatementProgress(50);
            fileData.statementURL = await uploadToSupabase(bankStatementFile, `reports/${user.uid}/statement_${Date.now()}`);
            setBankStatementProgress(100);
        }

        if (videoFile) {
            setVideoProgress(50);
            fileData.videoURL = await uploadToSupabase(videoFile, `reports/${user.uid}/video_${Date.now()}`);
            setVideoProgress(100);
        }

        // 2. Save report to Supabase Database to save Firestore Quota
        const { error } = await supabase.from('reports').insert({
            caseId: caseId,
            userId: user.uid,
            userNumericId: profile.numericId,
            orderId: order.id,
            displayOrderId: order.orderId,
            orderType: orderType,
            problemType: problemType,
            message: message,
            ...fileData,
        });

        if (error) throw error;

        toast({ title: 'Report Submitted', description: 'Reviewing your case.' });
        router.push('/my/report-status');

    } catch (error) {
        console.error("Error submitting report to Supabase:", error);
        toast({ variant: 'destructive', title: 'Submission Failed' });
        setIsSubmitting(false);
    }
  };

  const problemTypes = orderType === 'buy' ? buyProblemTypes : sellProblemTypes;

  if (orderLoading) return <div className="p-4 space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my/report-problem"><ChevronLeft className="h-6 w-6 text-muted-foreground" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Submit Report</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <Card>
            <CardHeader><CardTitle className="text-sm uppercase font-black opacity-50">Order Context</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm font-bold">
                <div className="flex justify-between"><span>ID:</span><span className="font-mono text-primary">{order?.orderId}</span></div>
                <div className="flex justify-between"><span>Amount:</span><span>₹{order?.amount.toFixed(2)}</span></div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="text-base">Problem Type</CardTitle></CardHeader>
            <CardContent>
                <RadioGroup value={problemType} onValueChange={setProblemType} className="space-y-2">
                    {problemTypes.map(type => (
                        <div key={type} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl">
                            <RadioGroupItem value={type} id={type} />
                            <Label htmlFor={type} className="flex-1 font-bold">{type}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
        </Card>

        <Card>
            <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Description</Label>
                    <Textarea placeholder="Details..." value={message} onChange={handleMessageChange} maxLength={150} disabled={isSubmitting} className="rounded-xl bg-slate-50 border-none h-32" />
                    <p className="text-[10px] text-right font-bold text-slate-300">{charCount}/150</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    <div>
                        <Label className="text-[10px] font-black uppercase text-slate-400">Screenshot</Label>
                        <Input type="file" onChange={(e) => handleFileChange(e, 'screenshot')} accept="image/*" disabled={isSubmitting} className="bg-slate-50 rounded-xl border-none" />
                        <FileUploadProgress file={screenshotFile} progress={screenshotProgress} />
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Button onClick={handleSubmit} className="w-full h-14 btn-gradient rounded-2xl font-black shadow-teal-500/20" disabled={isSubmitting || !problemType}>
            {isSubmitting ? <Loader size="xs" /> : "SUBMIT CASE"}
        </Button>
      </main>
    </>
  );
}

export default function ReportProblemDetailPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader size="md" /></div>}>
            <ReportProblemForm />
        </Suspense>
    );
}
