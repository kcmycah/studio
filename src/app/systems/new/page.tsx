
"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Globe, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function NewSystemPage() {
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", type: "Chatbot" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db) return;
    
    setLoading(true);
    const systemsRef = collection(db, "ai_systems");
    const docData = { ...formData, userId: currentUser.uid, createdAt: serverTimestamp() };

    addDoc(systemsRef, docData).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: systemsRef.path,
        operation: 'create',
        requestResourceData: docData,
      }));
    });

    toast({ title: "System Registered", description: "System added to your inventory." });
    setTimeout(() => router.push("/dashboard"), 500);
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 flex justify-center items-start pt-20">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-accent" />
                <CardTitle className="text-2xl font-bold">Register AI System</CardTitle>
              </div>
              <CardDescription>Define the AI endpoint you want to audit for accessibility scans.</CardDescription>
            </CardHeader>
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
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
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
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
