
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
  BrainCircuit,
  Volume2,
  Pause,
  Filter,
  Activity,
  Download,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { generateExecutiveSummary } from "@/lib/summary";
import { computeKPIs } from "@/lib/filtering";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadUserPreferences, saveUserPreferences } from "@/lib/preferences";
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

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
  
  const [filters, setFilters] = useState<{
    wcagLevels: string[];
    severities: string[];
    personas: string[];
    onlyFailed: boolean;
  }>({
    wcagLevels: [],
    severities: [],
    personas: [],
    onlyFailed: false
  });

  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationPersona, setExplanationPersona] = useState<string | null>(null);
  
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id || !db || !user) return;
    const fetchData = async () => {
      try {
        const [assessmentSnap, profileSnap, prefs] = await Promise.all([
          getDoc(doc(db, "assessments", id as string)),
          getDoc(doc(db, "users", user.uid)),
          loadUserPreferences(user.uid)
        ]);

        if (profileSnap.exists()) setUserProfile({ id: profileSnap.id, ...profileSnap.data() } as UserProfile);
        if (prefs?.filters) setFilters(prefs.filters);

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
          description: "Could not retrieve assessment details."
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, db, user, toast]);

  const filteredRuns = useMemo(() => {
    return rawTestRuns.filter(run => {
      if (filters.onlyFailed && run.success) return false;
      if (filters.personas.length > 0 && !filters.personas.includes(run.persona)) return false;
      return true;
    }).map(run => ({
      ...run,
      accessibilityIssues: run.accessibilityIssues.filter(issue => {
        if (filters.severities.length > 0 && !filters.severities.includes(issue.impact)) return false;
        if (filters.wcagLevels.length > 0 && issue.wcagLevel && !filters.wcagLevels.includes(issue.wcagLevel)) return false;
        return true;
      })
    }));
  }, [rawTestRuns, filters]);

  const kpis = useMemo(() => computeKPIs(filteredRuns), [filteredRuns]);

  const topIssues = useMemo(() => {
    const issuesMap = new Map<string, { impact: string; count: number; description: string }>();
    filteredRuns.forEach(run => {
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
  }, [filteredRuns]);

  const summary = useMemo(() => {
    if (!assessment || filteredRuns.length === 0) return null;
    return generateExecutiveSummary(assessment.overallScore, filteredRuns, topIssues);
  }, [assessment, filteredRuns, topIssues]);

  const scoreBreakdown = useMemo(() => {
    if (!assessment) return [];
    const base = assessment.overallScore;
    return [
      { name: "Accessibility", score: Math.min(100, base + 5), fill: "hsl(var(--accent))" },
      { name: "Task Completion", score: Math.min(100, base - 10), fill: "hsl(var(--success))" },
      { name: "Equity", score: Math.min(100, base + 2), fill: "hsl(var(--warning))" },
    ];
  }, [assessment]);

  const handleApplyFilter = (newFilters: any) => {
    setFilters(newFilters);
    if (user) saveUserPreferences(user.uid, { filters: newFilters });
  };

  const isPro = userProfile?.subscriptionStatus === 'pro' || userProfile?.subscriptionStatus === 'enterprise';

  const handleExportCSV = () => {
    if (!isPro) {
      toast({
        title: "Pro Feature",
        description: "Upgrade to export detailed audit logs as CSV.",
        action: <Button variant="outline" size="sm" onClick={() => router.push("/billing")}>Upgrade</Button>
      });
      return;
    }

    const rows = [
      ["Persona", "Success", "Issue ID", "Impact", "Description", "WCAG Level"],
    ];

    rawTestRuns.forEach(run => {
      if (run.accessibilityIssues.length === 0) {
        rows.push([run.persona, run.success ? "YES" : "NO", "N/A", "N/A", "N/A", "N/A"]);
      } else {
        run.accessibilityIssues.forEach(issue => {
          rows.push([
            run.persona,
            run.success ? "YES" : "NO",
            issue.id,
            issue.impact,
            issue.description.replace(/,/g, ";"),
            issue.wcagLevel || "N/A"
          ]);
        });
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DISA_Audit_${system?.name}_v${assessment?.version}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      if (!res.ok) throw new Error("AI service busy.");
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Insight Failed" });
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
      if (!res.ok) throw new Error("Voice synthesis unavailable.");
      const { media } = await res.json();
      setAudioUrl(media);
      setIsPlaying(true);
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Voice Error" });
    } finally {
      setTtsLoading(false);
    }
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
          <audio ref={audioRef} src={audioUrl || ""} onEnded={() => setIsPlaying(false)} />

          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
              <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Link>
              </Button>
              <h1 className="text-4xl font-bold tracking-tight">{system?.name} <span className="text-muted-foreground font-medium">v{assessment?.version}</span></h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Audit completed {assessment?.createdAt.toDate().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV {!isPro && <Crown className="w-3 h-3 ml-1 text-accent" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleApplyFilter({...filters, onlyFailed: !filters.onlyFailed})}
                className={cn(filters.onlyFailed && "bg-destructive/10 text-destructive border-destructive")}
              >
                <Filter className="w-4 h-4 mr-2" />
                {filters.onlyFailed ? "Showing Failed" : "Show All"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleEmailReport} 
                disabled={emailLoading} 
              >
                {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Report
              </Button>
              <Button asChild className="bg-accent text-white hover:bg-accent/90">
                <Link href={`/history?system=${system?.id}`}><BarChart3 className="w-4 h-4 mr-2" />History</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <Card className="p-8 flex flex-col items-center justify-center text-center bg-accent/5 border-accent/20">
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Overall DISA Score</p>
              <div className="relative">
                 <span className={cn("text-8xl font-black", assessment?.overallScore && assessment.overallScore >= 80 ? "text-emerald-500" : "text-accent")}>
                   {assessment?.overallScore}
                 </span>
                 <span className="text-2xl font-bold text-muted-foreground absolute -top-2 -right-12">/ 100</span>
              </div>
              <Badge variant="outline" className="mt-4 bg-background px-4 py-1">
                {assessment?.overallScore && assessment.overallScore >= 80 ? "Fully Compliant" : "At Risk"}
              </Badge>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Framework Segment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ChartContainer config={chartConfig}>
                  <BarChart data={scoreBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                    />
                    <YAxis domain={[0, 100]} hide />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={60}>
                      {scoreBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <Card className="lg:col-span-2 border-accent/20 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" />Executive Summary</CardTitle>
                  <CardDescription>Automated DISA audit conclusions</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleListenToSummary} disabled={ttsLoading} className="text-accent">
                  {ttsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg leading-relaxed text-foreground/90 font-medium">{summary?.text}</p>
                <div className="bg-accent/5 p-6 rounded-xl border border-accent/10">
                  <p className="font-bold text-xs text-accent uppercase mb-2">Professional Recommendation</p>
                  <p className="italic text-muted-foreground leading-relaxed">{summary?.recommendation}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
               <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Top Violations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {topIssues.map((issue) => (
                    <div key={issue.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold truncate max-w-[150px]">{issue.id.replace(/-/g, ' ')}</p>
                        <Badge variant="outline" className="text-[8px] h-4 uppercase">{issue.impact}</Badge>
                      </div>
                      <span className="text-xl font-bold text-accent">{issue.count}</span>
                    </div>
                  ))}
                  {topIssues.length === 0 && <p className="text-sm text-muted-foreground italic">No issues filtered.</p>}
                </CardContent>
              </Card>
              
              <Card className="bg-destructive/5 border-destructive/20">
                <CardHeader className="pb-2 text-center">
                  <p className="text-xs font-bold uppercase text-destructive">Critical Flags</p>
                  <CardTitle className="text-3xl text-destructive">{kpis.criticalCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Persona Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRuns.map(run => (
                <Card key={run.id} className={cn("flex flex-col group transition-all hover:border-accent/50", !run.success && "border-destructive/30")}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-md font-bold">{run.persona}</CardTitle>
                    {run.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow">
                    {run.accessibilityIssues.map((issue, idx) => (
                      <div key={idx} className="bg-muted/30 p-3 rounded-lg border text-xs">
                        <div className="flex justify-between mb-2">
                          <span className={cn("font-bold uppercase text-[9px]", issue.impact === 'critical' ? 'text-destructive' : 'text-accent')}>
                            {issue.impact}
                          </span>
                          <button 
                            className="text-[10px] text-accent font-bold hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                            disabled={!!explainingId}
                            onClick={() => handleExplainImpact(issue, run.persona)}
                          >
                            <BrainCircuit className="w-3 h-3" /> 
                            AI Insight
                          </button>
                        </div>
                        <p className="text-muted-foreground leading-snug">{issue.description}</p>
                      </div>
                    ))}
                    {run.accessibilityIssues.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">No specific persona issues.</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Alert className="bg-amber-500/5 border-amber-500/20 text-amber-600">
            <Info className="h-4 w-4" />
            <AlertTitle className="font-bold">Manual Testing Disclaimer</AlertTitle>
            <AlertDescription className="text-sm">
              DISA framework compliance requires manual verification. Automated scans identify approximately 35% of functional blockages.
            </AlertDescription>
          </Alert>

          <Dialog open={!!explanation} onOpenChange={() => setExplanation(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                  <BrainCircuit className="w-6 h-6 text-accent" /> 
                  Impact Analysis: {explanationPersona}
                </DialogTitle>
                <DialogDescription className="text-lg">Real-world functional outcome for this user.</DialogDescription>
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
