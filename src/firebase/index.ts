import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';

/**
 * Initializes Firebase services safely.
 * Returns nulls if the configuration is missing or invalid.
 * Prevents initialization if credentials look like placeholders.
 */
export function initializeFirebase(): {
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  if (typeof window === 'undefined') {
    // SSR safe return
    return { app: null, firestore: null, auth: null };
  }

  if (!isFirebaseConfigValid()) {
    return { app: null, firestore: null, auth: null };
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    return { app, firestore, auth };
  } catch (error) {
    // We return nulls here to allow the ClientProvider to show a setup UI
    // instead of crashing the entire application bundle.
    return { app: null, firestore: null, auth: null };
  }
}

/**
 * Utility to clear local Firestore persistence and storage.
 * Useful for troubleshooting "History" or data synchronization errors.
 */
export async function clearFirebaseCache() {
  const { firestore } = initializeFirebase();
  if (firestore) {
    try {
      await terminate(firestore);
      await clearIndexedDbPersistence(firestore);
    } catch (err) {
      console.error("Cache clear failed:", err);
    }
  }
  
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
}

export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
