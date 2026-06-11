
"use client";

import { useMemo, useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { AISystem, Assessment } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  ArrowRight, 
  ExternalLink, 
  Plus, 
  TrendingUp, 
  AlertCircle,
  Activity,
  Loader2,
  PlusCircle,
  Calendar,
  Layers,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Enhanced Dashboard with Mini-Cards per AI System
 */
export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();

  const systemsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "ai_systems"),
      where("userId", "==", user.uid)
    );
  }, [db, user]);

  const { data: systems, loading: systemsLoading } = useCollection<AISystem>(systemsQuery);
  const [systemLatestAssessments, setSystemLatestAssessments] = useState<Record<string, { assessment: Assessment, count: number }>>({});
  const [loadingLatest, setLoadingLatest] = useState(false);

  // Fetch latest assessment for each system to populate mini-cards
  useEffect(() => {
    if (!systems || systems.length === 0 || !db || !user) return;

    const fetchLatest = async () => {
      setLoadingLatest(true);
      const results: Record<string, { assessment: Assessment, count: number }> = {};
      
      for (const system of systems) {
        // Get all assessments count
        const countQuery = query(collection(db, "assessments"), where("systemId", "==", system.id));
        const countSnap = await getDocs(countQuery);
        
        // Get latest assessment
        const latestQuery = query(
          collection(db, "assessments"), 
          where("systemId", "==", system.id),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const latestSnap = await getDocs(latestQuery);
        
        if (!latestSnap.empty) {
          results[system.id] = {
            assessment: { id: latestSnap.docs[0].id, ...latestSnap.docs[0].data() } as Assessment,
            count: countSnap.size
          };
        }
      }
      setSystemLatestAssessments(results);
      setLoadingLatest(false);
    };

    fetchLatest();
  }, [systems, db, user]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-destructive";
  };

  const getBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-400/10 border-emerald-400/20";
    if (score >= 60) return "bg-yellow-400/10 border-yellow-400/20";
    if (score >= 40) return "bg-orange-400/10 border-orange-400/20";
    return "bg-destructive/10 border-destructive/20";
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="font-headline text-4xl font-bold tracking-tight mb-2">Workspace Dashboard</h1>
            <p className="text-muted-foreground text-lg">Monitor inclusive AI compliance across your system inventory.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/systems/new">
              <Button variant="outline" className="h-11 px-6 text-base">
                <PlusCircle className="w-5 h-5 mr-2" />
                Add System
              </Button>
            </Link>
            <Link href="/assessments/new">
              <Button className="h-11 px-6 text-base shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" />
                New Assessment
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {systems?.map((system) => {
            const data = systemLatestAssessments[system.id];
            const hasAssessment = !!data;
            
            return (
              <Card key={system.id} className="glass-morphism border-primary/10 hover:border-primary/30 transition-all flex flex-col group">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="uppercase text-[10px] tracking-widest font-bold">
                      {system.type}
                    </Badge>
                    <Link href={system.url} target="_blank">
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                  </div>
                  <CardTitle className="font-headline text-2xl">{system.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{system.url}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-grow">
                  {loadingLatest ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Fetching latest DISA data...</span>
                    </div>
                  ) : hasAssessment ? (
                    <div className="space-y-4">
                      <div className={cn("rounded-xl p-4 border flex items-center justify-between", getBgColor(data.assessment.overallScore))}>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Latest DISA Score</p>
                          <p className={cn("text-4xl font-headline font-bold", getScoreColor(data.assessment.overallScore))}>
                            {data.assessment.overallScore}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">v{data.assessment.version}</p>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {data.assessment.overallScore >= 60 ? "STABLE" : "AT RISK"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 p-2 rounded-lg">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase mb-1">
                            <Calendar className="w-3 h-3" /> Tested
                          </div>
                          <p className="text-xs font-medium">{data.assessment.createdAt.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="bg-muted/30 p-2 rounded-lg">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase mb-1">
                            <BarChart3 className="w-3 h-3" /> Audits
                          </div>
                          <p className="text-xs font-medium">{data.count} Runs</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                      <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                      <p className="text-xs text-muted-foreground px-4">No assessments found for this system yet.</p>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-4 border-t border-primary/5 gap-2">
                  <Button variant="ghost" size="sm" className="w-full text-xs h-9" asChild>
                    <Link href={`/history?system=${system.id}`}>
                      <Layers className="w-3 h-3 mr-2" /> History
                    </Link>
                  </Button>
                  <Button size="sm" className="w-full text-xs h-9" asChild>
                    <Link href={`/assessments/new?system=${system.id}`}>
                      Run Test <ArrowRight className="w-3 h-3 ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}

          {!systemsLoading && systems?.length === 0 && (
            <Card className="col-span-full border-dashed border-2 flex flex-col items-center justify-center p-16 text-center bg-transparent">
              <div className="bg-primary/10 p-6 rounded-full mb-6">
                <Bot className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-2">Build Your Inventory</CardTitle>
              <CardDescription className="mb-8 max-w-sm text-lg">
                Connect your first AI assistant to start measuring its inclusivity performance.
              </CardDescription>
              <Link href="/systems/new">
                <Button size="lg" className="px-8 h-12">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First System
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
