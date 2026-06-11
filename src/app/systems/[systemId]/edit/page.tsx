
"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Globe, Loader2, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AISystem } from "@/lib/types";

export default function EditSystemPage() {
  const { systemId } = useParams();
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", type: "Chatbot" });

  useEffect(() => {
    if (!systemId || !db) return;
    const fetchSystem = async () => {
      try {
        const snap = await getDoc(doc(db, "ai_systems", systemId as string));
        if (snap.exists()) {
          const data = snap.data() as AISystem;
          setFormData({ name: data.name, url: data.url, type: data.type });
        } else {
          toast({ variant: "destructive", title: "System not found" });
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Error fetching system:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSystem();
  }, [systemId, db, router, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db || !systemId) return;
    
    setSaving(true);
    const systemRef = doc(db, "ai_systems", systemId as string);
    const updateData = { ...formData };

    updateDoc(systemRef, updateData)
      .then(() => {
        toast({ title: "System Updated", description: "Your changes have been saved." });
        router.push("/dashboard");
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: systemRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      })
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 flex flex-col items-center justify-start pt-20">
          <div className="w-full max-w-2xl mb-6">
            <Button variant="ghost" onClick={() => router.back()} className="-ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-accent" />
                <CardTitle className="text-2xl font-bold">Edit AI System</CardTitle>
              </div>
              <CardDescription>Update the details for your AI endpoint.</CardDescription>
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
                <Button type="submit" disabled={saving} className="bg-accent text-white hover:bg-accent/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
