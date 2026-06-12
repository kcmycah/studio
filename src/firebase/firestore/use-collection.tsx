
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  onSnapshot,
  collection,
  query,
  where,
  QueryConstraint,
  DocumentData,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { useUser } from '../auth/use-user';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../errors';

/**
 * Intelligent hook for fetching Firestore collections with automatic security scoping.
 * Scopes queries to the current user's data for protected top-level collections
 * to satisfy Firestore Security Rules for 'list' operations.
 */
export function useCollection<T = DocumentData>(
  path: string | null,
  constraints: QueryConstraint[] = []
) {
  const db = useFirestore();
  const { user } = useUser();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize constraints to prevent unnecessary effect re-runs
  const constraintsHash = useMemo(() => {
    try {
      return JSON.stringify(constraints.map(c => c.toString()));
    } catch {
      return 'static-constraints';
    }
  }, [constraints]);

  const memoizedQuery = useMemo(() => {
    if (!db || !path || !user) return null;

    try {
      let allConstraints = [...constraints];
      
      /**
       * Automatic scoping for protected collections.
       * 
       * Firestore Security Rules require broad 'list' queries to have filters that 
       * match the rules' conditions.
       */
      const protectedPaths = ['ai_systems', 'testRuns', 'feedback', 'user_preferences', 'assessments'];
      
      const isTopLevelProtected = !path.includes('/') && protectedPaths.includes(path);
      const isAssessmentsSub = path.endsWith('/assessments');

      if (isTopLevelProtected || isAssessmentsSub) {
        const hasUserIdFilter = constraints.some(c => c.toString().includes('userId'));
        if (!hasUserIdFilter) {
          allConstraints.push(where('userId', '==', user.uid));
        }
      }

      if (!constraints.some(c => c.toString().includes('limit'))) {
        allConstraints.push(firestoreLimit(100));
      }

      return query(collection(db, path), ...allConstraints);
    } catch (e) {
      console.error("[useCollection] Query construction error:", e);
      return null;
    }
  }, [db, path, user, constraintsHash]);

  useEffect(() => {
    if (!path || !user) {
      setData([]);
      setLoading(false);
      return;
    }

    if (!memoizedQuery) return;

    setLoading(true);
    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        setData(docs);
        setError(null);
        setLoading(false);
      },
      async (err) => {
        const permissionError = new FirestorePermissionError({
          path: path || 'unknown',
          operation: 'list',
        } satisfies SecurityRuleContext);
        
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery, path, user]);

  return { data, loading, error };
}
