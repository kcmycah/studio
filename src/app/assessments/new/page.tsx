
"use client";

import { useState, useMemo, Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
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
import { computeFullDISAScore } from "@/lib/scoring/disaScoring";

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

  const { data: systems, loading: systemsLoading } = useCollection<AISystem>("ai_systems");

  const selectedSystem = useMemo(() => {
    return systems?.find(s => s.id === selectedSystemId);
  }, [systems, selectedSystemId]);

  const togglePersona = (persona: PersonaType) => {
    setSelectedPersonas(prev => 
      prev.includes(persona) ? prev.filter(p => p !== persona) : [...prev, persona]
    );
  };

  const handleRunTest = async () => {
    if (!selectedSystem || selectedPersonas.length === 0 || !user || !db || !version) return;

    setRunning(true);
    try {
      const response = await fetch("/api/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personas: selectedPersonas, url: selectedSystem.url })
      });

      if (!response.ok) throw new Error("Failed to initiate audit.");
      const { results, domainScores, biasExplanation } = await response.json();
      
      const finalScores = computeFullDISAScore({
        accessibilityScore: domainScores.accessibility,
        biasRiskScore: domainScores.biasRisk,
        transparencyScore: domainScores.transparency,
        equityDataScore: domainScores.equityData
      });

      // Path: ai_systems/{systemId}/assessments/{assessmentId}
      const assessmentRef = doc(collection(db, "ai_systems", selectedSystem.id, "assessments"));
      const assessmentData = {
        systemId: selectedSystem.id,
        userId: user.uid,
        version,
        createdAt: serverTimestamp(),
        overallScore: finalScores.overallScore,
        domainScores: {
          accessibility: finalScores.accessibilityScore,
          biasRisk: finalScores.biasRiskScore,
          transparency: finalScores.transparencyScore,
          equityData: finalScores.equityDataScore
        },
        details: { biasExplanation: biasExplanation || "" }
      };

      await setDoc(assessmentRef, assessmentData);

      for (const res of results) {
        const runRef = doc(collection(db, "testRuns"));
        await setDoc(runRef, {
          ...res,
          assessmentId: assessmentRef.id,
          systemId: selectedSystem.id,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }

      toast({ title: "Audit Finalized", description: `Score: ${finalScores.overallScore}` });
      router.push(`/systems/${selectedSystem.id}/assessments/${assessmentRef.id}/results`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setRunning(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-5xl mx-auto w-full">
        <header className="mb-10 text-foreground"><h1 className="text-3xl font-bold">New Assessment</h1></header>
        <Card>
          <CardHeader><CardTitle>Initiate Fairness Audit</CardTitle></CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>AI System</Label>
                <Select value={selectedSystemId} onValueChange={setSelectedSystemId} disabled={systemsLoading}>
                  <SelectTrigger><SelectValue placeholder="Target system" /></SelectTrigger>
                  <SelectContent>{systems?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={version} onChange={e => setVersion(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <Label>Target Personas</Label>
              <div className="grid grid-cols-3 gap-4">
                {PERSONAS.map(p => (
                  <div key={p} className="flex items-center space-x-2 border p-3 rounded-lg bg-card">
                    <Checkbox id={p} checked={selectedPersonas.includes(p)} onCheckedChange={() => togglePersona(p)} />
                    <label htmlFor={p} className="text-sm font-medium text-foreground">{p}</label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-8">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>Cancel</Button>
            <Button size="lg" className="bg-accent text-white" onClick={handleRunTest} disabled={running || !selectedSystemId || selectedPersonas.length === 0}>
              {running ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" />Running...</> : "Start Audit"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default function NewAssessmentPage() {
  return <AuthGuard><Suspense><NewAssessmentContent /></Suspense></AuthGuard>;
}
