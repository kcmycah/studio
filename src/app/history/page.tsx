"use client";

import { useEffect, useState, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
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
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function HistoryContent() {
  const { user } = useUser();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const systemIdFilter = searchParams.get("system");
  
  const [assessments, setAssessments] = useState<(Assessment & { systemName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user || !db) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        let q = query(
          collection(db, "assessments"), 
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        if (systemIdFilter) {
          q = query(
            collection(db, "assessments"),
            where("userId", "==", user.uid),
            where("systemId", "==", systemIdFilter),
            orderBy("createdAt", "desc")
          );
        }

        const snap = await getDocs(q);
        
        const results = await Promise.all(snap.docs.map(async d => {
          const data = d.data() as Assessment;
          const systemSnap = await getDoc(doc(db, "ai_systems", data.systemId));
          return {
            id: d.id,
            ...data,
            systemName: systemSnap.exists() ? (systemSnap.data() as AISystem).name : "Unknown System"
          };
        }));
        
        setAssessments(results);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, db, systemIdFilter]);

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
              <Button variant="ghost" asChild>
                <Link href="/history">Clear Filter</Link>
              </Button>
            )}
          </div>
        </header>

        <Card className="glass-morphism mb-8">
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
            <Button variant="outline" className="h-11">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-morphism overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
              <p>Loading history...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>AI System</TableHead>
                  <TableHead>Date Conducted</TableHead>
                  <TableHead>Overall Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/5 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-accent" />
                        {item.systemName}
                      </div>
                    </TableCell>
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
                      <Badge variant={item.overallScore >= 60 ? "secondary" : "outline"} className={cn(item.overallScore < 60 && "border-destructive text-destructive")}>
                        {item.overallScore >= 80 ? "Compliant" : item.overallScore >= 60 ? "Fair" : "At Risk"}
                      </Badge>
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
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">
                      <div className="flex flex-col items-center gap-2">
                        <HistoryIcon className="w-12 h-12 opacity-20 mb-2" />
                        <p>No matching audit records found.</p>
                        <Button variant="link" asChild>
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
