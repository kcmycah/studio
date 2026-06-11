
"use client";

import { useEffect, useState, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { AISystem, Assessment } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  History as HistoryIcon, 
  Eye, 
  Search,
  Calendar,
  Layers,
  Loader2,
  Trash2
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user || !db) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "assessments"), 
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      
      const systemsSnap = await getDocs(query(collection(db, "ai_systems"), where("userId", "==", user.uid)));
      const systemsMap = new Map(systemsSnap.docs.map(d => [d.id, (d.data() as AISystem).name]));

      const results = snap.docs
        .map(d => {
          const data = d.data() as Assessment;
          return {
            id: d.id,
            ...data,
            systemName: systemsMap.get(data.systemId) || "Unknown System"
          };
        })
        .filter(item => !!item.createdAt) // Ensure createdAt exists to prevent sort errors
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

      const filteredResults = systemIdFilter 
        ? results.filter(a => a.systemId === systemIdFilter)
        : results;
      
      setAssessments(filteredResults);
    } catch (err) {
      console.error("Error fetching history:", err);
      toast({ variant: "destructive", title: "Failed to load history" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, db, systemIdFilter]);

  const handleDeleteAssessment = async () => {
    if (!deletingId || !db) return;
    try {
      await deleteDoc(doc(db, "assessments", deletingId));
      setAssessments(prev => prev.filter(a => a.id !== deletingId));
      toast({ title: "Report Deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error deleting report" });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = assessments.filter(a => 
    a.systemName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-[260px] p-8 max-w-7xl mx-auto w-full">
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Audit History</h1>
              <p className="text-muted-foreground mt-1">
                {systemIdFilter ? "Showing reports for selected system" : "Review and manage past accessibility performance records."}
              </p>
            </div>
            {systemIdFilter && (
              <Button variant="ghost" asChild className="font-bold">
                <Link href="/history">Clear Filter</Link>
              </Button>
            )}
          </div>
        </header>

        <Card className="shadow-sm mb-8">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by system name..." 
                className="pl-10 h-11" 
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
              <p className="text-sm font-medium">Loading history records...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">AI System</TableHead>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">DISA Score</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/5 transition-colors">
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-accent" />
                        <span className="truncate max-w-[200px]">{item.systemName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-medium">
                      {item.createdAt?.toDate?.().toLocaleDateString() || "Pending..."}
                    </TableCell>
                    <TableCell>
                       <span className={cn("text-2xl font-black", 
                         item.overallScore >= 80 ? "text-emerald-500" : 
                         item.overallScore >= 60 ? "text-amber-500" : 
                         "text-destructive"
                       )}>
                         {item.overallScore}
                       </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.overallScore >= 60 ? "secondary" : "outline"} className={cn("text-[10px] font-bold uppercase", item.overallScore < 60 && "border-destructive text-destructive")}>
                        {item.overallScore >= 80 ? "Compliant" : item.overallScore >= 60 ? "Fair" : "At Risk"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild className="font-bold">
                          <Link href={`/assessments/${item.id}/results`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeletingId(item.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-muted p-6 rounded-full">
                          <HistoryIcon className="w-12 h-12 opacity-20" />
                        </div>
                        <p>No matching audit records found.</p>
                        <Button variant="link" asChild className="font-black text-accent">
                          <Link href="/assessments/new">Start your first audit</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this audit report?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this assessment record from your history. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAssessment} className="bg-destructive text-white hover:bg-destructive/90">
                Delete Report
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      }>
        <HistoryContent />
      </Suspense>
    </AuthGuard>
  );
}
