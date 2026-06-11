"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { User, Mail, Bell, Calendar, Loader2, Save, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !db) return;
    const fetchProfile = async () => {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() } as UserProfile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, db]);

  const handleSave = async () => {
    if (!profile || !db || !user) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        settings: profile.settings
      });
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  const isPro = profile?.subscriptionStatus === 'pro' || profile?.subscriptionStatus === 'enterprise';

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 max-w-4xl mx-auto w-full">
          <header className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your workspace preferences and automation.</p>
          </header>

          <div className="space-y-8">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Account Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input value={user?.email || ""} disabled className="pl-10" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-accent" />
                  Notifications
                </CardTitle>
                <CardDescription>How you receive audit results.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Audit Reports</Label>
                    <p className="text-xs text-muted-foreground">Receive deterministic report summaries via email.</p>
                  </div>
                  <Switch 
                    checked={profile?.settings.emailResults} 
                    onCheckedChange={(checked) => setProfile(p => p ? {...p, settings: {...p.settings, emailResults: checked}} : null)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={cn("glass-morphism", !isPro && "opacity-60")}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent" />
                    Scheduled Monitoring
                  </div>
                  {!isPro && <Badge variant="secondary" className="bg-accent text-white">PRO</Badge>}
                </CardTitle>
                <CardDescription>Automate DISA audits for consistent compliance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isPro && (
                  <div className="bg-accent/10 p-4 rounded-xl flex items-center gap-3 border border-accent/20">
                    <ShieldAlert className="w-5 h-5 text-accent" />
                    <p className="text-sm font-medium">Upgrade to Pro to enable automated audits.</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Monitoring</Label>
                    <p className="text-xs text-muted-foreground">Auto-run scans on registered AI systems.</p>
                  </div>
                  <Switch 
                    disabled={!isPro}
                    checked={profile?.settings.scheduledMonitor?.enabled}
                    onCheckedChange={(checked) => setProfile(p => p ? {
                      ...p, 
                      settings: {
                        ...p.settings, 
                        scheduledMonitor: { ...p.settings.scheduledMonitor!, enabled: checked }
                      }
                    } : null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select 
                    disabled={!isPro || !profile?.settings.scheduledMonitor?.enabled}
                    value={profile?.settings.scheduledMonitor?.frequency}
                    onValueChange={(v) => setProfile(p => p ? {
                      ...p, 
                      settings: {
                        ...p.settings, 
                        scheduledMonitor: { ...p.settings.scheduledMonitor!, frequency: v as any }
                      }
                    } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button variant="ghost" onClick={() => window.location.reload()}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-accent text-white hover:bg-accent/90 px-8">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
