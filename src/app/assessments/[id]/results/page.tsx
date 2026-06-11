"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun, UserProfile } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  Info,
  Loader2,
  Sparkles,
  ArrowLeft,
  BarChart3,
  Mail,
  Download,
  BrainCircuit,
  Volume2,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { generateExecutiveSummary } from "@/lib/summary";
import { computeKPIs } from "@/lib/filtering";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  
  // AI State
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationPersona, setExplanationPersona] = useState<string | null>(null);
  
  // Audio State
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id || !db || !user) return;
    const fetchData = async () => {
      try {
        const [assessmentSnap, profileSnap] = await Promise.all([
          getDoc(doc(db, "assessments", id as string)),
          getDoc(doc(db, "users", user.uid))
        ]);

        if (profileSnap.exists()) setUserProfile({ id: profileSnap.id, ...profileSnap.data() } as UserProfile);

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
        toast({
          variant: "destructive",
          title: "Data Loading Error",
          description: "Could not retrieve assessment details. Please try again later."
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, db, user, toast]);

  const kpis = useMemo(() => computeKPIs(rawTestRuns), [rawTestRuns]);

  const topIssues = useMemo(() => {
    const issuesMap = new Map<string, { impact: string; count: number; description: string }>();
    rawTestRuns.forEach(run => {
      run.accessibilityIssues.forEach(issue => {
        const existing = issuesMap.get(issue.id);
        if (existing) existing.count += 1;
        else issuesMap.set(issue.id, { impact: issue.impact, count: 1, description: issue.description });
      });
    });
    return Array.from(issuesMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rawTestRuns]);

  const summary = useMemo(() => {
    if (!assessment || rawTestRuns.length === 0) return null;
    return generateExecutiveSummary(assessment.overallScore, rawTestRuns, topIssues);
  }, [assessment, rawTestRuns, topIssues]);

  const handleEmailReport = async () => {
    if (!user || !assessment || !system || !summary) return;
    setEmailLoading(true);
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
      if (!res.ok) throw new Error("Failed to send email");
      toast({ title: "Report Sent", description: `Check your inbox at ${user.email}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Email Error", description: err.message });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleExplainImpact = async (issue: any, persona: string) => {
    setExplainingId(issue.id);
    setExplanationPersona(persona);
    try {
      const res = await fetch("/api/explain-impact", {
        method: "POST",
        body: JSON.stringify({ 
          issueDescription: issue.description, 
          issueImpact: issue.impact, 
          disabilityPersona: persona 
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate AI explanation.");
      }
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "AI Insight Failed",
        description: err.message || "Please check your network connection or API settings."
      });
    } finally {
      setExplainingId(null);
    }
  };

  const handleListenToSummary = async () => {
    if (audioUrl) {
      if (isPlaying) audioRef.current?.pause();
      else audioRef.current?.play();
      return;
    }
    setTtsLoading(true);
    try {
      const textToSpeak = summary?.text || "No summary available.";
      const res = await fetch("/api/tts", { 
        method: "POST", 
        body: JSON.stringify({ text: textToSpeak }) 
      });
      if (!res.ok) throw new Error("Voice synthesis service is currently unavailable.");
      const { media } = await res.json();
      setAudioUrl(media);
      setIsPlaying(true);
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Voice Error",
        description: err.message
      });
    } finally {
      setTtsLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 max-w-7xl mx-auto w-full">
          <audio ref={audioRef} src={audioUrl || ""} onEnded={() => setIsPlaying(false)} />

          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
              <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Link>
              </Button>
              <h1 className="text-4xl font-bold tracking-tight">{system?.name} v{assessment?.version} Report</h1>
              <p className="text-muted-foreground mt-1">Audit conducted on {assessment?.createdAt.toDate().toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleEmailReport} 
                disabled={emailLoading} 
                className="border-accent text-accent"
              >
                {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Report
              </Button>
              <Button asChild className="bg-accent text-white hover:bg-accent/90">
                <Link href={`/history?system=${system?.id}`}><BarChart3 className="w-4 h-4 mr-2" />History</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">DISA Score</p>
              <p className={cn("text-3xl font-bold", assessment?.overallScore && assessment.overallScore >= 80 ? "text-emerald-500" : "text-amber-500")}>
                {assessment?.overallScore}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Pass Rate</p>
              <p className="text-3xl font-bold">{kpis.overallPassRate}%</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Critical Issues</p>
              <p className={cn("text-3xl font-bold", kpis.criticalCount > 0 ? "text-destructive" : "text-emerald-500")}>{kpis.criticalCount}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">WCAG violations</p>
              <p className="text-3xl font-bold text-amber-500">{kpis.totalA + kpis.totalAA}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <Card className="lg:col-span-2 border-accent/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" />Executive Summary</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={handleListenToSummary} disabled={ttsLoading} className="text-accent">
                  {ttsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg leading-relaxed text-foreground/90">{summary?.text}</p>
                <div className="bg-accent/5 p-4 rounded-lg border border-accent/10">
                  <p className="font-bold text-sm text-accent uppercase mb-1">Recommendation</p>
                  <p className="italic text-muted-foreground">{summary?.recommendation}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Top Issues</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {topIssues.map((issue) => (
                  <div key={issue.id} className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase">{issue.id}</span>
                        <Badge variant="outline" className="text-[8px] px-1">{issue.impact}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{issue.description}</p>
                    </div>
                    <span className="text-xl font-bold text-accent">{issue.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Persona Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rawTestRuns.map(run => (
                <Card key={run.id} className={cn("flex flex-col", !run.success && "border-destructive/30")}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-md">{run.persona}</CardTitle>
                    {run.success ? <Badge className="bg-emerald-500 text-white">Pass</Badge> : <Badge variant="destructive">Fail</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow">
                    {run.accessibilityIssues.map((issue, idx) => (
                      <div key={idx} className="bg-muted/50 p-2 rounded border text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-accent uppercase text-[9px]">{issue.impact}</span>
                          <button 
                            className="text-[9px] text-accent hover:underline flex items-center gap-1" 
                            disabled={!!explainingId}
                            onClick={() => handleExplainImpact(issue, run.persona)}
                          >
                            {explainingId === issue.id ? <Loader2 className="w-2 h-2 animate-spin" /> : <BrainCircuit className="w-2 h-2" />} 
                            Explain
                          </button>
                        </div>
                        <p className="text-muted-foreground leading-tight">{issue.description}</p>
                      </div>
                    ))}
                    {run.accessibilityIssues.length === 0 && <p className="text-xs text-muted-foreground italic">No issues detected.</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500">
            <Info className="h-4 w-4" />
            <AlertTitle className="font-bold">Important</AlertTitle>
            <AlertDescription>Automated testing catches 30-40% of accessibility issues. Manual testing is essential for DISA compliance.</AlertDescription>
          </Alert>

          <Dialog open={!!explanation} onOpenChange={() => setExplanation(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-accent" /> AI Impact Analysis</DialogTitle>
                <DialogDescription>How this technical failure affects a user who is {explanationPersona}.</DialogDescription>
              </DialogHeader>
              <div className="py-4 text-sm leading-relaxed whitespace-pre-wrap">{explanation}</div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </AuthGuard>
  );
}
