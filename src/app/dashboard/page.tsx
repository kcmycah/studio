"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, orderBy, limit } from "firebase/firestore";
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
  TrendingUp,
  MoreVertical,
  Trash2,
  Edit,
  ShieldCheck
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
        const q = query(
          collection(db, "ai_systems", system.id, "assessments"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          stats[system.id] = {
            latest: { id: snap.docs[0].id, ...snap.docs[0].data() } as Assessment,
            count: 1 // For MVP dashboard, simplified count
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
      toast({ title: "System Deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full">
          <header className="flex justify-between items-center mb-10">
            <div><h1 className="text-3xl font-bold">Workspace</h1></div>
            <div className="flex gap-3">
              <Button variant="outline" asChild><Link href="/systems/new">Add System</Link></Button>
              <Button asChild className="bg-accent text-white"><Link href="/assessments/new">New Assessment</Link></Button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systems?.map((system) => {
              const data = systemStats[system.id];
              return (
                <Card key={system.id} className="hover:border-accent/50 transition-all flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">{system.type}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/systems/${system.id}/edit`}>Edit</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteSystem(system.id)} className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-xl font-bold mt-2 truncate">{system.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {data ? (
                      <div className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Score</p>
                            <p className={cn("text-4xl font-black", data.latest.overallScore >= 80 ? "text-emerald-500" : "text-accent")}>{data.latest.overallScore}</p>
                          </div>
                          <Badge variant="outline">v{data.latest.version}</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-muted-foreground">No assessments run.</div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-4 border-t gap-3">
                    <Button variant="ghost" size="sm" className="flex-1" asChild><Link href={`/systems/${system.id}/versions`}>History</Link></Button>
                    <Button size="sm" className="flex-1 bg-accent text-white" asChild><Link href={`/assessments/new?system=${system.id}`}>Run Audit</Link></Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
