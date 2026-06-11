
"use client";

import { useMemo, useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { AISystem, Assessment, UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  ArrowRight, 
  ExternalLink, 
  Plus, 
  AlertCircle,
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
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
        if (!snap.empty) {
          setUserProfile({ id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
        }
      } catch (err) {
        console.error("Dashboard profile fetch error:", err);
      }
    };
    fetchProfile();
  }, [user, db]);

  useEffect(() => {
    if (!systems || systems.length === 0 || !db || !user) return;

    const fetchData = async () => {
      setLoadingLatest(true);
      try {
        const results: Record<string, { latest: Assessment, trend: number | null, count: number }> = {};
        
        for (const system of systems) {
          const q = query(
            collection(db, "assessments"), 
            where("systemId", "==", system.id),
            orderBy("createdAt", "desc"),
            limit(2)
          );
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assessment));
            const latest = docs[0];
            const previous = docs[1];
            const trend = previous ? latest.overallScore - previous.overallScore : null;
            
            const countSnap = await getDocs(query(collection(db, "assessments"), where("systemId", "==", system.id)));

            results[system.id] = { latest, trend, count: countSnap.size };
          }
        }
        setSystemStats(results);
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Dashboard Data Error",
          description: "Failed to load latest assessment trends. Please refresh."
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
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 max-w-7xl mx-auto w-full">
          <OnboardingModal />
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Workspace</h1>
              <p className="text-muted-foreground mt-1">Monitor inclusive AI compliance across your system inventory.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild disabled={systemLimitReached}>
                <Link href="/systems/new"><PlusCircle className="w-4 h-4 mr-2" />Add System</Link>
              </Button>
              <Button asChild className="bg-accent text-white hover:bg-accent/90">
                <Link href="/assessments/new"><Plus className="w-4 h-4 mr-2" />New Assessment</Link>
              </Button>
            </div>
          </header>

          {systemLimitReached && (
            <Card className="bg-accent/5 border-accent/20 mb-8 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-accent" />
                <p className="text-sm">Free account limit reached (2 systems). Upgrade for unlimited auditing.</p>
              </div>
              <Button size="sm" asChild variant="outline" className="border-accent text-accent hover:bg-accent/10">
                <Link href="/billing">Upgrade</Link>
              </Button>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems?.map((system) => {
              const data = systemStats[system.id];
              const hasAssessment = !!data;
              
              return (
                <Card key={system.id} className="group hover:border-accent/50 transition-all">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">{system.type}</Badge>
                      <Link href={system.url} target="_blank" className="text-muted-foreground hover:text-accent transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                    <CardTitle className="text-xl font-bold mt-2">{system.name}</CardTitle>
                    <CardDescription className="truncate">{system.url}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {loadingLatest ? (
                      <div className="flex items-center gap-2 text-muted-foreground py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Fetching data...</span>
                      </div>
                    ) : hasAssessment ? (
                      <div className="space-y-4">
                        <div className="rounded-lg p-4 bg-muted/30 border border-border/50 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">DISA Score</p>
                            <div className="flex items-center gap-2">
                              <p className={cn("text-3xl font-bold", getScoreColor(data.latest.overallScore))}>
                                {data.latest.overallScore}
                              </p>
                              {data.trend !== null && (
                                <div className={cn("flex items-center text-xs font-bold", data.trend > 0 ? "text-emerald-500" : data.trend < 0 ? "text-destructive" : "text-muted-foreground")}>
                                  {data.trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : data.trend < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                                  {Math.abs(data.trend)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">v{data.latest.version}</Badge>
                        </div>
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {data.latest.createdAt.toDate().toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {data.count} Runs</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-muted/20 rounded-lg border border-dashed">
                        <p className="text-xs text-muted-foreground">No assessments yet.</p>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="pt-4 border-t border-border/50 gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" asChild>
                      <Link href={`/systems/${system.id}/versions`}><Layers className="w-3 h-3 mr-2" /> History</Link>
                    </Button>
                    <Button size="sm" className="flex-1 text-xs bg-accent text-white" asChild>
                      <Link href={`/assessments/new?system=${system.id}`}>Run Test <ArrowRight className="w-3 h-3 ml-1" /></Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}

            {!systemsLoading && systems?.length === 0 && (
              <Card className="col-span-full border-dashed p-16 text-center">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                <CardTitle className="text-2xl font-bold mb-2">Ready to audit?</CardTitle>
                <CardDescription className="mb-6">Connect your first AI assistant to start measuring inclusivity.</CardDescription>
                <Button asChild className="bg-accent text-white">
                  <Link href="/systems/new"><Plus className="w-4 h-4 mr-2" />Add Your First System</Link>
                </Button>
              </Card>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
