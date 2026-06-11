
"use client";

import { useEffect, useState, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { AISystem, Assessment, TestRun } from "@/lib/types";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GitCompare, 
  ArrowLeft, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown,
  Activity,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function CompareContent() {
  const { systemId } = useParams();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const v1Id = searchParams.get("v1");
  const v2Id = searchParams.get("v2");
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    system: AISystem;
    a1: Assessment;
    a2: Assessment;
    runs1: TestRun[];
    runs2: TestRun[];
  } | null>(null);

  useEffect(() => {
    if (!db || !v1Id || !v2Id) return;

    const fetchData = async () => {
      try {
        const [sysSnap, a1Snap, a2Snap] = await Promise.all([
          getDoc(doc(db, "ai_systems", systemId as string)),
          getDoc(doc(db, "assessments", v1Id)),
          getDoc(doc(db, "assessments", v2Id))
        ]);

        if (!sysSnap.exists() || !a1Snap.exists() || !a2Snap.exists()) return;

        const [runs1Snap, runs2Snap] = await Promise.all([
          getDocs(query(collection(db, "testRuns"), where("assessmentId", "==", v1Id))),
          getDocs(query(collection(db, "testRuns"), where("assessmentId", "==", v2Id)))
        ]);

        setData({
          system: { id: sysSnap.id, ...sysSnap.data() } as AISystem,
          a1: { id: a1Snap.id, ...a1Snap.data() } as Assessment,
          a2: { id: a2Snap.id, ...a2Snap.data() } as Assessment,
          runs1: runs1Snap.docs.map(d => ({ id: d.id, ...d.data() } as TestRun)),
          runs2: runs2Snap.docs.map(d => ({ id: d.id, ...d.data() } as TestRun))
        });
      } catch (err) {
        console.error("Comparison error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, systemId, v1Id, v2Id]);

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary" /></div>;
  if (!data) return <div>Data not found.</div>;

  const scoreDiff = data.a1.overallScore - data.a2.overallScore;

  return (
    <main className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex items-center justify-between mb-10">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/systems/${systemId}/versions`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <GitCompare className="w-8 h-8 text-primary" />
            <h1 className="font-headline text-4xl font-bold">Version Comparison</h1>
          </div>
          <p className="text-muted-foreground text-lg mt-2">{data.system.name} • Comparing v{data.a2.version} to v{data.a1.version}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Card className="glass-morphism p-8 text-center border-primary/20">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">v{data.a2.version} (Base)</p>
          <p className="text-6xl font-headline font-bold text-muted-foreground">{data.a2.overallScore}</p>
        </Card>
        
        <div className="flex flex-col items-center justify-center">
          <div className={cn("p-4 rounded-full mb-4", 
            scoreDiff > 0 ? "bg-emerald-400/10" : scoreDiff < 0 ? "bg-destructive/10" : "bg-muted"
          )}>
            {scoreDiff > 0 ? <TrendingUp className="w-10 h-10 text-emerald-400" /> : <TrendingDown className="w-10 h-10 text-destructive" />}
          </div>
          <p className={cn("text-3xl font-headline font-bold", 
            scoreDiff > 0 ? "text-emerald-400" : "text-destructive"
          )}>
            {scoreDiff > 0 ? "+" : ""}{scoreDiff} points
          </p>
          <p className="text-sm text-muted-foreground">Score Improvement</p>
        </div>

        <Card className="glass-morphism p-8 text-center border-primary/40 bg-primary/5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">v{data.a1.version} (New)</p>
          <p className={cn("text-6xl font-headline font-bold", 
            data.a1.overallScore >= 80 ? "text-emerald-400" : "text-primary"
          )}>
            {data.a1.overallScore}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h3 className="font-headline text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-muted-foreground" />
            Persona Success Delta
          </h3>
          <Card className="glass-morphism border-primary/10 overflow-hidden">
            <div className="p-6 space-y-4">
              {data.runs1.map(run1 => {
                const run2 = data.runs2.find(r => r.persona === run1.persona);
                const improved = run1.success && !run2?.success;
                const regressed = !run1.success && run2?.success;

                return (
                  <div key={run1.persona} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                    <div className="font-medium">{run1.persona}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[8px] uppercase font-bold text-muted-foreground mb-1">Base</p>
                        {run2?.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-[8px] uppercase font-bold text-primary mb-1">New</p>
                        {run1.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h3 className="font-headline text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            Issue Resolution
          </h3>
          <Card className="glass-morphism border-primary/10 p-6">
             <div className="space-y-6">
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase mb-3">Total Issues Comparison</p>
                  <div className="flex items-end gap-2">
                    <div className="flex-grow bg-muted rounded-full h-8 relative overflow-hidden">
                       <div 
                         className="absolute top-0 left-0 bg-primary/40 h-full transition-all duration-1000" 
                         style={{ width: `${(data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0) / 20) * 100}%` }}
                       ></div>
                    </div>
                    <span className="font-headline font-bold text-xl">{data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">NEW VERSION ISSUES</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="bg-emerald-400/5 p-4 rounded-xl border border-emerald-400/20">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Fixed</p>
                    <p className="text-2xl font-headline font-bold text-emerald-400">
                      {Math.max(0, data.runs2.reduce((s, r) => s + r.accessibilityIssues.length, 0) - data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0))}
                    </p>
                  </div>
                  <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/20">
                    <p className="text-[10px] font-bold text-destructive uppercase">New Issues</p>
                    <p className="text-2xl font-headline font-bold text-destructive">
                      {Math.max(0, data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0) - data.runs2.reduce((s, r) => s + r.accessibilityIssues.length, 0))}
                    </p>
                  </div>
                </div>
             </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <AuthGuard>
      <Navbar />
      <Suspense fallback={<div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary" /></div>}>
        <CompareContent />
      </Suspense>
    </AuthGuard>
  );
}
