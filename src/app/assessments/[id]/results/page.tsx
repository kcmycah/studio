"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun } from "@/lib/types";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Sparkles,
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
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { computeKPIs } from "@/lib/filtering";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [rawTestRuns, setRawTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  
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
        setRawTestRuns(runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestRun)));
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, db, user]);

  const kpis = useMemo(() => computeKPIs(rawTestRuns), [rawTestRuns]);

  const domainScores = useMemo(() => {
    if (!assessment) return [];
    const data = assessment.domainScores || {
      accessibility: assessment.overallScore,
      biasRisk: 0,
      transparency: 0,
      equityData: 0
    };
    
    return [
      { name: "Accessibility", score: data.accessibility, icon: ShieldCheck, color: "text-accent" },
      { name: "Bias Risk", score: data.biasRisk, icon: AlertTriangle, color: "text-amber-500" },
      { name: "Transparency", score: data.transparency, icon: Search, color: "text-emerald-500" },
      { name: "Equity-Data", score: data.equityData, icon: Database, color: "text-blue-500" },
    ];
  }, [assessment]);

  const handleGenerateAiSummary = async () => {
    if (!assessment || rawTestRuns.length === 0) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallScore: assessment.overallScore,
          systemName: system?.name || "Unknown System",
          testRunSummaries: rawTestRuns.map(r => ({
            persona: r.persona,
            success: r.success,
            accessibilityIssues: r.accessibilityIssues.map(i => ({
              id: i.id,
              description: i.description,
              impact: i.impact
            }))
          }))
        })
      });
      
      if (!res.ok) throw new Error("AI Summary service failed.");
      
      const data = await res.json();
      setAiSummary(data.executiveSummary);
      toast({ title: "Summary Generated", description: "AI analysis is now available." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Generation Error", description: err.message });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleExplainImpact = async (issue: any, persona: string) => {
    setExplainingId(issue.id);
    setExplanationPersona(persona);
    try {
      const res = await fetch("/api/explain-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          issueDescription: issue.description, 
          issueImpact: issue.impact, 
          disabilityPersona: persona 
        })
      });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err) {
      toast({ variant: "destructive", title: "AI service busy." });
    } finally {
      setExplainingId(null);
    }
  };

  const handlePlayTts = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      audioRef.current?.play();
      setIsPlaying(true);
      return;
    }

    const textToRead = aiSummary || `Assessment for ${system?.name}. Overall DISA Score is ${assessment?.overallScore}. ${kpis.criticalCount} critical issues found.`;
    
    setLoadingAudio(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead })
      });
      const data = await res.json();
      if (data.media) {
        setAudioUrl(data.media);
        setIsPlaying(true);
        setTimeout(() => audioRef.current?.play(), 100);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Audio Generation Failed" });
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user?.email || !assessment || !system) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          systemName: system.name,
          score: assessment.overallScore,
          summary: aiSummary || "Comprehensive DISA accessibility audit finalized.",
          recommendation: assessment.overallScore >= 80 ? "Maintain current standards." : "Address critical functional blockages.",
          version: assessment.version
        })
      });
      if (!res.ok) throw new Error("Email service failed.");
      toast({ title: "Report Sent", description: `Results delivered to ${user.email}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Email Error", description: err.message });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCSV = () => {
    if (!rawTestRuns.length) return;
    const headers = ["Persona", "Success", "Issue ID", "Impact", "Description", "WCAG Level"];
    const rows = rawTestRuns.flatMap(run => 
      run.accessibilityIssues.length > 0 
        ? run.accessibilityIssues.map(issue => [
            run.persona,
            run.success ? "Yes" : "No",
            issue.id,
            issue.impact,
            `"${issue.description.replace(/"/g, '""')}"`,
            issue.wcagLevel
          ])
        : [[run.persona, "Yes", "N/A", "N/A", "No issues found", "N/A"]]
    );

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `DISA-Audit-${system?.name}-v${assessment?.version}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 max-w-7xl mx-auto w-full">
          {audioUrl && (
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)} 
              className="hidden"
            />
          )}

          <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Link>
              </Button>
              <h1 className="text-4xl font-bold tracking-tight">{system?.name} <span className="text-muted-foreground font-medium text-2xl">v{assessment?.version}</span></h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Comprehensive DISA Audit • {assessment?.createdAt.toDate().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />CSV Export
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Download className="w-4 h-4 mr-2" />Print
              </Button>
              <Button 
                className="bg-accent text-white hover:bg-accent/90"
                disabled={sendingEmail}
                onClick={handleSendEmail}
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Results
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-8 flex flex-col items-center justify-center text-center bg-accent/5 border-accent/20">
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Overall DISA Score</p>
              <div className="relative">
                 <span className={cn("text-8xl font-black", (assessment?.overallScore ?? 0) >= 80 ? "text-emerald-500" : "text-accent")}>
                   {assessment?.overallScore}
                 </span>
                 <span className="text-2xl font-bold text-muted-foreground absolute -top-2 -right-12">/ 100</span>
              </div>
              <Badge variant="outline" className="mt-4 bg-background px-4 py-1">
                Weighted Framework
              </Badge>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Domain Compliance Matrix</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pt-4">
                {domainScores.map((domain) => (
                  <div key={domain.name} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <domain.icon className={cn("w-4 h-4", domain.color)} />
                        <span className="text-sm font-bold">{domain.name}</span>
                      </div>
                      <span className="text-sm font-black">{domain.score}%</span>
                    </div>
                    <Progress value={domain.score} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <Card className="lg:col-span-2 border-accent/20 shadow-lg relative overflow-hidden flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" /> 
                  AI Executive Summary
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0" 
                    onClick={handlePlayTts}
                    disabled={loadingAudio}
                  >
                    {loadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <VolumeX className="w-4 h-4 text-accent" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  {!aiSummary && !generatingSummary && (
                    <Button size="sm" variant="ghost" className="text-accent" onClick={handleGenerateAiSummary}>
                      Generate with Gemini
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                {generatingSummary ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-accent" />
                    <p className="text-sm animate-pulse">Analyzing persona outcomes and technical risks...</p>
                  </div>
                ) : aiSummary ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <p className="text-lg leading-relaxed font-medium text-foreground/90 whitespace-pre-wrap">
                      {aiSummary}
                    </p>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-muted/10 rounded-xl border border-dashed flex flex-col items-center justify-center space-y-4">
                    <BrainCircuit className="w-10 h-10 text-muted-foreground/30" />
                    <Button onClick={handleGenerateAiSummary} className="bg-accent text-white">Generate Analysis</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart4 className="w-5 h-5 text-accent" />
                  <h3 className="font-bold">Compliance Metrics</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Pass Rate</p>
                    <p className="text-2xl font-black text-emerald-500">{kpis.overallPassRate}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Criticals</p>
                    <p className="text-2xl font-black text-destructive">{kpis.criticalCount}</p>
                  </div>
                </div>
                {assessment?.details?.biasExplanation && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Bias Risk Insights</p>
                    <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-4">
                      {assessment.details.biasExplanation}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-accent" />
            Persona Success Mapping
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {rawTestRuns.map(run => (
              <Card key={run.id} className="p-4 flex flex-col gap-4 border-t-4" style={{ borderTopColor: run.success ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-md", run.success ? "bg-emerald-500/10" : "bg-destructive/10")}>
                      {run.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    </div>
                    <span className="font-bold text-sm">{run.persona}</span>
                  </div>
                </div>
                
                {run.accessibilityIssues.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">{run.accessibilityIssues[0].description}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-8 text-[10px] font-bold gap-2"
                      onClick={() => handleExplainImpact(run.accessibilityIssues[0], run.persona)}
                      disabled={explainingId === run.accessibilityIssues[0].id}
                    >
                      {explainingId === run.accessibilityIssues[0].id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                      Explain Impact
                    </Button>
                  </div>
                ) : (
                  <p className="text-[10px] italic text-muted-foreground py-2">No blockages detected.</p>
                )}
              </Card>
            ))}
          </div>

          <Dialog open={!!explanation} onOpenChange={() => setExplanation(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                  <BrainCircuit className="w-6 h-6 text-accent" /> 
                  Persona Impact Insight
                </DialogTitle>
                <DialogDescription className="text-lg font-medium">Real-world consequence for {explanationPersona}.</DialogDescription>
              </DialogHeader>
              <div className="py-6 text-foreground/90 leading-relaxed text-lg bg-accent/5 p-6 rounded-xl border border-accent/10">
                {explanation}
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </AuthGuard>
  );
}
