
"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, orderBy, limit } from "firebase/firestore";
import { AISystem, Assessment, UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  PlusCircle,
  Loader2,
  Layers,
  MoreVertical,
  Trash2,
  ShieldCheck,
  Play
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getUserUsage, UserUsage } from "@/lib/usage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const { data: systems, loading: systemsLoading } = useCollection<AISystem>("ai_systems");
  const [systemStats, setSystemStats] = useState<Record<string, { latest: Assessment, count: number }>>({});
  const [loadingLatest, setLoadingLatest] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    getUserUsage(db, user.uid).then(setUsage).finally(() => setLoadingUsage(false));
  }, [user, db, systems]);

  useEffect(() => {
    if (!systems || !db || !user) {
      setLoadingLatest(false);
      return;
    }

    const fetchData = async () => {
      const stats: Record<string, { latest: Assessment, count: number }> = {};
      for (const system of systems) {
        // Query the subcollection for each system specifically
        const q = query(
          collection(db, "ai_systems", system.id, "assessments"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          stats[system.id] = {
            latest: { id: snap.docs[0].id, ...snap.docs[0].data() } as Assessment,
            count: 1
          };
        }
      }
      setSystemStats(stats);
      setLoadingLatest(false);
    };

    fetchData();
  }, [systems, db, user]);

  const handleDeleteSystem = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "ai_systems", id));
      toast({ title: "System Deleted", description: "The AI system and its references have been removed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not remove system." });
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Workspace</h1>
              <p className="text-muted-foreground mt-1">Manage and monitor your inclusive AI endpoints.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild><Link href="/systems/new"><PlusCircle className="w-4 h-4 mr-2" />Add System</Link></Button>
              <Button asChild className="bg-accent text-white"><Link href="/assessments/new"><Play className="w-4 h-4 mr-2" />New Assessment</Link></Button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systemsLoading && !systems ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse bg-muted h-[200px]" />
              ))
            ) : (
              systems?.map((system) => {
                const data = systemStats[system.id];
                return (
                  <Card key={system.id} className="hover:border-accent/50 transition-all flex flex-col group relative overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between">
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">{system.type}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/systems/${system.id}/edit`}>Edit System</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/history?system=${system.id}`}>View History</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteSystem(system.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-xl font-bold mt-2 truncate">{system.name}</CardTitle>
                      <CardDescription className="truncate text-xs font-mono opacity-50">{system.url}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      {loadingLatest ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-accent" />
                      ) : data ? (
                        <div className="space-y-4">
                          <div className="bg-muted/30 p-4 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Latest Score</p>
                              <p className={cn("text-4xl font-black", data.latest.overallScore >= 80 ? "text-emerald-500" : "text-accent")}>{data.latest.overallScore}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Version</p>
                              <Badge variant="outline" className="mt-1 font-mono text-[10px]">v{data.latest.version}</Badge>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center border-2 border-dashed rounded-xl flex flex-col items-center gap-2">
                           <ShieldCheck className="w-6 h-6 text-muted-foreground/30" />
                           <p className="text-xs text-muted-foreground italic">No assessments run yet.</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-4 border-t gap-3">
                      <Button variant="ghost" size="sm" className="flex-1 font-bold text-[11px] uppercase tracking-wider" asChild>
                        <Link href={`/systems/${system.id}/versions`}>History</Link>
                      </Button>
                      <Button size="sm" className="flex-1 bg-accent text-white font-bold text-[11px] uppercase tracking-wider" asChild>
                        <Link href={`/assessments/new?system=${system.id}`}>Run Audit</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
          
          {systems?.length === 0 && !systemsLoading && (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
              <Bot className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No AI systems registered</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Start by adding an AI endpoint or chatbot to your inventory for accessibility monitoring.</p>
              <Button asChild className="bg-accent text-white"><Link href="/systems/new">Register First System</Link></Button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
