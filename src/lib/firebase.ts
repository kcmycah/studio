/**
 * Legacy Firebase initialization file bridge.
 * This file is now a bridge to the centralized Firebase initialization
 * to prevent multiple app instances and resolve "invalid-api-key" errors.
 */
import { initializeFirebase } from "@/firebase";

const { app, firestore: db, auth } = initializeFirebase();

export { app, db, auth };