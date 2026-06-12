'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TestAssessmentsPage() {
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !db) return;

    const fetchDirectly = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[TestPage] Attempting direct query for user:', user.uid);
        const q = query(
          collection(db, 'assessments'), 
          where('userId', '==', user.uid),
          limit(10)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssessments(data);
        console.log('[TestPage] Success! Found:', data.length, 'assessments');
      } catch (err: any) {
        console.error('[TestPage] Direct fetch error:', err);
        setError(err.message || 'Unknown permission error');
      } finally {
        setLoading(false);
      }
    };

    fetchDirectly();
  }, [user, db, authLoading]);

  if (authLoading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Verifying Auth...</div>;
  if (!user) return <div className="p-8"><Alert variant="destructive"><AlertTitle>Not Authenticated</AlertTitle><AlertDescription>Please log in to run this diagnostic.</AlertDescription></Alert></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-accent" /> Security Rules Diagnostic
        </h1>
        <p className="text-muted-foreground">Testing direct Firestore access for the 'assessments' collection.</p>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            <p className="font-mono text-xs mt-2 bg-black/10 p-2 rounded">{error}</p>
            <p className="mt-4 text-sm font-semibold italic">
              Verification: If you see "Missing or insufficient permissions", your Security Rules are still blocking the query despite the userId filter.
            </p>
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Querying Firestore...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Direct Query Results</CardTitle>
          </header>
          <CardContent>
            <div className="bg-black/5 p-4 rounded-xl border font-mono text-xs overflow-auto max-h-[400px]">
              {assessments.length > 0 ? (
                <pre>{JSON.stringify(assessments, null, 2)}</pre>
              ) : (
                <p className="italic text-muted-foreground">No assessments found for UID: {user.uid}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <footer className="text-xs text-muted-foreground bg-muted p-4 rounded-lg">
        <p className="font-bold mb-1">Check Browser Console (F12):</p>
        <ul className="list-disc list-inside">
          <li>Check for "[TestPage] Attempting direct query"</li>
          <li>If it says "Success!", the Security Rules are working correctly.</li>
          <li>If the History page still fails, the issue is likely in the useCollection hook's implementation.</li>
        </ul>
      </footer>
    </div>
  );
}