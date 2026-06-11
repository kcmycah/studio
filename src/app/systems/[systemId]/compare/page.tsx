
"use client";

import { useEffect, useState, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
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

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-accent" /></div>;
  if (!data) return <div className="p-8">Data not found.</div>;

  const scoreDiff = data.a1.overallScore - data.a2.overallScore;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/systems/${systemId}/versions`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-accent" />
              <h1 className="text-4xl font-bold tracking-tight">Version Comparison</h1>
            </div>
            <p className="text-muted-foreground text-lg mt-2">{data.system.name} • Comparing v{data.a2.version} to v{data.a1.version}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="p-8 text-center border-border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">v{data.a2.version} (Base)</p>
            <p className="text-6xl font-bold text-muted-foreground">{data.a2.overallScore}</p>
          </Card>
          
          <div className="flex flex-col items-center justify-center">
            <div className={cn("p-4 rounded-full mb-4", 
              scoreDiff > 0 ? "bg-emerald-500/10" : scoreDiff < 0 ? "bg-destructive/10" : "bg-muted"
            )}>
              {scoreDiff > 0 ? <TrendingUp className="w-10 h-10 text-emerald-500" /> : <TrendingDown className="w-10 h-10 text-destructive" />}
            </div>
            <p className={cn("text-3xl font-bold", 
              scoreDiff > 0 ? "text-emerald-500" : scoreDiff < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {scoreDiff > 0 ? "+" : ""}{scoreDiff} points
            </p>
            <p className="text-sm text-muted-foreground">Score Improvement</p>
          </div>

          <Card className="p-8 text-center border-accent/40 bg-accent/5">
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">v{data.a1.version} (New)</p>
            <p className={cn("text-6xl font-bold", 
              data.a1.overallScore >= 80 ? "text-emerald-500" : "text-accent"
            )}>
              {data.a1.overallScore}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-muted-foreground" />
              Persona Success Delta
            </h3>
            <Card className="overflow-hidden">
              <div className="p-6 space-y-4">
                {data.runs1.map(run1 => {
                  const run2 = data.runs2.find(r => r.persona === run1.persona);
                  
                  return (
                    <div key={run1.persona} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                      <div className="font-medium">{run1.persona}</div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-[8px] uppercase font-bold text-muted-foreground mb-1">Base</p>
                          {run2?.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-[8px] uppercase font-bold text-accent mb-1">New</p>
                          {run1.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Issue Resolution
            </h3>
            <Card className="p-6">
               <div className="space-y-6">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground uppercase mb-3">Total Issues Comparison</p>
                    <div className="flex items-end gap-2">
                      <div className="flex-grow bg-muted rounded-full h-8 relative overflow-hidden">
                         <div 
                           className="absolute top-0 left-0 bg-accent/40 h-full transition-all duration-1000" 
                           style={{ width: `${Math.min(100, (data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0) / 20) * 100)}%` }}
                         ></div>
                      </div>
                      <span className="text-xl font-bold">{data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase">New Version Issues</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase">Fixed</p>
                      <p className="text-2xl font-bold text-emerald-500">
                        {Math.max(0, data.runs2.reduce((s, r) => s + r.accessibilityIssues.length, 0) - data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0))}
                      </p>
                    </div>
                    <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/20">
                      <p className="text-[10px] font-bold text-destructive uppercase">New Issues</p>
                      <p className="text-2xl font-bold text-destructive">
                        {Math.max(0, data.runs1.reduce((s, r) => s + r.accessibilityIssues.length, 0) - data.runs2.reduce((s, r) => s + r.accessibilityIssues.length, 0))}
                      </p>
                    </div>
                  </div>
               </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="flex justify-center p-24"><Loader2 className="animate-spin text-accent" /></div>}>
        <CompareContent />
      </Suspense>
    </AuthGuard>
  );
}
