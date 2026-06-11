
'use client';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Saves user-specific UI preferences to Firestore.
 */
export async function saveUserPreferences(userId: string, preferences: any) {
  const { firestore } = initializeFirebase();
  const ref = doc(firestore, 'user_preferences', userId);
  await setDoc(ref, { ...preferences, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Loads user-specific UI preferences from Firestore.
 */
export async function loadUserPreferences(userId: string) {
  const { firestore } = initializeFirebase();
  const ref = doc(firestore, 'user_preferences', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
