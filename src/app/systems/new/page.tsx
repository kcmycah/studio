"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Globe, Loader2, Save, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from "next/link";

export default function NewSystemPage() {
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", type: "Chatbot" });

  useEffect(() => {
    if (!currentUser || !db) return;
    const checkLimit = async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const status = userSnap.data()?.subscriptionStatus || "free";
        
        const q = query(
          collection(db, "ai_systems"), 
          where("userId", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        
        const max = status === "pro" ? 10 : status === "enterprise" ? 100 : 2;
        if (snap.size >= max) {
          setLimitReached(true);
        }
      } catch (err) {
        console.error("Limit check error:", err);
      } finally {
        setCheckingLimit(false);
      }
    };
    checkLimit();
  }, [currentUser, db]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db || limitReached) return;
    
    setLoading(true);
    const systemsRef = collection(db, "ai_systems");
    const docData = { 
      ...formData, 
      userId: currentUser.uid, 
      createdAt: serverTimestamp() 
    };

    addDoc(systemsRef, docData)
      .then(() => {
        toast({ title: "System Registered", description: "System added to your inventory." });
        router.push("/dashboard");
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: systemsRef.path,
          operation: 'create',
          requestResourceData: docData,
        }));
        setLoading(false);
      });
  };

  if (checkingLimit) return (
    <div className="flex justify-center p-24">
      <Loader2 className="animate-spin text-accent" />
    </div>
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 flex justify-center items-start pt-20">
          <Card className="w-full max-w-2xl border-2 border-border">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-accent" />
                <CardTitle className="text-2xl font-bold">Register AI System</CardTitle>
              </div>
              <CardDescription>Define the AI endpoint you want to audit for accessibility scans.</CardDescription>
            </CardHeader>
            {limitReached ? (
              <CardContent className="py-10 text-center space-y-4">
                <div className="bg-accent/10 p-4 rounded-full w-fit mx-auto">
                  <Zap className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold">Plan Limit Reached</h3>
                <p className="text-muted-foreground">Free users are limited to 2 AI systems. Upgrade to Pro to manage more endpoints.</p>
                <Button asChild className="bg-accent text-white">
                  <Link href="/billing">Upgrade Plan</Link>
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">System Name</Label>
                    <Input id="name" placeholder="e.g. Support Assistant" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">Public URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="url" type="url" placeholder="https://..." className="pl-10" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>System Type</Label>
                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chatbot">Chatbot</SelectItem>
                        <SelectItem value="Voice Assistant">Voice Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-6">
                  <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-accent text-white hover:bg-accent/90">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Create System
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
