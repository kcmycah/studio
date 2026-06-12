'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { AlertCircle, KeyRound } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { app, firestore, auth } = useMemo(() => initializeFirebase(), []);

  // Graceful fallback UI for missing or invalid configuration
  if (!app || !firestore || !auth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <div className="max-w-xl w-full space-y-8 text-center">
          <div className="inline-flex items-center justify-center p-6 bg-accent/10 rounded-3xl mb-4 border border-accent/20">
             <KeyRound className="w-16 h-16 text-accent animate-pulse" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tighter uppercase">Initialize Pipeline</h1>
            <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-md mx-auto">
              The DISA Audit dashboard requires your Firebase credentials to establish a secure auditing environment.
            </p>
          </div>

          <Card className="bg-muted/10 border-2 border-accent/20 text-left overflow-hidden">
            <CardHeader className="bg-accent/5 border-b border-accent/20">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> System Configuration Required
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-xs font-medium text-white/70 leading-relaxed">
                Your <strong>.env</strong> file is missing valid API keys or contains placeholder text. 
                Please update your environment variables with the following keys from your Firebase Console:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'].map(key => (
                  <code key={key} className="bg-black/40 p-2 rounded text-[10px] font-mono text-emerald-400 border border-white/5">
                    {key}
                  </code>
                ))}
              </div>
              <div className="pt-4 border-t border-white/5 mt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                  After updating, the page will reload automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">
            AuditAccess • Framework v2.4 • Secure Environment
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
