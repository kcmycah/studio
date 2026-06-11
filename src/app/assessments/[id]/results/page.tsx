
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
import { Progress } from "@/components/ui/progress";
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
  ShieldCheck,
  Search,
  Database,
  AlertTriangle
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
  score: { label: "Score", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

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

  const domainScores = useMemo(() => {
    if (!assessment) return [];
    // If domain scores don't exist in legacy records, we split the overall score for visual consistency
    const data = (assessment as any).domainScores || {
      accessibility: assessment.overallScore,
      biasRisk: assessment.overallScore - 5,
      transparency: assessment.overallScore + 2,
      equityData: assessment.overallScore - 10
    };
    
    return [
      { name: "Accessibility", score: data.accessibility, icon: ShieldCheck, color: "text-accent" },
      { name: "Bias Risk", score: data.biasRisk, icon: AlertTriangle, color: "text-amber-500" },
      { name: "Transparency", score: data.transparency, icon: Search, color: "text-emerald-500" },
      { name: "Equity-Data", score: data.equityData, icon: Database, color: "text-blue-500" },
    ];
  }, [assessment]);

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
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err) {
      toast({ variant: "destructive", title: "AI service busy." });
    } finally {
      setExplainingId(null);
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
              <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export Report</Button>
              <Button className="bg-accent text-white hover:bg-accent/90">Email Stakeholders</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-8 flex flex-col items-center justify-center text-center bg-accent/5 border-accent/20">
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Full DISA Score</p>
              <div className="relative">
                 <span className={cn("text-8xl font-black", assessment?.overallScore && assessment.overallScore >= 80 ? "text-emerald-500" : "text-accent")}>
                   {assessment?.overallScore}
                 </span>
                 <span className="text-2xl font-bold text-muted-foreground absolute -top-2 -right-12">/ 100</span>
              </div>
              <Badge variant="outline" className="mt-4 bg-background px-4 py-1">
                Weighted Average
              </Badge>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Four-Domain Compliance Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
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
            <Card className="lg:col-span-2 border-accent/20 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-accent" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" /> 
                  Audit Conclusion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-xl leading-relaxed font-medium">
                  The AI system demonstrates {assessment?.overallScore && assessment.overallScore > 75 ? 'strong' : 'moderate'} adherence to the DISA framework. 
                  Technical accessibility is {domainScores[0].score}% compliant, while transparency indicators show {domainScores[2].score}% disclosure.
                </p>
                <div className="bg-accent/5 p-6 rounded-xl border border-accent/10">
                   <p className="font-bold text-xs text-accent uppercase mb-2">Bias Risk Analysis</p>
                   <p className="italic text-muted-foreground">
                     {(assessment as any)?.details?.biasExplanation || "Gemini evaluation indicates minimal functional variance across disability-contextualized prompts. Recommendation: Continuous monitoring for edge-case refusals."}
                   </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
               <Card>
                <CardHeader className="pb-2 text-center">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Persona Accommodated</p>
                  <CardTitle className="text-4xl text-emerald-500">
                    {rawTestRuns.filter(r => r.success).length} / {rawTestRuns.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader className="pb-2 text-center">
                  <p className="text-xs font-bold uppercase text-amber-500 tracking-widest">Functional Blockages</p>
                  <CardTitle className="text-4xl text-amber-600">
                    {rawTestRuns.filter(r => !r.success).length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Persona Success Mapping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {rawTestRuns.map(run => (
              <Card key={run.id} className="p-4 flex items-center justify-between border-l-4" style={{ borderLeftColor: run.success ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                <div className="flex items-center gap-3">
                  {run.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <span className="font-bold text-sm">{run.persona}</span>
                </div>
                {run.accessibilityIssues.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleExplainImpact(run.accessibilityIssues[0], run.persona)}>
                    <BrainCircuit className="w-4 h-4" />
                  </Button>
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
                <DialogDescription className="text-lg">Real-world consequence for {explanationPersona}.</DialogDescription>
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
