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
  Mail,
  FileSpreadsheet,
  ShieldAlert,
  Briefcase,
  PlayCircle,
  ExternalLink,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { computeKPIs } from "@/lib/filtering";
import { generateExecutiveSummary } from "@/lib/executiveSummary";
import { generatePersonaConclusion } from "@/lib/personaConclusion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [exportingCsv, setExportingCsv] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

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
    
    const issuesMap = new Map<string, { id: string; impact: string; count: number }>();
    rawTestRuns.forEach(run => {
      (run.accessibilityIssues || []).forEach(issue => {
        if (issuesMap.has(issue.id)) {
          issuesMap.get(issue.id)!.count++;
        } else {
          issuesMap.set(issue.id, { id: issue.id, impact: issue.impact, count: 1 });
        }
      });
    });
    const topIssues = Array.from(issuesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const passedCount = rawTestRuns.filter(run => run.success).length;
    return generateExecutiveSummary(
      assessment.overallScore,
      passedCount,
      rawTestRuns.length,
      topIssues
    );
  }, [assessment, rawTestRuns]);

  const handleTts = async () => {
    if (!summary?.summaryText) return;
    setTtsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary.summaryText })
      });
      const data = await res.json();
      if (data.media) setAudioUrl(data.media);
    } catch (err) {
      toast({ variant: "destructive", title: "Audio failed to generate." });
    } finally {
      setTtsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user?.email || !id) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: id,
          recipientEmail: user.email
        })
      });
      if (!res.ok) throw new Error("Email service failed.");
      toast({ title: "Briefing Delivered", description: `The executive report has been sent to ${user.email}.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delivery Error", description: err.message });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCSV = async () => {
    if (!id) return;
    setExportingCsv(true);
    try {
      const res = await fetch("/api/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: id })
      });
      if (!res.ok) throw new Error("Export failed.");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DISA-Detailed-Report-${system?.name || 'report'}-${id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV Generated", description: "Your detailed audit log has been downloaded." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export Error", description: err.message });
    } finally {
      setExportingCsv(false);
    }
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
              <Button variant="outline" onClick={handleExportCSV} disabled={exportingCsv} className="font-bold">
                {exportingCsv ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                Export Detailed CSV
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="font-bold"><Download className="w-4 h-4 mr-2" />Print Briefing</Button>
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
                <p className="text-sm font-medium opacity-80 break-all flex items-center gap-2">
                  <ExternalLink className="w-3 h-3" /> {system?.url}
                </p>
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
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">I. Executive Summary</h3>
                    <Button variant="ghost" size="sm" onClick={handleTts} disabled={ttsLoading} className="h-8 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/10">
                      {ttsLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <PlayCircle className="w-3 h-3 mr-1" />}
                      Hear Summary
                    </Button>
                  </div>
                  
                  {audioUrl && (
                    <div className="bg-muted p-2 rounded-lg mb-4 print:hidden">
                      <audio controls className="w-full h-8" src={audioUrl}>
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  <div className="prose prose-lg max-w-none text-black">
                    <p className="text-xl leading-relaxed font-semibold break-words">
                      {summary?.summaryText}
                    </p>
                  </div>

                  <div className={cn("border-l-4 p-8 rounded-r-2xl shadow-sm", 
                    summary?.color === 'red' ? "bg-red-50 border-red-500" : 
                    summary?.color === 'orange' ? "bg-orange-50 border-orange-500" : 
                    summary?.color === 'yellow' ? "bg-yellow-50 border-yellow-500" : 
                    "bg-green-50 border-green-500"
                  )}>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3">Strategic Recommendation</h4>
                    <p className="text-lg italic font-extrabold text-black/90 leading-tight">
                      {summary?.recommendation}
                    </p>
                    <p className="mt-4 text-[10px] text-black/40 font-bold uppercase tracking-widest">
                      * Automated testing catches 30-40% of accessibility issues. Manual testing with diverse user cohorts is mandatory for full compliance.
                    </p>
                  </div>
                </div>

                <div className="bg-muted/30 p-8 rounded-2xl border border-black/5 flex flex-col gap-8 h-fit">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">Domain Performance</h4>
                   <div className="space-y-6">
                     {[
                       { name: "Accessibility", score: assessment?.domainScores?.accessibility ?? 0 },
                       { name: "Bias Risk", score: assessment?.domainScores?.biasRisk ?? 0 },
                       { name: "Transparency", score: assessment?.domainScores?.transparency ?? 0 },
                       { name: "Equity-Data", score: assessment?.domainScores?.equityData ?? 0 },
                     ].map(domain => (
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
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">II. Functional Analysis</h3>
                   <div className="bg-accent/5 p-6 rounded-2xl border border-accent/10">
                     <p className="text-lg leading-relaxed text-black/80 font-medium">
                       Functional pass rate of <span className="font-black text-accent">{kpis.overallPassRate}%</span> across primary disability personas identifies significant parity gaps in current deployment.
                     </p>
                     <div className="flex flex-wrap gap-2 mt-4">
                        {rawTestRuns.filter(r => !r.success).map(r => (
                          <Badge key={r.id} variant="outline" className="border-accent text-accent font-black text-[10px] py-1 px-3 uppercase">BLOCKAGE: {r.persona}</Badge>
                        ))}
                     </div>
                   </div>
                </div>
                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">III. Compliance Metrics</h3>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="bg-black/5 p-4 rounded-xl text-center">
                        <p className="text-[9px] font-black text-black/40 uppercase mb-1">WCAG A</p>
                        <p className="text-2xl font-black">{kpis.totalA}</p>
                      </div>
                      <div className="bg-black/5 p-4 rounded-xl text-center">
                        <p className="text-[9px] font-black text-black/40 uppercase mb-1">WCAG AA</p>
                        <p className="text-2xl font-black">{kpis.totalAA}</p>
                      </div>
                      <div className="bg-black/5 p-4 rounded-xl text-center border-l border-red-100">
                        <p className="text-[9px] font-black text-black/40 uppercase mb-1">Critical</p>
                        <p className="text-2xl font-black text-red-600">{kpis.criticalCount}</p>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-10">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-black/10 pb-2">IV. Persona Success Mapping</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rawTestRuns.map(run => {
                      const conclusion = generatePersonaConclusion(run);
                      return (
                        <Card key={run.id} className={cn("p-6 rounded-2xl border flex flex-col gap-4 transition-all shadow-sm h-full", run.success ? "bg-white border-black/10" : "bg-red-50 border-red-100")}>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                               <p className="text-sm font-black uppercase tracking-tight">{run.persona}</p>
                               <Badge variant={run.success ? "secondary" : "outline"} className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5", run.success ? "bg-emerald-500/10 text-emerald-600 border-none" : "text-red-600 border-red-200")}>
                                 {run.success ? "Compliant" : "At Risk"}
                               </Badge>
                            </div>
                            <div className={cn("p-2 rounded-full", run.success ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                               {run.success ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-black/70 leading-relaxed italic">
                              "{conclusion}"
                            </p>
                            {run.accessibilityIssues.length > 0 && (
                              <div className="pt-2 border-t border-black/5">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Key Barriers:</p>
                                <ul className="space-y-1">
                                  {run.accessibilityIssues.slice(0, 2).map((issue, idx) => (
                                    <li key={idx} className="text-[10px] flex items-center gap-1.5 font-bold">
                                      <span className={cn("w-1.5 h-1.5 rounded-full", issue.impact === 'critical' ? 'bg-red-500' : 'bg-amber-500')} />
                                      {issue.description.substring(0, 50)}...
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
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
