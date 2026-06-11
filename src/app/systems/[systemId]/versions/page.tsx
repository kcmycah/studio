
"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { collection, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  History, 
  ArrowLeft, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight,
  GitCompare,
  Loader2,
  Bot
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export default function VersionHistoryPage() {
  const { systemId } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const [system, setSystem] = useState<AISystem | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  useEffect(() => {
    if (!systemId || !db) return;
    getDoc(doc(db, "ai_systems", systemId as string)).then(snap => {
      if (snap.exists()) setSystem({ id: snap.id, ...snap.data() } as AISystem);
    });
  }, [systemId, db]);

  const assessmentsQuery = useMemo(() => {
    if (!db || !systemId || !user) return null;
    // Security rules require userId filter for list operations
    return query(
      collection(db, "assessments"),
      where("systemId", "==", systemId),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [db, systemId, user]);

  const { data: assessments, loading } = useCollection<Assessment>(assessmentsQuery);

  const toggleSelection = (id: string) => {
    setSelectedVersions(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id].slice(-2)
    );
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      router.push(`/systems/${systemId}/compare?v1=${selectedVersions[0]}&v2=${selectedVersions[1]}`);
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 max-w-5xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-3 rounded-xl">
                  <History className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{system?.name || "System"} History</h1>
                  <p className="text-muted-foreground mt-1">Track accessibility performance across versions.</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleCompare} 
              disabled={selectedVersions.length !== 2}
              className="h-12 px-6 bg-accent text-white"
            >
              <GitCompare className="w-5 h-5 mr-2" />
              Compare Selected ({selectedVersions.length}/2)
            </Button>
          </div>

          <Card className="glass-morphism overflow-hidden">
            {loading ? (
              <div className="py-24 flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
                <p className="text-muted-foreground">Fetching version history...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>DISA Score</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments?.map((item, idx) => {
                    const prevItem = assessments[idx + 1];
                    const diff = prevItem ? item.overallScore - prevItem.overallScore : null;

                    return (
                      <TableRow key={item.id} className="hover:bg-accent/5 transition-colors">
                        <TableCell>
                          <Checkbox 
                            checked={selectedVersions.includes(item.id)}
                            onCheckedChange={() => toggleSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-bold">v{item.version}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.createdAt.toDate().toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xl font-bold", 
                            item.overallScore >= 80 ? "text-emerald-500" : 
                            item.overallScore >= 60 ? "text-amber-500" : 
                            "text-destructive"
                          )}>
                            {item.overallScore}
                          </span>
                        </TableCell>
                        <TableCell>
                          {diff !== null && (
                            <div className={cn("flex items-center gap-1 text-sm font-bold", 
                              diff > 0 ? "text-emerald-500" : diff < 0 ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {diff > 0 ? <ArrowUpRight className="w-4 h-4" /> : diff < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                              {diff === 0 ? "No change" : `${Math.abs(diff)}pts`}
                            </div>
                          )}
                          {diff === null && <span className="text-muted-foreground text-xs italic">Baseline</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/assessments/${item.id}/results`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {assessments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-muted-foreground">
                        <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No assessments recorded for this system yet.</p>
                        <Button variant="link" asChild className="mt-2 text-accent">
                          <Link href={`/assessments/new?system=${systemId}`}>Run your first test</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
