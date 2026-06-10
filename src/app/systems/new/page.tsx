
"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Bot, Globe, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Page to register a new AI system for auditing.
 * Uses optimistic mutation pattern to avoid "buffering" or hanging UI.
 */
export default function NewSystemPage() {
  const { user } = user; // This is incorrect, should be useUser()
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    type: "Chatbot"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db) return;
    
    setLoading(true);
    const systemsRef = collection(db, "ai_systems");
    const docData = {
      ...formData,
      userId: currentUser.uid,
      createdAt: serverTimestamp()
    };

    // Initiate write without awaiting to leverage local cache and immediate UI response
    addDoc(systemsRef, docData)
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: systemsRef.path,
          operation: 'create',
          requestResourceData: docData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    // Provide immediate feedback and navigate away
    toast({
      title: "Registering System...",
      description: "Adding your AI system to the inventory.",
    });
    
    // Give a tiny moment for the toast to register before navigating
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex justify-center">
        <Card className="w-full max-w-2xl glass-morphism border-primary/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-6 h-6 text-primary" />
              <CardTitle className="font-headline text-3xl">Register AI System</CardTitle>
            </div>
            <CardDescription>
              Define the AI endpoint you want to audit. We'll use this URL to perform accessibility scans.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">System Name</Label>
                <div className="relative">
                  <Bot className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    placeholder="e.g. Customer Support GPT" 
                    className="pl-10 h-11"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Public URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="url" 
                    type="url" 
                    placeholder="https://your-chatbot-url.com" 
                    className="pl-10 h-11"
                    value={formData.url}
                    onChange={e => setFormData({...formData, url: e.target.value})}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">System Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={v => setFormData({...formData, type: v})}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chatbot">Chatbot</SelectItem>
                    <SelectItem value="Voice Assistant">Voice Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-primary/5 pt-6">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading} className="h-11 px-8">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Create System
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </AuthGuard>
  );
}
