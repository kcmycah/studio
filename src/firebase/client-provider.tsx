'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { app, firestore, auth } = useMemo(() => initializeFirebase(), []);

  // Graceful fallback UI for missing configuration
  if (!app || !firestore || !auth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-accent/10 rounded-2xl mb-4">
             <ShieldAlert className="w-12 h-12 text-accent" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter uppercase">Configuration Required</h1>
            <p className="text-muted-foreground font-medium leading-relaxed">
              The DISA Audit pipeline cannot initialize without your project credentials.
            </p>
          </div>

          <Alert variant="destructive" className="border-2 border-accent/20 bg-accent/5 text-left">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold uppercase text-[10px] tracking-widest mb-1">Missing Environment Variables</AlertTitle>
            <AlertDescription className="text-xs font-medium opacity-80 leading-relaxed">
              Please add <strong>NEXT_PUBLIC_FIREBASE_API_KEY</strong> and other project identifiers to your <strong>.env</strong> file.
            </AlertDescription>
          </Alert>

          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
            AuditAccess • Framework v2.4
          </p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider app={app} firestore={firestore} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
