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
  const { user } = useUser();
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
    if (!db || !user || !v1Id || !v2Id || !systemId) return;

    const fetchData = async () => {
      try {
        const sysRef = doc(db, "ai_systems", systemId as string);
        const a1Ref = doc(db, "ai_systems", systemId as string, "assessments", v1Id);
        const a2Ref = doc(db, "ai_systems", systemId as string, "assessments", v2Id);

        const [sysSnap, a1Snap, a2Snap] = await Promise.all([
          getDoc(sysRef),
          getDoc(a1Ref),
          getDoc(a2Ref)
        ]);

        if (!sysSnap.exists() || !a1Snap.exists() || !a2Snap.exists()) return;

        const runs1Query = query(collection(db, "testRuns"), where("assessmentId", "==", v1Id), where("userId", "==", user.uid));
        const runs2Query = query(collection(db, "testRuns"), where("assessmentId", "==", v2Id), where("userId", "==", user.uid));

        const [runs1Snap, runs2Snap] = await Promise.all([
          getDocs(runs1Query),
          getDocs(runs2Query)
        ]);

        setData({
          system: { id: sysSnap.id, ...sysSnap.data() } as AISystem,
          a1: { id: a1Snap.id, ...a1Snap.data() } as Assessment,
          a2: { id: a2Snap.id, ...a2Snap.data() } as Assessment,
          runs1: runs1Snap.docs.map(d => ({ id: d.id, ...d.data() } as TestRun)),
          runs2: runs2Snap.docs.map(d => ({ id: d.id, ...d.data() } as TestRun))
        });
      } catch (err) {
        console.error("Comparison data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, user, systemId, v1Id, v2Id]);

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-accent" /></div>;
  if (!data) return <div className="p-8">Comparison data not found.</div>;

  const scoreDiff = data.a1.overallScore - data.a2.overallScore;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/systems/${systemId}/versions`}><ArrowLeft className="w-4 h-4 mr-2" />Back to History</Link>
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">Version Comparison</h1>
            <p className="text-muted-foreground text-lg mt-2">{data.system.name} • v{data.a2.version} vs v{data.a1.version}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="p-8 text-center"><p className="text-xs font-bold uppercase mb-2">v{data.a2.version}</p><p className="text-6xl font-bold text-muted-foreground">{data.a2.overallScore}</p></Card>
          <div className="flex flex-col items-center justify-center">
            <p className={cn("text-3xl font-bold", scoreDiff > 0 ? "text-emerald-500" : "text-destructive")}>{scoreDiff > 0 ? "+" : ""}{scoreDiff} pts</p>
          </div>
          <Card className="p-8 text-center bg-accent/5"><p className="text-xs font-bold uppercase mb-2">v{data.a1.version}</p><p className="text-6xl font-bold text-accent">{data.a1.overallScore}</p></Card>
        </div>
      </main>
    </div>
  );
}

export default function ComparePage() {
  return <AuthGuard><Suspense><CompareContent /></Suspense></AuthGuard>;
}
