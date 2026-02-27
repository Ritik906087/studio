
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LanguageProvider } from '@/context/language-context';

export const metadata: Metadata = {
  title: "LG Pay – Smart Digital Wallet",
  description: "Join LG Pay and experience fast, secure and easy digital payments. Invite friends and earn rewards instantly.",

  icons: {
    icon: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_00000000bd5072068c98a569253739e7.png?alt=media&token=3035c470-4755-4b35-a364-60d55ae22513",
  },

  openGraph: {
    title: "LG Pay – Smart Digital Wallet",
    description: "Join LG Pay and experience fast, secure and easy digital payments. Invite friends and earn rewards instantly.",
    url: "https://lgpayb.online",
    siteName: "LG Pay",
    images: [
      {
        url: "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_00000000bd5072068c98a569253739e7.png?alt=media&token=3035c470-4755-4b35-a364-60d55ae22513",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "LG Pay – Smart Digital Wallet",
    description: "Join LG Pay and experience fast, secure and easy digital payments. Invite friends and earn rewards instantly.",
    images: [
      "https://firebasestorage.googleapis.com/v0/b/studio-7631087921-85112.firebasestorage.app/o/file_00000000bd5072068c98a569253739e7.png?alt=media&token=3035c470-4755-4b35-a364-60d55ae22513",
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
