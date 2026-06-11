
"use client";

import { useState, useMemo, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { AISystem, PERSONAS, PersonaType, TestRunResult } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectValue,
  SelectTrigger
} from "@/components/ui/select";
import { ShieldAlert, Play, Loader2, Users, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { computeDISAScore } from "@/lib/scoring";

function NewAssessmentContent() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedSystemId = searchParams.get("system") || "";
  const { toast } = useToast();
  
  const [selectedSystemId, setSelectedSystemId] = useState<string>(preSelectedSystemId);
  const [version, setVersion] = useState<string>("1.0");
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

  const selectedSystem = useMemo(() => {
    return systems?.find(s => s.id === selectedSystemId);
  }, [systems, selectedSystemId]);

  const togglePersona = (persona: PersonaType) => {
    setSelectedPersonas(prev => 
      prev.includes(persona) 
        ? prev.filter(p => p !== persona) 
        : [...prev, persona]
    );
  };

  const handleRunTest = async () => {
    if (!selectedSystem || selectedPersonas.length === 0 || !user || !db || !version) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Please ensure a system, version, and at least one persona are selected.",
      });
      return;
    }

    setRunning(true);
    try {
      const response = await fetch("/api/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          personas: selectedPersonas,
          url: selectedSystem.url 
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to initiate audit.");
      }

      const { results }: { results: TestRunResult[] } = await response.json();
      
      const score = computeDISAScore(results);

      const assessmentRef = doc(collection(db, "assessments"));
      const assessmentData = {
        systemId: selectedSystem.id,
        userId: user.uid,
        version,
        createdAt: serverTimestamp(),
        overallScore: score
      };

      setDoc(assessmentRef, assessmentData)
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: assessmentRef.path,
            operation: 'create',
            requestResourceData: assessmentData
          }));
        });

      // Optimistically write test runs
      results.forEach((res) => {
        const runRef = doc(collection(db, "testRuns"));
        const runData = {
          ...res,
          assessmentId: assessmentRef.id,
          createdAt: serverTimestamp()
        };
        
        setDoc(runRef, runData)
          .catch(async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: runRef.path,
              operation: 'create',
              requestResourceData: runData
            }));
          });
      });

      toast({
        title: "Audit Finalized",
        description: `DISA Score for v${version}: ${score}`,
      });

      router.push(`/assessments/${assessmentRef.id}/results`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Critical Audit Error",
        description: err.message,
      });
      setRunning(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-12 flex justify-center">
      <Card className="w-full max-w-4xl glass-morphism border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-primary" />
            <CardTitle className="font-headline text-3xl">Initiate Fairness Audit</CardTitle>
          </div>
          <CardDescription className="text-lg">
            Deterministic persona-based scanning for functional AI equity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Select AI System</Label>
              <Select value={selectedSystemId} onValueChange={setSelectedSystemId} disabled={systemsLoading}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={systemsLoading ? "Loading..." : "Target system"} />
                </SelectTrigger>
                <SelectContent>
                  {systems?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Audit Version
              </Label>
              <Input 
                value={version} 
                onChange={e => setVersion(e.target.value)} 
                placeholder="e.g. 1.0.0-alpha"
                className="h-12"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Target Disability Personas
              </Label>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setSelectedPersonas([...PERSONAS])}
                className="text-xs"
              >
                Select All Personas
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="text-sm font-medium cursor-pointer leading-none flex-grow"
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
            className="px-10 h-14 text-lg" 
            onClick={handleRunTest}
            disabled={running || !selectedSystemId || selectedPersonas.length === 0 || !version}
          >
            {running ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" />Running Scans...</> : <><Play className="w-5 h-5 mr-3" />Start DISA Audit</>}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function NewAssessmentPage() {
  return (
    <AuthGuard>
      <Navbar />
      <Suspense fallback={<div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary" /></div>}>
        <NewAssessmentContent />
      </Suspense>
    </AuthGuard>
  );
}
