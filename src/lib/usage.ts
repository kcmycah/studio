
'use client';

import { Firestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from './types';

export interface UserUsage {
  activeCount: number;
  maxActive: number;
  monthlyUsed: number;
  maxMonthly: number;
  isPro: boolean;
  remainingActive: number;
  remainingMonthly: number;
}

/**
 * Fetches current usage and plan limits for a user.
 */
export async function getUserUsage(db: Firestore, userId: string): Promise<UserUsage> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? (userSnap.data() as UserProfile) : null;
  
  const status = userData?.subscriptionStatus || 'free';
  const isPro = status === 'pro' || status === 'enterprise';
  
  const systemsQuery = query(collection(db, 'ai_systems'), where('userId', '==', userId));
  const systemsSnap = await getDocs(systemsQuery);
  const activeCount = systemsSnap.size;
  
  const maxActive = isPro ? 9999 : 2;
  const maxMonthly = isPro ? 9999 : 5;
  const monthlyUsed = userData?.monthlySystemCreations || 0;
  
  return {
    activeCount,
    maxActive,
    monthlyUsed,
    maxMonthly,
    isPro,
    remainingActive: Math.max(0, maxActive - activeCount),
    remainingMonthly: Math.max(0, maxMonthly - monthlyUsed)
  };
}
