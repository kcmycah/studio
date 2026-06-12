
"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, limit } from "firebase/firestore";
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
  Mail,
  FileSpreadsheet,
  ShieldAlert,
  Briefcase,
  ExternalLink,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { computeKPIs } from "@/lib/filtering";
import { generateExecutiveSummary } from "@/lib/executiveSummary";
import { generatePersonaConclusion } from "@/lib/personaConclusion";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AssessmentResultsPage() {
  const params = useParams();
  const systemId = params?.systemId as string;
  const assessmentId = params?.assessmentId as string;
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [rawTestRuns, setRawTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!systemId || !assessmentId || !db || !user) return;
    
    const assessmentRef = doc(db, "ai_systems", systemId, "assessments", assessmentId);
    const systemRef = doc(db, "ai_systems", systemId);

    Promise.all([
      getDoc(assessmentRef),
      getDoc(systemRef)
    ]).then(async ([assessmentSnap, systemSnap]) => {
      if (!assessmentSnap.exists()) {
        setLoading(false);
        return;
      }
      
      const assessmentData = { id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment;
      setAssessment(assessmentData);
      
      if (systemSnap.exists()) {
        setSystem({ id: systemSnap.id, ...systemSnap.data() } as AISystem);
      }

      const q = query(
        collection(db, "testRuns"), 
        where("assessmentId", "==", assessmentId),
        where("userId", "==", user.uid),
        limit(100)
      );
      
      getDocs(q).then(runsSnap => {
        const runs = runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestRun));
        setRawTestRuns(runs.sort((a, b) => a.persona.localeCompare(b.persona)));
      }).catch(err => {
        console.error("Test runs fetch error:", err);
      });

    }).catch(async (err) => {
      console.error("Fetch error:", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assessmentRef.path,
        operation: 'get'
      }));
    }).finally(() => {
      setLoading(false);
    });
  }, [systemId, assessmentId, db, user]);

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

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !summary?.summaryText) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(summary.summaryText);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendEmail = async () => {
    if (!user?.email || !assessment || !system || !summary) return;
    setSendingEmail(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      const element = document.querySelector('.print-report') as HTMLElement;
      if (!element) throw new Error("Report element not found");

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: user.email,
          systemName: system.name,
          overallScore: assessment.overallScore,
          version: assessment.version,
          summaryText: summary.summaryText,
          recommendation: summary.recommendation,
          performanceLevel: summary.performanceLevel,
          testRuns: rawTestRuns.map(r => ({ persona: r.persona, success: r.success })),
          pdfAttachment: pdfBase64
        })
      });
      if (!res.ok) throw new Error("Email dispatch failed");
      toast({ title: "Briefing Delivered", description: `Report sent to ${user.email}.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delivery Error", description: err.message });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCSV = async () => {
    if (!assessment || rawTestRuns.length === 0) return;
    setExportingCsv(true);
    try {
      const res = await fetch("/api/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemName: system?.name, assessment, testRuns: rawTestRuns })
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DISA-Audit-${system?.name.replace(/\s+/g, '-')}.csv`;
      link.click();
      toast({ title: "CSV Downloaded" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export Error", description: err.message });
    } finally {
      setExportingCsv(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-6xl mx-auto w-full print:p-0 print:ml-0 overflow-x-hidden">
          <div className="print:hidden mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Back to Workspace</Link>
              </Button>
              <h1 className="text-4xl font-black tracking-tighter">Executive Briefing</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExportCSV} disabled={exportingCsv}>
                {exportingCsv ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                CSV Log
              </Button>
              <Button className="bg-accent text-white hover:bg-accent/90" disabled={sendingEmail} onClick={handleSendEmail}>
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Briefing + PDF
              </Button>
            </div>
          </div>

          <Card className="print-report shadow-2xl border-2 border-border overflow-hidden print:shadow-none print:border-none bg-white text-black min-h-[1100px] flex flex-col">
            <header className="report-header bg-black text-white p-14 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Compliance Disclosure</p>
                <h2 className="text-5xl font-black tracking-tighter">{system?.name} <span className="text-accent">v{assessment?.version}</span></h2>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">DISA Score</div>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-8xl font-black leading-none", (assessment?.overallScore ?? 0) >= 80 ? "text-emerald-500" : "text-accent")}>{assessment?.overallScore}</span>
                  <span className="text-2xl font-bold opacity-40">/100</span>
                </div>
              </div>
            </header>

            <div className="p-14 space-y-14 flex-grow">
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-14 border-b pb-14">
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">I. Executive Summary</h3>
                    <Button variant="ghost" size="sm" onClick={handleSpeak} className="h-8 text-[10px] font-black uppercase tracking-widest text-accent print:hidden">
                      {isSpeaking ? "Stop" : "Hear Summary"}
                    </Button>
                  </div>
                  <p className="text-xl leading-relaxed font-semibold">{summary?.summaryText}</p>
                  <div className={cn("border-l-4 p-8 rounded-r-2xl", summary?.color === 'red' ? "bg-red-50 border-red-500" : "bg-green-50 border-green-500")}>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3">Strategic Recommendation</h4>
                    <p className="text-lg italic font-extrabold text-black/90 leading-tight">{summary?.recommendation}</p>
                  </div>
                </div>
                <div className="bg-muted/30 p-8 rounded-2xl border flex flex-col gap-8 h-fit">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2">Domain Performance</h4>
                   <div className="space-y-6">
                     {[
                       { name: "Accessibility", score: assessment?.domainScores?.accessibility ?? 0 },
                       { name: "Bias Risk", score: assessment?.domainScores?.biasRisk ?? 0 },
                       { name: "Transparency", score: assessment?.domainScores?.transparency ?? 0 },
                       { name: "Equity-Data", score: assessment?.domainScores?.equityData ?? 0 },
                     ].map(domain => (
                       <div key={domain.name} className="space-y-3">
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-bold">{domain.name}</span>
                             <span className="text-sm font-black">{domain.score}%</span>
                          </div>
                          <Progress value={domain.score} className="h-1.5 bg-black/5" />
                       </div>
                     ))}
                   </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-14 border-b pb-14">
                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2">II. Functional Barrier Analysis</h3>
                   <div className="bg-accent/5 p-6 rounded-2xl border border-accent/10">
                     <p className="text-lg leading-relaxed text-black/80 font-medium">Functional pass rate: <span className="font-black text-accent">{kpis.overallPassRate}%</span>.</p>
                     <div className="flex flex-wrap gap-2 mt-4">
                        {rawTestRuns.filter(r => !r.success).map(r => (
                          <Badge key={r.id} variant="outline" className="border-accent text-accent font-black text-[10px] uppercase">RISK: {r.persona}</Badge>
                        ))}
                     </div>
                   </div>
                </div>
                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2">III. Compliance Statistics</h3>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="bg-black/5 p-4 rounded-xl text-center">
                        <p className="text-[9px] font-black text-black/40 uppercase">WCAG A</p>
                        <p className="text-2xl font-black">{kpis.totalA}</p>
                      </div>
                      <div className="bg-black/5 p-4 rounded-xl text-center">
                        <p className="text-[9px] font-black text-black/40 uppercase">WCAG AA</p>
                        <p className="text-2xl font-black">{kpis.totalAA}</p>
                      </div>
                      <div className="bg-black/5 p-4 rounded-xl text-center border-l border-red-100">
                        <p className="text-[9px] font-black text-black/40 uppercase">Critical</p>
                        <p className="text-2xl font-black text-red-600">{kpis.criticalCount}</p>
                      </div>
                   </div>
                </div>
              </section>
            </div>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
