
"use client";

import { useMemo } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { AISystem, Assessment } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
  Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

  const assessmentsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "assessments"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );
  }, [db, user]);

  const { data: systems, loading: systemsLoading } = useCollection<AISystem>(systemsQuery);
  const { data: assessments, loading: assessmentsLoading } = useCollection<Assessment>(assessmentsQuery);

  const latestAssessment = assessments?.[0] || null;
  const loading = systemsLoading || assessmentsLoading;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-destructive";
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="font-headline text-4xl font-bold tracking-tight mb-2">Workspace Dashboard</h1>
            <p className="text-muted-foreground text-lg">Monitor your AI compliance and fairness metrics.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/assessments/new">
              <Button className="h-11 px-6 text-base shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" />
                New Assessment
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="glass-morphism border-primary/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-24 h-24" />
            </div>
            <CardHeader>
              <CardDescription className="text-sm uppercase tracking-wider font-semibold">Latest DISA Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("text-6xl font-headline font-bold", latestAssessment ? getScoreColor(latestAssessment.overallScore) : "text-muted-foreground")}>
                {latestAssessment ? latestAssessment.overallScore : "--"}
              </div>
              <p className="text-muted-foreground mt-2 flex items-center gap-1 text-sm">
                {latestAssessment ? (
                  <>Updated {latestAssessment.createdAt.toDate().toLocaleDateString()}</>
                ) : (
                  "No assessments run yet"
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-primary/20">
            <CardHeader>
              <CardDescription className="text-sm uppercase tracking-wider font-semibold">Total Systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-headline font-bold text-primary">
                {systems?.length || 0}
              </div>
              <p className="text-muted-foreground mt-2 text-sm">Active AI assistants monitored</p>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-primary/20">
            <CardHeader>
              <CardDescription className="text-sm uppercase tracking-wider font-semibold">Active Audits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-headline font-bold text-secondary">
                {loading ? "..." : "Stable"}
              </div>
              <p className="text-muted-foreground mt-2 text-sm flex items-center gap-1">
                <Activity className="w-4 h-4 text-secondary" />
                All systems reporting normally
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          AI Systems Inventory
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems?.map((system) => (
              <Card key={system.id} className="glass-morphism border-primary/10 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="mb-2 uppercase text-[10px] tracking-widest font-bold">
                      {system.type}
                    </Badge>
                    <Link href={system.url} target="_blank">
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                  </div>
                  <CardTitle className="font-headline text-xl">{system.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{system.url}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex justify-between items-center border-t border-primary/5 mt-4">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold">P{i}</div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/history?system=${system.id}`}>
                      View History <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}

            {systems?.length === 0 && (
              <Card className="col-span-full border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-transparent">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle className="mb-2">No AI Systems Added</CardTitle>
                <CardDescription className="mb-6 max-w-sm">
                  Connect your first AI chatbot or assistant to start auditing for accessibility and fairness.
                </CardDescription>
                <Link href="/systems/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add System
                  </Button>
                </Link>
              </Card>
            )}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
