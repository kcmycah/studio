
"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, TestRun, ImpactLevel, WCAGLevel } from "@/lib/types";
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
  HelpCircle
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

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [system, setSystem] = useState<AISystem | null>(null);
  const [rawTestRuns, setRawTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Filtering state
  const [filters, setFilters] = useState<FilterCriteria>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!id || !db) return;
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
  }, [id, db]);

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
          summary: summary.text,
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
        description: "We couldn't deliver the report. Please check your Resend configuration.",
      });
    } finally {
      setEmailLoading(false);
    }
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
            <div className="flex gap-2">
              <Button variant="outline" className="h-11" onClick={handleEmailResults} disabled={emailLoading}>
                {emailLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Email Results
              </Button>
              <Button className="h-11" asChild>
                <Link href={`/systems/${system?.id}/versions`}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  History
                </Link>
              </Button>
            </div>
          </div>

          {/* KPI Cards with Tooltips */}
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

          {/* Filter Bar */}
          <Card className="glass-morphism border-primary/10 p-4 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <Filter className="w-4 h-4" /> Filter Findings
              </div>
              
              <Select onValueChange={(v) => setFilters({ ...filters, impact: v === 'all' ? undefined : v as ImpactLevel })}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="serious">Serious</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(v) => setFilters({ ...filters, wcagLevel: v === 'all' ? undefined : v as WCAGLevel })}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="WCAG Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="A">Level A</SelectItem>
                  <SelectItem value="AA">Level AA</SelectItem>
                  <SelectItem value="AAA">Level AAA</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Clear Filters</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <Card className="lg:col-span-2 glass-morphism border-primary/20 p-6 relative overflow-hidden">
              <h3 className="font-headline text-xl font-bold flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                Executive Summary
              </h3>
              {summary && (
                <div className="space-y-4">
                  <p className="text-lg leading-relaxed">{summary.text}</p>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="font-bold text-sm text-primary uppercase mb-1">Recommendation</p>
                    <p className="italic text-muted-foreground">{summary.recommendation}</p>
                  </div>
                </div>
              )}
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
                {topIssues.length === 0 && <p className="text-muted-foreground italic text-center py-8">No issues match current filters.</p>}
              </div>
            </Card>
          </div>

          <section className="mb-12">
             <h2 className="font-headline text-2xl font-bold mb-4">Persona Results Detail</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredRuns.map(run => (
                 <Card key={run.id} className={cn("glass-morphism border-primary/5 p-5", !run.success && "border-destructive/30")}>
                   <div className="flex justify-between items-start mb-4">
                     <h4 className="font-bold">{run.persona}</h4>
                     {run.success ? (
                       <Badge className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">PASSED</Badge>
                     ) : (
                       <Badge className="bg-destructive/10 text-destructive border-destructive/20">FAILED</Badge>
                     )}
                   </div>
                   <div className="space-y-2">
                     <p className="text-xs text-muted-foreground">Found {run.accessibilityIssues.length} issues for this persona.</p>
                     {run.accessibilityIssues.slice(0, 2).map((issue, idx) => (
                       <div key={idx} className="bg-muted/30 p-2 rounded text-[10px]">
                         <span className="font-bold uppercase mr-1">[{issue.impact}]</span> {issue.description}
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
        </main>
      </TooltipProvider>
    </AuthGuard>
  );
}
