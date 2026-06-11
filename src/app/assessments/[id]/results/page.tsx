
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun, ImpactLevel, WCAGLevel, UserProfile } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  FileDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  Loader2,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  Filter,
  BarChart3,
  Mail,
  Send,
  HelpCircle,
  Download,
  BrainCircuit,
  Volume2,
  VolumeX,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { generateExecutiveSummary } from "@/lib/summary";
import { filterTestRuns, computeKPIs, FilterCriteria } from "@/lib/filtering";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [rawTestRuns, setRawTestRuns] = useState<TestRun[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // AI State
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationPersona, setExplanationPersona] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // Audio State
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filtering state
  const [filters, setFilters] = useState<FilterCriteria>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!id || !db || !user) return;
    const fetchData = async () => {
      try {
        const [assessmentSnap, profileSnap] = await Promise.all([
          getDoc(doc(db, "assessments", id as string)),
          getDoc(doc(db, "users", user.uid))
        ]);

        if (profileSnap.exists()) {
          setUserProfile({ id: profileSnap.id, ...profileSnap.data() } as UserProfile);
        }

        if (!assessmentSnap.exists()) {
          setLoading(false);
          return;
        }
        const assessmentData = { id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment;
        setAssessment(assessmentData);

        const systemSnap = await getDoc(doc(db, "ai_systems", assessmentData.systemId));
        if (systemSnap.exists()) {
          setSystem({ id: systemSnap.id, ...systemSnap.data() } as AISystem);
        }

        const q = query(collection(db, "testRuns"), where("assessmentId", "==", id));
        const runsSnap = await getDocs(q);
        setRawTestRuns(runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestRun)));
      } catch (err) {
        console.error("Error fetching assessment results:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, db, user]);

  const handleExplainImpact = async (issue: any, persona: string) => {
    setExplainingId(issue.id);
    setExplanationPersona(persona);
    setExplanation(null);

    try {
      const response = await fetch("/api/explain-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueDescription: issue.description,
          issueImpact: issue.impact,
          disabilityPersona: persona
        })
      });

      if (!response.ok) throw new Error("Failed to generate AI insight.");
      
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "AI Insight Failed",
        description: err.message
      });
      setExplainingId(null);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!isPro) {
      toast({ title: "Pro Feature", description: "Upgrade to Pro for AI-powered deep-dive summaries." });
      return;
    }

    setAiSummaryLoading(true);
    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallScore: assessment?.overallScore,
          systemName: system?.name,
          testRunSummaries: rawTestRuns.map(r => ({
            persona: r.persona,
            success: r.success,
            accessibilityIssues: r.accessibilityIssues
          }))
        })
      });

      if (!response.ok) throw new Error("AI Summary failed");
      const data = await response.json();
      setAiSummary(data.executiveSummary);
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Error", description: err.message });
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleListenToSummary = async () => {
    const textToRead = aiSummary || summary?.text;
    if (!textToRead) return;

    if (audioUrl) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    setTtsLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead })
      });

      if (!response.ok) throw new Error("TTS failed");
      const { media } = await response.json();
      setAudioUrl(media);
      setIsPlaying(true);
      
      // Auto-play
      setTimeout(() => {
        audioRef.current?.play();
      }, 100);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Voice Error", description: err.message });
    } finally {
      setTtsLoading(false);
    }
  };

  // Apply filters to test runs
  const filteredRuns = useMemo(() => {
    return filterTestRuns(rawTestRuns, filters);
  }, [rawTestRuns, filters]);

  // Compute KPIs
  const kpis = useMemo(() => {
    return computeKPIs(filteredRuns);
  }, [filteredRuns]);

  // Aggregate issues for the table
  const topIssues = useMemo(() => {
    const issuesMap = new Map<string, { impact: string; count: number; description: string }>();
    filteredRuns.forEach(run => {
      run.accessibilityIssues.forEach(issue => {
        const existing = issuesMap.get(issue.id);
        if (existing) {
          existing.count += 1;
        } else {
          issuesMap.set(issue.id, { impact: issue.impact, count: 1, description: issue.description });
        }
      });
    });

    const impactWeight = { critical: 4, serious: 3, moderate: 2, minor: 1 };
    
    return Array.from(issuesMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        const diff = impactWeight[b.impact as keyof typeof impactWeight] - impactWeight[a.impact as keyof typeof impactWeight];
        if (diff !== 0) return diff;
        return b.count - a.count;
      })
      .slice(0, 10);
  }, [filteredRuns]);

  const summary = useMemo(() => {
    if (!assessment || rawTestRuns.length === 0) return null;
    return generateExecutiveSummary(assessment.overallScore, rawTestRuns, topIssues);
  }, [assessment, rawTestRuns, topIssues]);

  const isPro = userProfile?.subscriptionStatus === 'pro' || userProfile?.subscriptionStatus === 'enterprise';

  const handleEmailResults = async () => {
    if (!user?.email || !system || !assessment || !summary) return;
    
    setEmailLoading(true);
    try {
      const response = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          systemName: system.name,
          score: assessment.overallScore,
          summary: aiSummary || summary.text,
          recommendation: summary.recommendation,
          version: assessment.version
        })
      });

      if (!response.ok) throw new Error("Failed to send email");

      toast({
        title: "Report Delivered",
        description: `Audit findings have been sent to ${user.email}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Email Failed",
        description: "We couldn't deliver the report.",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!isPro) {
      toast({
        title: "Pro Feature",
        description: "Upgrade to Pro to export audit data to CSV.",
      });
      return;
    }

    const headers = ["Persona", "Success", "Issue ID", "Impact", "Description"];
    const rows = filteredRuns.flatMap(run => 
      run.accessibilityIssues.map(issue => [
        run.persona,
        run.success ? "YES" : "NO",
        issue.id,
        issue.impact,
        issue.description.replace(/,/g, " ")
      ])
    );

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DISA-Audit-${system?.name}-v${assessment?.version}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading Audit Findings...</p>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <Navbar />
      <TooltipProvider>
        <main className="container mx-auto px-4 py-12 max-w-7xl">
          <audio 
            ref={audioRef} 
            src={audioUrl || ""} 
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />

          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-6 h-6 text-primary" />
                <Badge variant="outline" className="text-primary border-primary">DISA Framework Audit</Badge>
              </div>
              <h1 className="font-headline text-4xl font-bold">{system?.name || "AI System"} v{assessment?.version} Report</h1>
              <p className="text-muted-foreground mt-1">
                Audit conducted on {mounted && assessment ? assessment.createdAt.toDate().toLocaleString() : ""}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="h-11" onClick={handleEmailResults} disabled={emailLoading}>
                {emailLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Results
              </Button>
              <Button variant="outline" className="h-11" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV Export { !isPro && <Badge className="ml-2 scale-75 bg-primary text-[8px]">PRO</Badge> }
              </Button>
              <Button className="h-11" asChild>
                <Link href={`/systems/${system?.id}/versions`}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  History
                </Link>
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Overall Score", value: assessment?.overallScore, color: "text-primary", tip: "Composite score weighting technical errors vs functional completion." },
              { label: "Pass Rate", value: `${kpis.overallPassRate}%`, color: kpis.overallPassRate >= 80 ? "text-emerald-400" : "text-destructive", tip: "Percentage of personas who successfully completed their tasks." },
              { label: "Critical Issues", value: kpis.criticalCount, color: kpis.criticalCount > 0 ? "text-destructive" : "text-emerald-400", tip: "Issues that completely block users from finishing a task." },
              { label: "WCAG A", value: kpis.totalA, color: "text-orange-400", tip: "Level A: Fundamental accessibility requirements." },
              { label: "WCAG AA", value: kpis.totalAA, color: "text-yellow-400", tip: "Level AA: Standard compliance for most regulations." }
            ].map((kpi, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <Card className="glass-morphism p-4 text-center cursor-help">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      {kpi.label} <HelpCircle className="w-2.5 h-2.5" />
                    </p>
                    <p className={cn("text-2xl font-headline font-bold", kpi.color)}>{kpi.value}</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>{kpi.tip}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <Card className="lg:col-span-2 glass-morphism border-primary/20 p-6 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-headline text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Audit Summary
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs gap-2" 
                    onClick={handleListenToSummary}
                    disabled={ttsLoading}
                  >
                    {ttsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isPlaying ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    {isPlaying ? "Pause Summary" : "Listen to Summary"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs gap-2" 
                    onClick={handleGenerateAiSummary}
                    disabled={aiSummaryLoading}
                  >
                    {aiSummaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                    AI Deep-Dive { !isPro && <Badge className="scale-75 bg-primary/20 text-primary">PRO</Badge> }
                  </Button>
                </div>
              </div>

              <div className="space-y-4 flex-grow">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {aiSummary ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-lg leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                    </div>
                  ) : summary && (
                    <p className="text-lg leading-relaxed">{summary.text}</p>
                  )}
                </div>
                
                {summary && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mt-auto">
                    <p className="font-bold text-sm text-primary uppercase mb-1">Recommendation</p>
                    <p className="italic text-muted-foreground">{summary.recommendation}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="glass-morphism border-primary/10 p-6">
              <h3 className="font-headline text-xl font-bold mb-4">Top Issues Detected</h3>
              <div className="space-y-4">
                {topIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between pb-3 border-b border-border/50 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold uppercase">{issue.id.replace(/-/g, ' ')}</span>
                        <Badge variant="outline" className="text-[9px] h-4 uppercase">{issue.impact}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{issue.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-headline font-bold text-primary">{issue.count}</span>
                    </div>
                  </div>
                ))}
                {topIssues.length === 0 && <p className="text-muted-foreground italic text-center py-8">No issues found.</p>}
              </div>
            </Card>
          </div>

          <section className="mb-12">
             <div className="flex items-center justify-between mb-6">
               <h2 className="font-headline text-2xl font-bold">Persona Results Detail</h2>
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                 <BrainCircuit className="w-4 h-4 text-primary" />
                 AI Persona Insights Available
               </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredRuns.map(run => (
                 <Card key={run.id} className={cn("glass-morphism border-primary/5 p-5 flex flex-col", !run.success && "border-destructive/30")}>
                   <div className="flex justify-between items-start mb-4">
                     <h4 className="font-bold">{run.persona}</h4>
                     {run.success ? (
                       <Badge className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">PASSED</Badge>
                     ) : (
                       <Badge className="bg-destructive/10 text-destructive border-destructive/20">FAILED</Badge>
                     )}
                   </div>
                   <div className="space-y-3 flex-grow">
                     <p className="text-xs text-muted-foreground">Found {run.accessibilityIssues.length} issues.</p>
                     {run.accessibilityIssues.slice(0, 3).map((issue, idx) => (
                       <div key={idx} className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                         <div className="flex items-center justify-between gap-2 mb-1">
                           <span className="font-bold uppercase text-[9px] text-primary">[{issue.impact}]</span>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-5 px-1 text-[8px] hover:text-primary"
                             onClick={() => handleExplainImpact(issue, run.persona)}
                             disabled={explainingId === issue.id}
                           >
                             {explainingId === issue.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <BrainCircuit className="w-2.5 h-2.5 mr-1" />}
                             Explain
                           </Button>
                         </div>
                         <p className="text-[10px] leading-tight text-muted-foreground">{issue.description}</p>
                       </div>
                     ))}
                   </div>
                 </Card>
               ))}
             </div>
          </section>

          <Alert className="bg-primary/5 border-primary/20 text-primary">
            <Info className="h-4 w-4" />
            <AlertTitle className="font-bold">Disclaimer</AlertTitle>
            <AlertDescription>
              Automated testing catches only 30-40% of accessibility issues. Manual testing with real users is also required to ensure full DISA framework compliance.
            </AlertDescription>
          </Alert>

          {/* AI Explanation Dialog */}
          <Dialog open={!!explanation} onOpenChange={() => setExplanation(null)}>
            <DialogContent className="glass-morphism border-primary/20 sm:max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="w-5 h-5 text-primary" />
                  <DialogTitle className="font-headline">AI Impact Analysis</DialogTitle>
                </div>
                <DialogDescription className="text-sm font-bold text-muted-foreground uppercase">
                  Persona: {explanationPersona}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm leading-relaxed text-foreground">
                  {explanation}
                </p>
              </div>
              <div className="text-[10px] text-muted-foreground italic border-t border-border pt-4">
                This insight is generated by AI to help explain the human consequence of technical failures.
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </TooltipProvider>
    </AuthGuard>
  );
}
