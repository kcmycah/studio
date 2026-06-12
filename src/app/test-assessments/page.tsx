'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { Loader2, ShieldCheck, AlertCircle, Layers, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AISystem } from '@/lib/types';

/**
 * Diagnostic tool updated for the Subcollection Architecture.
 * Verifies that we can fetch systems and then their nested assessments.
 */
export default function TestAssessmentsPage() {
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { data: systems, loading: systemsLoading } = useCollection<AISystem>("ai_systems");
  
  const [testResults, setTestResults] = useState<{
    systemId: string;
    systemName: string;
    assessments: any[];
    error: string | null;
  }[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostic = async () => {
    if (!user || !db || !systems) return;
    setRunning(true);
    const results = [];

    for (const system of systems) {
      try {
        // Testing path-scoped subcollection access
        const path = `ai_systems/${system.id}/assessments`;
        const q = query(collection(db, path), orderBy("createdAt", "desc"), limit(5));
        const snap = await getDocs(q);
        
        results.push({
          systemId: system.id,
          systemName: system.name,
          assessments: snap.docs.map(d => ({ id: d.id, ...d.data() })),
          error: null
        });
      } catch (err: any) {
        results.push({
          systemId: system.id,
          systemName: system.name,
          assessments: [],
          error: err.message
        });
      }
    }
    setTestResults(results);
    setRunning(false);
  };

  if (authLoading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Verifying Auth...</div>;
  if (!user) return <div className="p-8"><Alert variant="destructive"><AlertTitle>Not Authenticated</AlertTitle><AlertDescription>Please log in to run this diagnostic.</AlertDescription></Alert></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-accent" /> Subcollection Diagnostic
        </h1>
        <p className="text-muted-foreground mt-2">Verifying path-scoped access for <code>ai_systems/&#123;id&#125;/assessments</code>.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="w-4 h-4" /> System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {systemsLoading ? (
              <Loader2 className="animate-spin text-accent" />
            ) : (
              <p className="text-sm">Found <strong>{systems?.length || 0}</strong> registered AI systems.</p>
            )}
            <button 
              onClick={runDiagnostic}
              disabled={running || !systems?.length}
              className="mt-4 w-full bg-accent text-white py-2 rounded-lg font-bold disabled:opacity-50"
            >
              {running ? "Running Scan..." : "Scan All Subcollections"}
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {testResults.map((res) => (
          <Card key={res.systemId} className={res.error ? "border-destructive/50" : "border-emerald-500/20"}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" /> {res.systemName}
                </CardTitle>
                {res.error ? (
                  <span className="text-[10px] font-black uppercase text-destructive bg-destructive/10 px-2 py-1 rounded">Denied</span>
                ) : (
                  <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Success</span>
                )}
              </div>
              <CardDescription className="font-mono text-[10px]">Path: ai_systems/{res.systemId}/assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {res.error ? (
                <div className="bg-destructive/5 p-4 rounded-xl text-xs text-destructive font-mono border border-destructive/10">
                  {res.error}
                </div>
              ) : (
                <div className="bg-black/5 p-4 rounded-xl border font-mono text-[10px] overflow-auto max-h-[200px]">
                  {res.assessments.length > 0 ? (
                    <pre>{JSON.stringify(res.assessments, null, 2)}</pre>
                  ) : (
                    <p className="italic text-muted-foreground">No assessments found for this system.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
