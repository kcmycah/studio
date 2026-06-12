
'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
        <Alert variant="destructive" className="max-w-md border-2 border-accent/50 bg-accent/5">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-black uppercase tracking-tighter mb-2">Configuration Required</AlertTitle>
          <AlertDescription className="text-sm font-medium opacity-80 leading-relaxed">
            Firebase credentials are missing from your <strong>.env</strong> file. 
            <br/><br/>
            Please add your <strong>NEXT_PUBLIC_FIREBASE_API_KEY</strong> and other project identifiers to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <FirebaseProvider app={app} firestore={firestore} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
