
'use client';

import React, { useState, useMemo, Suspense, useCallback } from 'react';
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
import { useUser, useFirestore, useDoc, useStorage } from '@/firebase';
import { doc, collection, serverTimestamp, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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

  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

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

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<{ numericId: string }>(userProfileRef);

  const orderRef = useMemo(() => {
    if (!firestore || !user || !orderId || !orderType) return null;
    const collectionName = orderType === 'buy' ? 'orders' : 'sellOrders';
    return doc(firestore, 'users', user.uid, collectionName, orderId);
  }, [firestore, user, orderId, orderType]);
  const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'screenshot' | 'video' | 'statement') => {
    const file = e.target.files?.[0];
    if (!file) return;

    let fileTypeName = '';

    if (fileType === 'screenshot') {
        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file for the screenshot.' });
            return;
        }
        setScreenshotFile(file);
        fileTypeName = 'Screenshot';
    }
    if (fileType === 'video') {
        if (!file.type.startsWith('video/')) {
            toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a video file.' });
            return;
        }
        setVideoFile(file);
        fileTypeName = 'Video';
    }
    if (fileType === 'statement') {
        if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
            toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image or PDF for the statement.' });
            return;
        }
        setBankStatementFile(file);
        fileTypeName = 'Bank statement';
    }

    toast({
        title: `${fileTypeName} selected`,
        description: file.name,
    });
  };
  
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if(text.length <= 150) {
        setMessage(text);
        setCharCount(text.length);
    }
  };

  const uploadFile = useCallback((file: File, path: string, progressSetter: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!storage) {
            return reject(new Error("Firebase Storage is not initialized."));
        }
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressSetter(progress);
            },
            (error) => {
                console.error('Upload failed:', error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
  }, [storage]);

  const handleSubmit = async () => {
    if (!problemType) {
        toast({ variant: 'destructive', title: 'Please select a problem type.' });
        return;
    }
    if (!user || !userProfile || !order || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load required data. Please try again.' });
        return;
    }
    
    setIsSubmitting(true);
    
    const newReportRef = doc(collection(firestore, "reports"));
    const reportId = newReportRef.id;
    const caseId = `LGRPT${Date.now()}`;

    try {
        const uploadPromises: Promise<any>[] = [];
        const fileData: { [key: string]: string } = {};

        const addUpload = (file: File | null, type: 'screenshot' | 'video' | 'statement', progressSetter: (p: number) => void) => {
            if (file) {
                const extension = file.name.split('.').pop() || 'file';
                const path = `reports/${user.uid}/${reportId}/${type}.${extension}`;
                uploadPromises.push(
                    uploadFile(file, path, progressSetter).then(url => {
                        fileData[`${type}URL`] = url;
                    })
                );
            }
        };

        addUpload(screenshotFile, 'screenshot', setScreenshotProgress);
        addUpload(bankStatementFile, 'statement', setBankStatementProgress);
        addUpload(videoFile, 'video', setVideoProgress);

        await Promise.all(uploadPromises);

        await setDoc(newReportRef, {
            caseId: caseId,
            userId: user.uid,
            userNumericId: userProfile.numericId,
            orderId: order.id,
            displayOrderId: order.orderId,
            orderType: orderType,
            problemType: problemType,
            message: message,
            ...fileData,
            createdAt: serverTimestamp(),
            status: 'pending',
        });

        toast({ title: 'Report Submitted', description: 'We will review your issue shortly.' });
        router.push('/my/report-status');

    } catch (error) {
        console.error("Error submitting report:", error);
        toast({ variant: 'destructive', title: 'Submission Failed', description: 'An error occurred. Please try again.'});
        setIsSubmitting(false); // Only set to false on error, success navigates away
    }
  };

  const problemTypes = orderType === 'buy' ? buyProblemTypes : sellProblemTypes;

  if (orderLoading) {
      return (
          <div className="p-4 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
          </div>
      )
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/my/report-problem">
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Submit Report</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow space-y-4 p-4">
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Order ID:</span>
                    <span className="font-mono">{order?.orderId}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-semibold">₹{order?.amount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{order?.createdAt.toDate().toLocaleString()}</span>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-base">Problem Type</CardTitle>
            </CardHeader>
            <CardContent>
                <RadioGroup value={problemType} onValueChange={setProblemType} className="space-y-2">
                    {problemTypes.map(type => (
                        <div key={type} className="flex items-center space-x-3">
                            <RadioGroupItem value={type} id={type} />
                            <Label htmlFor={type} className="font-normal">{type}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-base">Description & Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="message">Describe the issue</Label>
                    <Textarea 
                        id="message" 
                        placeholder="Please provide details..." 
                        value={message}
                        onChange={handleMessageChange}
                        maxLength={150}
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground text-right">{charCount}/150</p>
                </div>
                <div className="space-y-2">
                    <Label>Upload Screenshot</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'screenshot')} accept="image/*" disabled={isSubmitting} />
                    <FileUploadProgress file={screenshotFile} progress={screenshotProgress} />
                </div>
                 <div className="space-y-2">
                    <Label>Upload Bank Statement (Image or PDF)</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'statement')} accept="image/*,application/pdf" disabled={isSubmitting} />
                     <FileUploadProgress file={bankStatementFile} progress={bankStatementProgress} />
                </div>
                 <div className="space-y-2">
                    <Label>Upload Video Recording (Optional)</Label>
                    <Input type="file" onChange={(e) => handleFileChange(e, 'video')} accept="video/*" disabled={isSubmitting} />
                     <FileUploadProgress file={videoFile} progress={videoProgress} />
                </div>
            </CardContent>
        </Card>
        
        <Button onClick={handleSubmit} className="w-full h-12 btn-gradient font-bold" disabled={isSubmitting || !problemType}>
            {isSubmitting ? <Loader size="xs" className="mr-2" /> : null}
            Submit Report
        </Button>
      </main>
    </>
  );
}

export default function ReportProblemDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-20">
                <Loader size="md" />
            </div>
        }>
            <ReportProblemForm />
        </Suspense>
    );
}
