"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-context";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { AISystem, Assessment } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  History, 
  Eye, 
  Search,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default function HistoryPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<(Assessment & { systemName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, "assessments"), 
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const filtered = assessments.filter(a => 
    a.systemName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-3 rounded-xl">
              <History className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-headline text-4xl font-bold">Audit History</h1>
          </div>
          <p className="text-muted-foreground text-lg">Review and manage past accessibility performance records.</p>
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
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                    No matching audit records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </AuthGuard>
  );
}