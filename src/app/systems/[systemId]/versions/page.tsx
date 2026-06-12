
"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { query, orderBy, doc, getDoc, where } from "firebase/firestore";
import { AISystem, Assessment } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const params = useParams();
  const systemId = params?.systemId as string;
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const [system, setSystem] = useState<AISystem | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  useEffect(() => {
    if (!systemId || !db) return;
    const sysRef = doc(db, "ai_systems", systemId);
    getDoc(sysRef).then(snap => {
      if (snap.exists()) setSystem({ id: snap.id, ...snap.data() } as AISystem);
    });
  }, [systemId, db]);

  // Assessment subcollection query
  const { data: assessments, loading } = useCollection<Assessment>(
    systemId ? `ai_systems/${systemId}/assessments` : null,
    [orderBy("createdAt", "desc")]
  );

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
      <div className="flex min-h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-5xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-3 rounded-xl"><History className="w-8 h-8 text-accent" /></div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{system?.name || "System"} History</h1>
                  <p className="text-muted-foreground mt-1">Track accessibility across versions.</p>
                </div>
              </div>
            </div>
            <Button onClick={handleCompare} disabled={selectedVersions.length !== 2} className="h-12 px-6 bg-accent text-white">
              <GitCompare className="w-5 h-5 mr-2" /> Compare ({selectedVersions.length}/2)
            </Button>
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="py-24 flex flex-col items-center"><Loader2 className="w-10 h-10 animate-spin text-accent mb-4" /></div>
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
                      <TableRow key={item.id} className="hover:bg-accent/5">
                        <TableCell><Checkbox checked={selectedVersions.includes(item.id)} onCheckedChange={() => toggleSelection(item.id)}/></TableCell>
                        <TableCell className="font-bold">v{item.version}</TableCell>
                        <TableCell className="text-muted-foreground">{item.createdAt?.toDate?.().toLocaleDateString() || "N/A"}</TableCell>
                        <TableCell>
                          <span className={cn("text-xl font-bold", item.overallScore >= 80 ? "text-emerald-500" : "text-accent")}>{item.overallScore}</span>
                        </TableCell>
                        <TableCell>
                          {diff !== null && (
                            <div className={cn("flex items-center gap-1 text-sm font-bold", diff > 0 ? "text-emerald-500" : "text-destructive")}>
                              {diff > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {Math.abs(diff)}pts
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/systems/${systemId}/assessments/${item.id}/results`}><Eye className="w-4 h-4 mr-2" />View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
