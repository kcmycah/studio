
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Centrally listens for FirestorePermissionError and displays a toast.
 * This handles the "standard" vs "contextual" error surfacing for better debugging.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // In development, this helps catch security rules issues quickly
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: `Action: ${error.context.operation} at ${error.context.path}. Check your Firestore Security Rules.`,
      });
      
      // We also throw it so it hits the Next.js error overlay in development
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
