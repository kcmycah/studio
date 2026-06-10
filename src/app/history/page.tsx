
"use client";

import { useEffect, useState, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
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

        // If a specific system filter is provided in the URL, apply it
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
    <main className="container mx-auto px-4 py-12 max-w-6xl">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <HistoryIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-headline text-4xl font-bold">Audit History</h1>
              <p className="text-muted-foreground text-lg">
                {systemIdFilter ? "Showing reports for selected system" : "Review and manage past accessibility performance records."}
              </p>
            </div>
          </div>
          {systemIdFilter && (
            <Button variant="ghost" asChild>
              <Link href="/history">Clear Filter</Link>
            </Button>
          )}
        </div>
      </header>

      <Card className="glass-morphism border-primary/20 mb-8">
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
          <Button variant="outline" className="h-11 px-6">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-morphism border-primary/10 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading your audit history...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-headline font-bold">AI System</TableHead>
                <TableHead className="font-headline font-bold">Date Conducted</TableHead>
                <TableHead className="font-headline font-bold">Overall Score</TableHead>
                <TableHead className="font-headline font-bold">Status</TableHead>
                <TableHead className="text-right font-headline font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-primary/5 transition-colors border-b border-primary/5">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      {item.systemName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.createdAt.toDate().toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <span className={cn("text-xl font-headline font-bold", 
                         item.overallScore >= 80 ? "text-emerald-400" : 
                         item.overallScore >= 60 ? "text-yellow-400" : 
                         "text-destructive"
                       )}>
                         {item.overallScore}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.overallScore >= 60 ? "secondary" : "outline"} className={cn(item.overallScore < 60 && "border-destructive text-destructive")}>
                      {item.overallScore >= 80 ? "Compliant" : item.overallScore >= 60 ? "Fair" : "At Risk"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="hover:text-primary">
                      <Link href={`/assessments/${item.id}/results`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Results
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
  );
}

export default function HistoryPage() {
  return (
    <AuthGuard>
      <Navbar />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <HistoryContent />
      </Suspense>
    </AuthGuard>
  );
}
