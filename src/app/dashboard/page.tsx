
"use client";

import { useMemo, useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { AISystem, Assessment, UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Bot, 
  ArrowRight, 
  ExternalLink, 
  Plus, 
  Loader2,
  PlusCircle,
  Calendar,
  Layers,
  BarChart3,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  List,
  MoreVertical,
  Trash2,
  Edit,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useToast } from "@/hooks/use-toast";
import { loadUserPreferences, saveUserPreferences } from "@/lib/preferences";
import { getUserUsage, UserUsage } from "@/lib/usage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [dashboardView, setDashboardView] = useState<"grid" | "list">("grid");
  const [deletingSystem, setDeletingSystem] = useState<string | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  const systemsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "ai_systems"),
      where("userId", "==", user.uid)
    );
  }, [db, user]);

  const { data: systems, loading: systemsLoading } = useCollection<AISystem>(systemsQuery);
  const [systemStats, setSystemStats] = useState<Record<string, { latest: Assessment, trend: number | null, count: number }>>({});
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    const fetchData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserProfile({ id: snap.id, ...snap.data() } as UserProfile);
        }

        const prefs = await loadUserPreferences(user.uid);
        if (prefs?.dashboardView) {
          setDashboardView(prefs.dashboardView);
        }

        const usageData = await getUserUsage(db, user.uid);
        setUsage(usageData);
      } catch (err) {
        console.error("Dashboard metadata fetch error:", err);
      } finally {
        setLoadingUsage(false);
      }
    };
    fetchData();
  }, [user, db, systems]); // Refresh usage when systems change

  useEffect(() => {
    if (!systems || !db || !user) {
      setLoadingLatest(false);
      return;
    }

    const fetchData = async () => {
      setLoadingLatest(true);
      try {
        const results: Record<string, { latest: Assessment, trend: number | null, count: number }> = {};
        
        const allAssessmentsQuery = query(
          collection(db, "assessments"),
          where("userId", "==", user.uid)
        );
        const allSnap = await getDocs(allAssessmentsQuery);
        const allAssessments = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Assessment));

        systems.forEach(system => {
          const systemAssessments = allAssessments
            .filter(a => a.systemId === system.id)
            .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

          if (systemAssessments.length > 0) {
            const latest = systemAssessments[0];
            const previous = systemAssessments[1];
            const trend = previous ? latest.overallScore - previous.overallScore : null;
            
            results[system.id] = { latest, trend, count: systemAssessments.length };
          }
        });

        setSystemStats(results);
      } catch (err: any) {
        console.error("Dashboard stats error:", err);
      } finally {
        setLoadingLatest(false);
      }
    };

    fetchData();
  }, [systems, db, user]);

  const toggleView = () => {
    const nextView = dashboardView === "grid" ? "list" : "grid";
    setDashboardView(nextView);
    if (user) {
      saveUserPreferences(user.uid, { dashboardView: nextView });
    }
  };

  const handleDeleteSystem = async () => {
    if (!deletingSystem || !db) return;
    try {
      await deleteDoc(doc(db, "ai_systems", deletingSystem));
      toast({ title: "System Deleted", description: "The AI system has been removed from your workspace." });
    } catch (err) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    } finally {
      setDeletingSystem(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-destructive";
  };

  const limitReached = usage && usage.remainingActive === 0;

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full relative">
          <OnboardingModal />
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Workspace</h1>
              <p className="text-muted-foreground mt-1">Audit and monitor your AI accessibility health.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleView} title={`Switch to ${dashboardView === "grid" ? "list" : "grid"} view`}>
                {dashboardView === "grid" ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              </Button>
              <Button variant="outline" asChild disabled={limitReached}>
                <Link href="/systems/new">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add System
                </Link>
              </Button>
              <Button asChild className="bg-accent text-white hover:bg-accent/90">
                <Link href="/assessments/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </Link>
              </Button>
            </div>
          </header>

          {/* Usage Monitoring Section */}
          {!loadingUsage && usage && (
            <Card className="bg-card/30 border-border/50 mb-10 overflow-hidden">
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em]">Active Plan: {usage.isPro ? 'Pro' : 'Free'}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Monitoring your organizational audit bandwidth.</p>
                  {!usage.isPro && (
                    <Button variant="link" size="sm" asChild className="p-0 h-auto text-accent font-black text-[10px] uppercase tracking-widest">
                      <Link href="/billing">Upgrade for Unlimited Capacity</Link>
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Active Systems</span>
                    <span className="text-muted-foreground">{usage.activeCount} / {usage.isPro ? '∞' : usage.maxActive}</span>
                  </div>
                  <Progress value={usage.isPro ? 0 : (usage.activeCount / usage.maxActive) * 100} className="h-2" />
                  {usage.remainingActive === 0 && !usage.isPro && (
                    <p className="text-[9px] font-bold text-destructive uppercase tracking-tighter flex items-center gap-1">
                      <Zap className="w-3 h-3" /> System limit reached. Upgrade to add more.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Monthly Creations</span>
                    <span className="text-muted-foreground">{usage.monthlyUsed} / {usage.isPro ? '∞' : usage.maxMonthly}</span>
                  </div>
                  <Progress value={usage.isPro ? 0 : (usage.monthlyUsed / usage.maxMonthly) * 100} className="h-2" />
                  {usage.remainingMonthly <= 1 && !usage.isPro && (
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Monthly quota low.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className={cn(
            dashboardView === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-4"
          )}>
            {systemsLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <Card key={i} className="h-[320px] animate-pulse bg-muted/50 border-border" />
               ))
            ) : (
              systems?.map((system) => {
                const data = systemStats[system.id];
                const hasAssessment = !!data;
                
                if (dashboardView === "list") {
                  return (
                    <Card key={system.id} className="flex items-center justify-between p-4 group hover:border-accent/50 transition-all shadow-sm">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-muted p-2 rounded-lg">
                          <Bot className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-bold">{system.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{system.type} • {system.url}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 px-8">
                        {hasAssessment ? (
                          <>
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground">Score</p>
                              <p className={cn("text-xl font-black", getScoreColor(data.latest.overallScore))}>
                                {data.latest.overallScore}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground">Version</p>
                              <p className="text-sm font-bold">v{data.latest.version}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No audits</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                               <Link href={`/systems/${system.id}/edit`} className="cursor-pointer">
                                 <Edit className="w-4 h-4 mr-2" /> Edit System
                               </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeletingSystem(system.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete System
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/systems/${system.id}/versions`}>History</Link>
                        </Button>
                        <Button size="sm" className="bg-accent text-white" asChild>
                          <Link href={`/assessments/new?system=${system.id}`}>Run Audit</Link>
                        </Button>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card key={system.id} className="group hover:border-accent/50 transition-all shadow-sm flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">{system.type}</Badge>
                        <div className="flex gap-2">
                          <Link href={system.url} target="_blank" className="text-muted-foreground hover:text-accent">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-3 h-3" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/systems/${system.id}/edit`} className="cursor-pointer">
                                  <Edit className="w-4 h-4 mr-2" /> Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeletingSystem(system.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold mt-2 truncate">{system.name}</CardTitle>
                      <CardDescription className="truncate text-xs">{system.url}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-grow">
                      {loadingLatest ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Loading stats...</span>
                        </div>
                      ) : hasAssessment ? (
                        <div className="space-y-4">
                          <div className="rounded-xl p-4 bg-muted/30 border border-border/50 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">DISA Score</p>
                              <div className="flex items-center gap-2">
                                <p className={cn("text-4xl font-black", getScoreColor(data.latest.overallScore))}>
                                  {data.latest.overallScore}
                                </p>
                                {data.trend !== null && (
                                  <div className={cn("flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full bg-background/50", data.trend > 0 ? "text-emerald-500" : data.trend < 0 ? "text-destructive" : "text-muted-foreground")}>
                                    {data.trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : data.trend < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(data.trend)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono">v{data.latest.version}</Badge>
                          </div>
                          
                          <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {data.latest.createdAt.toDate().toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {data.count} Reports</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center bg-muted/10 rounded-xl border border-dashed border-border flex flex-col items-center">
                          <Bot className="w-8 h-8 text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">No assessments run.</p>
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="pt-4 border-t border-border/50 gap-3">
                      <Button variant="ghost" size="sm" className="flex-1 text-xs font-semibold" asChild>
                        <Link href={`/systems/${system.id}/versions`}>
                          <Layers className="w-3.5 h-3.5 mr-2" /> 
                          History
                        </Link>
                      </Button>
                      <Button size="sm" className="flex-1 text-xs font-semibold bg-accent text-white" asChild>
                        <Link href={`/assessments/new?system=${system.id}`}>
                          Run Audit
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}

            {!systemsLoading && systems?.length === 0 && (
              <Card className="col-span-full border-dashed border-2 py-20 text-center flex flex-col items-center justify-center bg-muted/5">
                <Bot className="w-16 h-16 text-muted-foreground/30 mb-6" />
                <CardTitle className="text-2xl font-bold mb-2">Welcome to DISA Audit</CardTitle>
                <CardDescription className="mb-8 max-w-sm mx-auto">
                  Add your first AI system (Chatbot or Voice Assistant) to start measuring functional equity.
                </CardDescription>
                <Button size="lg" asChild className="bg-accent text-white px-8">
                  <Link href="/systems/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Register System
                  </Link>
                </Button>
              </Card>
            )}
          </div>

          <AlertDialog open={!!deletingSystem} onOpenChange={() => setDeletingSystem(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the AI system and all associated audit reports. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSystem} className="bg-destructive text-white hover:bg-destructive/90">
                  Delete System
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </AuthGuard>
  );
}
