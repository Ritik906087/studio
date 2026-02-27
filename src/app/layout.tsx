
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LanguageProvider } from '@/context/language-context';

export const metadata: Metadata = {
  title: "LG Pay",
  description: "Secure and easy payments with LG Pay",

  icons: {
    icon: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6",
  },

  openGraph: {
    title: "LG Pay",
    description: "Secure and easy payments with LG Pay",
    url: "https://lgpayb.online",
    siteName: "LG Pay",
    images: [
      {
        url: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6",
        width: 512,
        height: 512,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "LG Pay",
    description: "Secure and easy payments with LG Pay",
    images: [
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_000000002968720686f855daed13e880.png?alt=media&token=c4dece97-7dee-41c4-bac7-6c1f9f186fb6",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
