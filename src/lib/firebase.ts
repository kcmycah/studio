/**
 * Legacy Firebase initialization file bridge.
 * Refactored to prevent module-scope execution crashes.
 * Standardizes access to Firebase instances via safe getters.
 */
import { initializeFirebase } from "@/firebase";

let cachedInit: ReturnType<typeof initializeFirebase> | null = null;

function getInit() {
  if (!cachedInit) {
    cachedInit = initializeFirebase();
  }
  return cachedInit;
}

/**
 * @deprecated Use useFirestore() hook or standardized context.
 */
export const db = typeof window !== 'undefined' ? getInit().firestore : null;

/**
 * @deprecated Use useAuth() hook or standardized context.
 */
export const auth = typeof window !== 'undefined' ? getInit().auth : null;

/**
 * @deprecated Use useFirebaseApp() hook or standardized context.
 */
export const app = typeof window !== 'undefined' ? getInit().app : null;
