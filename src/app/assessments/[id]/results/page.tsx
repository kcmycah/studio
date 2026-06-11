
"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun } from "@/lib/types";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Download,
  ShieldCheck,
  Search,
  Database,
  AlertTriangle,
  Mail,
  FileSpreadsheet,
  ShieldAlert,
  Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { computeKPIs } from "@/lib/filtering";
import { generateExecutiveSummary } from "@/lib/summary";

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [rawTestRuns, setRawTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!id || !db || !user) return;
    const fetchData = async () => {
      try {
        const assessmentSnap = await getDoc(doc(db, "assessments", id as string));
        if (!assessmentSnap.exists()) {
          setLoading(false);
          return;
        }
        const assessmentData = { id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment;
        setAssessment(assessmentData);

        const systemSnap = await getDoc(doc(db, "ai_systems", assessmentData.systemId));
        if (systemSnap.exists()) setSystem({ id: systemSnap.id, ...systemSnap.data() } as AISystem);

        const q = query(collection(db, "testRuns"), where("assessmentId", "==", id));
        const runsSnap = await getDocs(q);
        const runs = runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestRun));
        setRawTestRuns(runs.sort((a, b) => a.persona.localeCompare(b.persona)));
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, db, user]);

  const kpis = useMemo(() => computeKPIs(rawTestRuns), [rawTestRuns]);

  const summary = useMemo(() => {
    if (!assessment || rawTestRuns.length === 0) return null;
    return generateExecutiveSummary(assessment.overallScore, rawTestRuns, assessment.domainScores);
  }, [assessment, rawTestRuns]);

  const domainScores = useMemo(() => {
    if (!assessment) return [];
    const data = assessment.domainScores || { accessibility: 0, biasRisk: 0, transparency: 0, equityData: 0 };
    return [
      { name: "Accessibility", score: data.accessibility, icon: ShieldCheck, color: "text-accent" },
      { name: "Bias Risk", score: data.biasRisk, icon: AlertTriangle, color: "text-amber-500" },
      { name: "Transparency", score: data.transparency, icon: Search, color: "text-emerald-500" },
      { name: "Equity-Data", score: data.equityData, icon: Database, color: "text-blue-500" },
    ];
  }, [assessment]);

  const handleSendEmail = async () => {
    if (!user?.email || !assessment || !system || !summary) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          systemName: system.name,
          score: assessment.overallScore,
          summary: summary.text,
          recommendation: summary.recommendation,
          version: assessment.version
        })
      });
      if (!res.ok) throw new Error("Email service failed.");
      toast({ title: "Briefing Delivered", description: "The executive report has been sent to your inbox." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delivery Error", description: err.message });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCSV = () => {
    if (!rawTestRuns.length) return;
    const headers = ["Persona", "Status", "Barrier Impact", "Technical Description", "WCAG Level"];
    const rows = rawTestRuns.flatMap(run => 
      run.accessibilityIssues.length > 0 
        ? run.accessibilityIssues.map(issue => [
            run.persona, 
            run.success ? "Pass" : "FAIL", 
            issue.impact.toUpperCase(), 
            `"${issue.description.replace(/"/g, '""')}"`, 
            issue.wcagLevel
          ])
        : [[run.persona, "Pass", "N/A", "Optimal performance", "N/A"]]
    );
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Executive-Audit-${system?.name}-v${assessment?.version}.csv`;
    link.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 max-w-6xl mx-auto w-full print:p-0 print:ml-0 overflow-x-hidden">
          <div className="print:hidden mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <Button variant="ghost" asChild className="mb-4 -ml-4" aria-label="Back to Workspace">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Back to Workspace</Link>
              </Button>
              <h1 className="text-4xl font-black tracking-tighter">DISA Executive Briefing</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Internal Document • Confidential • {assessment?.createdAt?.toDate?.()?.toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExportCSV} className="font-bold"><FileSpreadsheet className="w-4 h-4 mr-2" />CSV</Button>
              <Button variant="outline" onClick={() => window.print()} className="font-bold"><Download className="w-4 h-4 mr-2" />Print Report</Button>
              <Button className="bg-accent text-white hover:bg-accent/90 font-bold" disabled={sendingEmail} onClick={handleSendEmail}>
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Stakeholders
              </Button>
            </div>
          </div>

          <Card className="shadow-2xl border-2 border-border overflow-hidden print:shadow-none print:border-none bg-white text-black min-h-[1100px] flex flex-col">
            <header className="bg-black text-white p-10 md:p-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-3 max-w-full">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">System Assessment Brief</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter break-words">{system?.name} <span className="text-accent">v{assessment?.version}</span></h2>
                <p className="text-sm font-medium opacity-80 break-all">{system?.url}</p>
              </div>
              <div className="text-left md:text-right flex flex-col items-start md:items-end shrink-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Overall DISA Score</div>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-7xl md:text-8xl font-black leading-none", (assessment?.overallScore ?? 0) >= 80 ? "text-emerald-500" : (assessment?.overallScore ?? 0) >= 60 ? "text-amber-500" : "text-accent")}>{assessment?.overallScore}</span>
                  <span className="text-2xl font-bold opacity-40">/100</span>
                </div>
              </div>
            </header>

            <div className="p-10 md:p-14 space-y-14 flex-grow">
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-14 border-b border-black/5 pb-14">
                <div className="lg:col-span-2 space-y-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">I. Executive Summary</h3>
                  <div className="prose prose-lg max-w-none text-black">
                    <p className="text-xl leading-relaxed font-semibold break-words">{summary?.text}</p>
                  </div>
                  <div className="bg-accent/5 border-l-4 border-accent p-8 rounded-r-2xl shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-[0.2em] mb-3">Strategic Mandate</h4>
                    <p className="text-lg italic font-extrabold text-black/90 leading-tight">{summary?.recommendation}</p>
                  </div>
                </div>
                <div className="bg-muted/30 p-8 rounded-2xl border border-black/5 flex flex-col gap-8 h-fit">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">Domain Performance</h4>
                   <div className="space-y-6">
                     {domainScores.map(domain => (
                       <div key={domain.name} className="space-y-3">
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-bold tracking-tight">{domain.name}</span>
                             <span className="text-sm font-black">{domain.score}%</span>
                          </div>
                          <Progress value={domain.score} className="h-1.5 bg-black/5" />
                       </div>
                     ))}
                   </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-14 border-b border-black/5 pb-14">
                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">II. Problem Definition</h3>
                   <p className="text-lg leading-relaxed text-black/80 font-medium break-words">{summary?.problemStatement}</p>
                   <div className="flex flex-wrap gap-2 mt-4">
                      {rawTestRuns.filter(r => !r.success).map(r => (
                        <Badge key={r.id} variant="outline" className="border-accent text-accent font-black text-[10px] py-1.5 px-3 uppercase tracking-wider">BLOCKAGE: {r.persona}</Badge>
                      ))}
                   </div>
                </div>
                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">III. Mitigation Strategy</h3>
                   <p className="text-lg leading-relaxed text-black/80 font-medium break-words">{summary?.solutionStrategy}</p>
                   <div className="mt-6 flex gap-4">
                      <div className="flex-1 bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 shadow-sm">
                         <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Functional Pass Rate</p>
                         <p className="text-3xl font-black text-emerald-600">{kpis.overallPassRate}%</p>
                      </div>
                      <div className="flex-1 bg-accent/5 p-5 rounded-2xl border border-accent/10 shadow-sm">
                         <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">Critical Failures</p>
                         <p className="text-3xl font-black text-accent">{kpis.criticalCount}</p>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-10">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">IV. Persona Parity Analysis</h3>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {rawTestRuns.map(run => (
                      <div key={run.id} className={cn("p-5 rounded-2xl border text-center flex flex-col items-center gap-4 transition-all shadow-sm", run.success ? "bg-white border-black/10" : "bg-accent/5 border-accent/20")}>
                         <div className={cn("p-2.5 rounded-full", run.success ? "bg-emerald-500/10 text-emerald-600" : "bg-accent/10 text-accent")}>
                            {run.success ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                         </div>
                         <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase leading-none tracking-tight break-words">{run.persona}</p>
                           <p className={cn("text-[9px] font-bold uppercase tracking-widest", run.success ? "text-emerald-600" : "text-accent")}>{run.success ? "Compliant" : "At Risk"}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </section>

              <footer className="pt-14 mt-14 border-t border-black/10 text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-40">
                  End of Executive Briefing • DISA Framework v2.4 • Confidential Document
                </p>
              </footer>
            </div>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
