
"use client";

import { useState, useMemo } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { AISystem, PERSONAS, PersonaType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ShieldAlert, Play, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { computeDISAScore } from "@/lib/scoring";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function NewAssessmentPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [selectedPersonas, setSelectedPersonas] = useState<PersonaType[]>([]);
  const [running, setRunning] = useState(false);

  const systemsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "ai_systems"),
      where("userId", "==", user.uid)
    );
  }, [db, user]);

  const { data: systems, loading: systemsLoading } = useCollection<AISystem>(systemsQuery);

  const togglePersona = (persona: PersonaType) => {
    setSelectedPersonas(prev => 
      prev.includes(persona) 
        ? prev.filter(p => p !== persona) 
        : [...prev, persona]
    );
  };

  const handleRunTest = async () => {
    if (!selectedSystem || selectedPersonas.length === 0 || !user || !db) {
      toast({
        variant: "destructive",
        title: "Missing Configuration",
        description: "Please select an AI system and at least one disability persona.",
      });
      return;
    }

    setRunning(true);
    try {
      // 1. Get Simulation Results from API
      const response = await fetch("/api/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personas: selectedPersonas })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to simulate tests");
      }

      const { results } = await response.json();

      // 2. Perform Client-Side Mutations (Persist to Firestore)
      // Generate IDs optimistically to link documents without awaiting network roundtrips
      const assessmentRef = doc(collection(db, "assessments"));
      const score = computeDISAScore(results);

      const assessmentData = {
        systemId: selectedSystem,
        userId: user.uid,
        createdAt: serverTimestamp(),
        overallScore: score
      };

      // Create Assessment
      setDoc(assessmentRef, assessmentData)
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: assessmentRef.path,
            operation: 'create',
            requestResourceData: assessmentData
          }));
        });

      // Create Individual Test Runs
      results.forEach((res: any) => {
        const runRef = doc(collection(db, "testRuns"));
        const runData = {
          ...res,
          assessmentId: assessmentRef.id,
          createdAt: serverTimestamp()
        };
        
        setDoc(runRef, runData)
          .catch(async (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: runRef.path,
              operation: 'create',
              requestResourceData: runData
            }));
          });
      });

      // Navigate to results immediately
      router.push(`/assessments/${assessmentRef.id}/results`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Audit Failed",
        description: err.message,
      });
      setRunning(false);
    }
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex justify-center">
        <Card className="w-full max-w-4xl glass-morphism border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-8 h-8 text-primary" />
              <CardTitle className="font-headline text-3xl">Inclusive Fairness Audit</CardTitle>
            </div>
            <CardDescription className="text-lg">
              Run automated accessibility scans across multiple disability personas to calculate your DISA compliance score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Step 1: Select AI System</Label>
              <Select value={selectedSystem} onValueChange={setSelectedSystem} disabled={systemsLoading}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder={systemsLoading ? "Loading systems..." : "Choose a system to audit"} />
                </SelectTrigger>
                <SelectContent>
                  {systems && systems.length > 0 ? (
                    systems.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.url})</SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                      No systems found. Add one in the dashboard.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Step 2: Targeted Disability Personas
                </Label>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setSelectedPersonas([...PERSONAS])}
                >
                  Select All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERSONAS.map(persona => (
                  <div 
                    key={persona} 
                    className={cn(
                      "flex items-center space-x-3 border p-4 rounded-xl transition-all cursor-pointer hover:bg-primary/5",
                      selectedPersonas.includes(persona) ? "border-primary bg-primary/10 shadow-inner" : "border-border"
                    )}
                    onClick={() => togglePersona(persona)}
                  >
                    <Checkbox 
                      id={persona} 
                      checked={selectedPersonas.includes(persona)}
                      onCheckedChange={() => togglePersona(persona)}
                    />
                    <label 
                      htmlFor={persona} 
                      className="text-base font-medium cursor-pointer leading-none flex-grow"
                    >
                      {persona}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-primary/5 pt-8">
            <Button variant="ghost" onClick={() => router.push("/dashboard")} disabled={running}>
              Cancel
            </Button>
            <Button 
              size="lg" 
              className="px-10 h-14 text-lg shadow-xl shadow-primary/30" 
              onClick={handleRunTest}
              disabled={running || systemsLoading || systems?.length === 0}
            >
              {running ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Running Audits...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-3" />
                  Initiate Audit
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </AuthGuard>
  );
}
