import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/context/language-context';
import { AuthProvider } from '@/hooks/use-user';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const ICON_URL = "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Banner/IMG_20260525_122039_723.jpg?v=5.0";

export const metadata: Metadata = {
  title: "Flex Pay",
  description: "Join Flex Pay and experience fast, secure and easy digital payments. Invite friends and earn rewards instantly.",
  metadataBase: new URL('https://flexpay.skin'),
  icons: {
    icon: [
      { url: ICON_URL, sizes: '32x32', type: 'image/jpeg' },
      { url: ICON_URL, sizes: '192x192', type: 'image/jpeg' }
    ],
    shortcut: ICON_URL,
    apple: [
      { url: ICON_URL, sizes: '180x180', type: 'image/jpeg' }
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <LanguageProvider>
            <AuthProvider>{children}</AuthProvider>
          </LanguageProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
