"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun, AccessibilityIssue } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  ChevronRight,
  Loader2,
  Sparkles
} from "lucide-react";
import { generatePersonaImpactExplanation } from "@/ai/flows/generate-persona-impact-explanation";
import { generateAssessmentExecutiveSummary } from "@/ai/flows/generate-assessment-executive-summary";
import { useToast } from "@/hooks/use-toast";

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [executiveSummary, setExecutiveSummary] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const assessmentSnap = await getDoc(doc(db, "assessments", id as string));
        if (!assessmentSnap.exists()) return;
        const assessmentData = { id: assessmentSnap.id, ...assessmentSnap.data() } as Assessment;
        setAssessment(assessmentData);

        const systemSnap = await getDoc(doc(db, "ai_systems", assessmentData.systemId));
        if (systemSnap.exists()) {
          setSystem({ id: systemSnap.id, ...systemSnap.data() } as AISystem);
        }

        const q = query(collection(db, "testRuns"), where("assessmentId", "==", id));
        const runsSnap = await getDocs(q);
        setTestRuns(runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestRun)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleGenSummary = async () => {
    if (!assessment || !system || testRuns.length === 0) return;
    setSummarizing(true);
    try {
      const summary = await generateAssessmentExecutiveSummary({
        overallScore: assessment.overallScore,
        systemName: system.name,
        testRunSummaries: testRuns.map(run => ({
          persona: run.persona,
          success: run.success,
          accessibilityIssues: run.accessibilityIssues.map(issue => ({
            id: issue.id,
            description: issue.description,
            impact: issue.impact
          }))
        }))
      });
      setExecutiveSummary(summary.executiveSummary);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Generation Failed" });
    } finally {
      setSummarizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-destructive";
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <Badge variant="outline" className="mb-2 text-primary border-primary">Audit Results</Badge>
            <h1 className="font-headline text-4xl font-bold">{system?.name} Assessment</h1>
            <p className="text-muted-foreground mt-1">Audit conducted on {assessment?.createdAt.toDate().toLocaleDateString()}</p>
          </div>
          <Button variant="outline" className="h-11">
            <FileDown className="w-4 h-4 mr-2" />
            Download PDF Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="md:col-span-1 glass-morphism border-primary/30 flex flex-col items-center justify-center py-10">
            <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Overall DISA Score</div>
            <div className={cn("text-8xl font-headline font-bold", getScoreColor(assessment?.overallScore || 0))}>
              {assessment?.overallScore}
            </div>
            <div className="mt-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">FAIRNESS RATING: {assessment && assessment.overallScore >= 60 ? "STABLE" : "IMPROVEMENT NEEDED"}</div>
          </Card>

          <Card className="md:col-span-2 glass-morphism border-primary/20 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Executive Summary
              </h3>
              {!executiveSummary && (
                <Button size="sm" onClick={handleGenSummary} disabled={summarizing}>
                  {summarizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate AI Summary
                </Button>
              )}
            </div>
            <div className="prose prose-invert max-w-none text-muted-foreground">
              {executiveSummary ? (
                <div className="animate-in fade-in duration-500 whitespace-pre-wrap">{executiveSummary}</div>
              ) : summarizing ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                </div>
              ) : (
                <p className="italic">No summary generated yet. Click the button above to use AI insights.</p>
              )}
            </div>
          </Card>
        </div>

        <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-2">
          <Info className="w-6 h-6 text-primary" />
          Persona Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {testRuns.map(run => (
            <Card key={run.id} className="glass-morphism border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                  {run.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <CardTitle className="text-lg">{run.persona}</CardTitle>
                </div>
                <Badge variant={run.success ? "secondary" : "destructive"}>
                  {run.success ? "Passed" : "Failed"}
                </Badge>
              </CardHeader>
              <CardContent>
                {run.accessibilityIssues.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-muted-foreground">Identified Violations ({run.accessibilityIssues.length}):</p>
                    {run.accessibilityIssues.map((issue, idx) => (
                      <IssueDetail key={idx} issue={issue} persona={run.persona} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-400 font-medium">No accessibility violations found for this persona.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}

function IssueDetail({ issue, persona }: { issue: AccessibilityIssue, persona: string }) {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchExplanation = async () => {
    if (explanation) return;
    setLoading(true);
    try {
      const res = await generatePersonaImpactExplanation({
        issueDescription: issue.description,
        issueImpact: issue.impact,
        disabilityPersona: persona
      });
      setExplanation(res.explanation);
    } catch (err) {
      setExplanation("Failed to generate explanation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border/50 rounded-lg p-3 bg-background/30">
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          <AlertTriangle className={cn("w-4 h-4 mt-1", issue.impact === 'critical' ? 'text-destructive' : 'text-orange-400')} />
          <div>
            <div className="text-sm font-bold capitalize">{issue.id.replace(/-/g, ' ')}</div>
            <div className="text-xs text-muted-foreground">{issue.description}</div>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase font-bold">{issue.impact}</Badge>
      </div>
      
      {!explanation ? (
        <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-primary" onClick={fetchExplanation} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
          Explain Impact
        </Button>
      ) : (
        <div className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 py-1 animate-in slide-in-from-left-2 duration-300">
          "{explanation}"
        </div>
      )}
    </div>
  );
}