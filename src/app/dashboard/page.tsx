"use client";

import { useMemo, useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment, UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Minus
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const systemsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "ai_systems"),
      where("userId", "==", user.uid)
    );
  }, [db, user]);

  const { data: systems, loading: systemsLoading } = useCollection<AISystem>(systemsQuery);
  const [systemStats, setSystemStats] = useState<Record<string, { latest: Assessment, trend: number | null, count: number }>>({});
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    const fetchProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserProfile({ id: snap.id, ...snap.data() } as UserProfile);
        }
      } catch (err) {
        console.error("Dashboard profile fetch error:", err);
      }
    };
    fetchProfile();
  }, [user, db]);

  useEffect(() => {
    if (!systems || systems.length === 0 || !db || !user) {
      setLoadingLatest(false);
      return;
    }

    const fetchData = async () => {
      setLoadingLatest(true);
      try {
        const results: Record<string, { latest: Assessment, trend: number | null, count: number }> = {};
        
        // Fetch assessments for all systems in one go to handle trending/counts more efficiently
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
        toast({
          variant: "destructive",
          title: "Dashboard Data Error",
          description: "Failed to load latest assessment trends."
        });
      } finally {
        setLoadingLatest(false);
      }
    };

    fetchData();
  }, [systems, db, user, toast]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-destructive";
  };

  const isFree = !userProfile || userProfile.subscriptionStatus === 'free';
  const systemLimitReached = isFree && (systems?.length || 0) >= 2;

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 max-w-7xl mx-auto w-full relative">
          <OnboardingModal />
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Workspace</h1>
              <p className="text-muted-foreground mt-1">Monitor inclusive AI compliance across your system inventory.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild disabled={systemLimitReached}>
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

          {systemLimitReached && (
            <Card className="bg-accent/5 border-accent/20 mb-8 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-2 rounded-full">
                  <Zap className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Free account limit reached</p>
                  <p className="text-xs text-muted-foreground">You have reached the 2-system limit. Upgrade for unlimited auditing.</p>
                </div>
              </div>
              <Button size="sm" asChild variant="default" className="bg-accent text-white hover:bg-accent/90">
                <Link href="/billing">Upgrade Now</Link>
              </Button>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemsLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <Card key={i} className="h-[300px] animate-pulse bg-muted/50 border-border" />
               ))
            ) : (
              systems?.map((system) => {
                const data = systemStats[system.id];
                const hasAssessment = !!data;
                
                return (
                  <Card key={system.id} className="group hover:border-accent/50 transition-all shadow-sm flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">{system.type}</Badge>
                        <Link href={system.url} target="_blank" className="text-muted-foreground hover:text-accent transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                      <CardTitle className="text-xl font-bold mt-2">{system.name}</CardTitle>
                      <CardDescription className="truncate text-xs">{system.url}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-grow">
                      {loadingLatest ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Fetching reports...</span>
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
                            <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {data.count} Audits</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center bg-muted/10 rounded-xl border border-dashed border-border flex flex-col items-center">
                          <Bot className="w-8 h-8 text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">No assessments yet.</p>
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
                          Run Test
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
                <div className="bg-primary/5 p-6 rounded-full mb-6">
                  <Bot className="w-16 h-16 text-muted-foreground/40" />
                </div>
                <CardTitle className="text-2xl font-bold mb-2">Connect Your AI</CardTitle>
                <CardDescription className="mb-8 max-w-sm mx-auto">
                  Start auditing your chatbot or voice assistant for accessibility compliance.
                </CardDescription>
                <Button size="lg" asChild className="bg-accent text-white px-8">
                  <Link href="/systems/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Register First System
                  </Link>
                </Button>
              </Card>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}