"use client";

import { useEffect, useState, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, limit, orderBy } from "firebase/firestore";
import { AISystem, Assessment } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  Search,
  Layers,
  Loader2,
  Trash2,
  Eye
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";

function HistoryContent() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const systemIdFilter = searchParams.get("system");
  
  const [assessments, setAssessments] = useState<(Assessment & { systemName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [deletingId, setDeletingId] = useState<{systemId: string, id: string} | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all systems owned by user
        const systemsQuery = query(
          collection(db, "ai_systems"), 
          where("userId", "==", user.uid)
        );
        const systemsSnap = await getDocs(systemsQuery);
        const systems = systemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AISystem));
        
        const allAssessments: (Assessment & { systemName: string })[] = [];
        
        // For each system, fetch assessments from its subcollection
        for (const system of systems) {
          if (systemIdFilter && system.id !== systemIdFilter) continue;
          
          const assessmentQuery = query(
            collection(db, "ai_systems", system.id, "assessments"),
            orderBy("createdAt", "desc"),
            limit(20)
          );
          
          const assessmentSnap = await getDocs(assessmentQuery);
          assessmentSnap.forEach(docSnap => {
            allAssessments.push({
              id: docSnap.id,
              ...docSnap.data() as Assessment,
              systemName: system.name
            });
          });
        }
        
        // Sort all aggregated assessments by date
        setAssessments(allAssessments.sort((a, b) => {
          const dateA = a.createdAt?.toMillis?.() || 0;
          const dateB = b.createdAt?.toMillis?.() || 0;
          return dateB - dateA;
        }));
      } catch (error) {
        console.error("History fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, db, systemIdFilter]);

  const handleDeleteAssessment = async () => {
    if (!deletingId || !db) return;
    try {
      await deleteDoc(doc(db, "ai_systems", deletingId.systemId, "assessments", deletingId.id));
      setAssessments(prev => prev.filter(a => a.id !== deletingId.id));
      toast({ title: "Report Deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error deleting report" });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = assessments.filter(a => 
    a.systemName.toLowerCase().includes(filter.toLowerCase()) ||
    a.version.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit History</h1>
            <p className="text-muted-foreground mt-1">Review your inclusive performance records across all systems.</p>
          </div>
          {systemIdFilter && <Button variant="ghost" asChild><Link href="/history">Clear Filter</Link></Button>}
        </header>

        <Card className="shadow-sm mb-8 p-4 flex gap-4 items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by system name or version..." 
              className="pl-10 h-11" 
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        </Card>

        <Card className="shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
              <p>Loading history records...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">AI System</TableHead>
                  <TableHead className="font-bold">Version</TableHead>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">DISA Score</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/5">
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-accent" />
                        <span>{item.systemName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">v{item.version}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-medium">
                      {item.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                    </TableCell>
                    <TableCell>
                       <span className={cn("text-2xl font-black", item.overallScore >= 80 ? "text-emerald-500" : "text-accent")}>
                         {item.overallScore}
                       </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", item.overallScore >= 60 ? "border-emerald-500 text-emerald-500" : "border-destructive text-destructive")}>
                        {item.overallScore >= 80 ? "Strong" : item.overallScore >= 60 ? "Fair" : "At Risk"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild title="View Results">
                          <Link href={`/systems/${item.systemId}/assessments/${item.id}/results`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeletingId({systemId: item.systemId, id: item.id})} className="text-destructive" title="Delete Report">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-24 italic">No matching records found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Report?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the record from your history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAssessment} className="bg-destructive text-white">Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return <AuthGuard><Suspense><HistoryContent /></Suspense></AuthGuard>;
}