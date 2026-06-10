
/**
 * Legacy Firebase initialization file.
 * This file is now deprecated in favor of using the standard Firebase hooks
 * from "@/firebase".
 */
import { initializeFirebase } from "@/firebase";

const { app, firestore: db, auth } = initializeFirebase();

export { app, db, auth };
