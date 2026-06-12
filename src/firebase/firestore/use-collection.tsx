
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
import { FirestorePermissionError } from '../errors';

/**
 * Intelligent hook for fetching Firestore collections with automatic security scoping.
 * It automatically injects userId filters for protected collections to satisfy security rules.
 *
 * @param path The collection path (e.g., 'assessments')
 * @param constraints Optional Firestore query constraints (where, orderBy, limit, etc.)
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

  // We use a stable hash of the constraints to avoid infinite re-render loops
  // if constraints are passed as a literal array in the component body.
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
      
      // AUTOMATIC SECURITY SCOPING
      // Ensure protected collections are always filtered by the authenticated userId.
      // This directly prevents the "Permission Denied" errors during list operations.
      const protectedCollections = ['assessments', 'testRuns', 'ai_systems', 'disa_assessments', 'feedback'];
      if (protectedCollections.includes(path)) {
        allConstraints.push(where('userId', '==', user.uid));
      }

      // PERFORMANCE REQUIREMENT
      // Automatically add a safety limit if one isn't provided.
      if (!constraints.some(c => (c as any).type === 'limit')) {
        allConstraints.push(firestoreLimit(100));
      }

      return query(collection(db, path), ...allConstraints);
    } catch (e) {
      console.error("Query construction error:", e);
      return null;
    }
  }, [db, path, user, constraintsHash]);

  useEffect(() => {
    if (!memoizedQuery) {
      if (!path || !user) setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        setData(docs);
        setLoading(false);
      },
      async (err) => {
        // Surface rich contextual errors for security rule violations
        const permissionError = new FirestorePermissionError({
          path: path || 'unknown',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery, path, user]);

  return { data, loading, error };
}
