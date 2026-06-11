"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun } from "@/lib/types";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ArrowLeft,
  Activity,
  Download,
  ShieldCheck,
  Search,
  Database,
  AlertTriangle,
  BrainCircuit,
  BarChart4,
  FileText,
  Mail,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Info,
  ChevronRight,
  ShieldAlert,
  Zap,
  Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { computeKPIs } from "@/lib/filtering";
import { generateExecutiveSummary } from "@/lib/summary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [rawTestRuns, setRawTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationPersona, setExplanationPersona] = useState<string | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        ? run.accessibilityIssues.map(issue => [run.persona, run.success ? "Pass" : "FAIL", issue.impact.toUpperCase(), `"${issue.description.replace(/"/g, '""')}"`, issue.wcagLevel])
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
        <main className="flex-1 md:ml-[260px] p-8 max-w-6xl mx-auto w-full print:p-0 print:ml-0">
          <div className="print:hidden mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Back to Workspace</Link>
              </Button>
              <h1 className="text-4xl font-black tracking-tighter">DISA Executive Briefing</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Internal Document • Confidential • {assessment?.createdAt.toDate().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV} className="font-bold"><FileSpreadsheet className="w-4 h-4 mr-2" />CSV</Button>
              <Button variant="outline" onClick={() => window.print()} className="font-bold"><Download className="w-4 h-4 mr-2" />Print Report</Button>
              <Button className="bg-accent text-white hover:bg-accent/90 font-bold" disabled={sendingEmail} onClick={handleSendEmail}>
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Stakeholders
              </Button>
            </div>
          </div>

          <Card className="shadow-2xl border-2 border-border overflow-hidden print:shadow-none print:border-none bg-white text-black min-h-[1000px]">
            <div className="bg-black text-white p-12 flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Assessment Brief</p>
                <h2 className="text-5xl font-black tracking-tighter">{system?.name} <span className="text-accent">v{assessment?.version}</span></h2>
                <p className="text-sm font-medium opacity-80">{system?.url}</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="text-[10px] font-black uppercase tracking-widest mb-2">Overall DISA Score</div>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-8xl font-black", (assessment?.overallScore ?? 0) >= 80 ? "text-emerald-500" : (assessment?.overallScore ?? 0) >= 60 ? "text-amber-500" : "text-accent")}>{assessment?.overallScore}</span>
                  <span className="text-2xl font-bold opacity-40">/100</span>
                </div>
              </div>
            </div>

            <div className="p-12 space-y-12">
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-b pb-12">
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b pb-2">I. Executive Summary</h3>
                  <p className="text-xl leading-relaxed font-medium text-black/90">{summary?.text}</p>
                  <div className="bg-accent/5 border-l-4 border-accent p-6 rounded-r-xl">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-2">Mandatory Recommendation</h4>
                    <p className="text-lg italic font-bold text-black/80">{summary?.recommendation}</p>
                  </div>
                </div>
                <div className="bg-muted/30 p-8 rounded-2xl border flex flex-col gap-6 h-fit">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-2">Domain Compliance</h4>
                   {domainScores.map(domain => (
                     <div key={domain.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                           <span className="text-xs font-bold">{domain.name}</span>
                           <span className="text-sm font-black">{domain.score}%</span>
                        </div>
                        <Progress value={domain.score} className="h-1 bg-black/10" />
                     </div>
                   ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-16 border-b pb-12">
                <div className="space-y-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b pb-2">II. Problem Definition</h3>
                   <p className="text-lg leading-relaxed text-black/70 font-medium">{summary?.problemStatement}</p>
                   <div className="flex flex-wrap gap-2 mt-4">
                      {rawTestRuns.filter(r => !r.success).map(r => (
                        <Badge key={r.id} variant="outline" className="border-accent text-accent font-black text-[10px] py-1 px-3">BLOCKAGE: {r.persona.toUpperCase()}</Badge>
                      ))}
                   </div>
                </div>
                <div className="space-y-4">
                   <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b pb-2">III. Mitigation Strategy</h3>
                   <p className="text-lg leading-relaxed text-black/70 font-medium">{summary?.solutionStrategy}</p>
                   <div className="mt-4 flex gap-4">
                      <div className="flex-1 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                         <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">Pass Rate</p>
                         <p className="text-2xl font-black text-emerald-500">{kpis.overallPassRate}%</p>
                      </div>
                      <div className="flex-1 bg-accent/5 p-4 rounded-xl border border-accent/20">
                         <p className="text-[9px] font-black text-accent uppercase mb-1">Critical Failures</p>
                         <p className="text-2xl font-black text-accent">{kpis.criticalCount}</p>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-8">
                 <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b pb-2">IV. Persona Parity Mapping</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {rawTestRuns.map(run => (
                      <div key={run.id} className={cn("p-4 rounded-xl border text-center flex flex-col items-center gap-3 transition-all", run.success ? "bg-white border-border" : "bg-accent/5 border-accent/20")}>
                         <div className={cn("p-2 rounded-full", run.success ? "bg-emerald-500/10 text-emerald-600" : "bg-accent/10 text-accent")}>
                            {run.success ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                         </div>
                         <p className="text-[10px] font-black uppercase leading-tight">{run.persona}</p>
                         <p className={cn("text-[9px] font-bold uppercase", run.success ? "text-emerald-600" : "text-accent")}>{run.success ? "Compliant" : "At Risk"}</p>
                      </div>
                    ))}
                 </div>
              </section>

              <div className="pt-12 mt-12 border-t text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">
                End of Executive Briefing • DISA Framework v2.4 • Confidential
              </div>
            </div>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
