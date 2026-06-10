"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun, AccessibilityIssue } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  FileDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  Loader2,
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { generateAssessmentExecutiveSummary } from "@/ai/flows/generate-assessment-executive-summary";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const db = useFirestore();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [executiveSummary, setExecutiveSummary] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (!id || !db) return;
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
  }, [id, db]);

  // Aggregated issues logic
  const topIssues = useMemo(() => {
    const issuesMap = new Map<string, { impact: string; count: number; description: string }>();
    testRuns.forEach(run => {
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
      .slice(0, 5);
  }, [testRuns]);

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
      <main className="container mx-auto px-4 py-12 max-w-6xl print:p-0 print:max-w-none">
        <div className="flex justify-between items-end mb-8 print:mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              <Badge variant="outline" className="text-primary border-primary">DISA Framework Audit</Badge>
            </div>
            <h1 className="font-headline text-4xl font-bold">{system?.name} Audit Report</h1>
            <p className="text-muted-foreground mt-1">Audit conducted on {assessment?.createdAt.toDate().toLocaleDateString()} • {assessment?.createdAt.toDate().toLocaleTimeString()}</p>
          </div>
          <Button variant="outline" className="h-11 print:hidden" onClick={() => window.print()}>
            <FileDown className="w-4 h-4 mr-2" />
            Download PDF Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="md:col-span-1 glass-morphism border-primary/30 flex flex-col items-center justify-center py-10 print:border-border print:bg-white print:text-black">
            <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Overall DISA Score</div>
            <div className={cn("text-8xl font-headline font-bold", getScoreColor(assessment?.overallScore || 0))}>
              {assessment?.overallScore}
            </div>
            <div className="mt-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold print:border print:border-primary">FAIRNESS RATING: {assessment && assessment.overallScore >= 60 ? "STABLE" : "IMPROVEMENT NEEDED"}</div>
          </Card>

          <Card className="md:col-span-2 glass-morphism border-primary/20 p-6 print:border-border print:bg-white print:text-black">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Executive Summary
              </h3>
              {!executiveSummary && (
                <Button size="sm" onClick={handleGenSummary} disabled={summarizing} className="print:hidden">
                  {summarizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate AI Insights
                </Button>
              )}
            </div>
            <div className="prose prose-invert max-w-none text-muted-foreground print:text-black">
              {executiveSummary ? (
                <div className="animate-in fade-in duration-500 whitespace-pre-wrap">{executiveSummary}</div>
              ) : summarizing ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                </div>
              ) : (
                <p className="italic">Click "Generate AI Insights" to visualize the executive summary of this audit.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <section>
            <h2 className="font-headline text-2xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              Persona Results
            </h2>
            <Card className="glass-morphism border-primary/10 overflow-hidden print:border-border print:bg-white print:text-black">
              <Table>
                <TableHeader className="bg-muted/50 print:bg-gray-100">
                  <TableRow>
                    <TableHead>Disability Persona</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testRuns.map(run => (
                    <TableRow key={run.id} className="print:border-b">
                      <TableCell className="font-medium">{run.persona}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {run.success ? (
                            <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">Passed</span></>
                          ) : (
                            <><XCircle className="w-4 h-4 text-destructive" /> <span className="text-destructive">Failed</span></>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{run.accessibilityIssues.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          <section>
            <h2 className="font-headline text-2xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              Top Accessibility Issues
            </h2>
            <Card className="glass-morphism border-primary/10 p-6 print:border-border print:bg-white print:text-black">
              <div className="space-y-4">
                {topIssues.map((issue) => (
                  <div key={issue.id} className="flex items-start justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold uppercase tracking-tight">{issue.id.replace(/-/g, ' ')}</span>
                        <Badge variant="outline" className={cn("text-[10px] h-4 uppercase", 
                          issue.impact === 'critical' ? "border-destructive text-destructive" : "border-orange-400 text-orange-400"
                        )}>
                          {issue.impact}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{issue.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-headline font-bold text-primary">{issue.count}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Found</div>
                    </div>
                  </div>
                ))}
                {topIssues.length === 0 && <p className="text-muted-foreground italic">No issues detected.</p>}
              </div>
            </Card>
          </section>
        </div>

        <Alert className="bg-primary/5 border-primary/20 text-primary mb-12 print:bg-gray-50 print:text-black print:border-gray-200">
          <Info className="h-4 w-4" />
          <AlertTitle className="font-bold">Disclaimer</AlertTitle>
          <AlertDescription>
            Automated testing catches only 30-40% of accessibility issues. Manual testing with real users is also required to ensure full DISA framework compliance and outcome equity.
          </AlertDescription>
        </Alert>
      </main>

      <style jsx global>{`
        @media print {
          .Navbar, .print\\:hidden { display: none !important; }
          body { background: white !important; color: black !important; }
          .glass-morphism { border: none !important; backdrop-filter: none !important; background: white !important; }
          .container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </Guard>
  );
}

function Guard({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
