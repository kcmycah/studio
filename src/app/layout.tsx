import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'AuditAccess - Inclusive AI Audit Pipeline',
  description: 'Auditing AI systems for accessibility and fairness using the DISA framework.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <FirebaseClientProvider>
          {children}
          <Toaster />
          <FirebaseErrorListener />
        </FirebaseClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}