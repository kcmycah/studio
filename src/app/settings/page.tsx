
"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
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
        description: "Your preferences have been updated successfully."
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
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-10">
          <h1 className="font-headline text-4xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-lg">Manage your profile, notifications, and monitoring schedules.</p>
        </header>

        <div className="space-y-8">
          {/* Account Profile */}
          <Card className="glass-morphism border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Account Profile
              </CardTitle>
              <CardDescription>Your basic account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input value={user?.email || ""} disabled className="pl-10" />
                </div>
                <p className="text-[10px] text-muted-foreground">Email change is managed through authentication providers.</p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="glass-morphism border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Control how you receive audit results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Audit Reports</Label>
                  <p className="text-xs text-muted-foreground">Automatically receive report summaries after every audit run.</p>
                </div>
                <Switch 
                  checked={profile?.settings.emailResults} 
                  onCheckedChange={(checked) => setProfile(p => p ? {...p, settings: {...p.settings, emailResults: checked}} : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Monitoring (Pro) */}
          <Card className={cn("glass-morphism border-primary/10", !isPro && "opacity-60")}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Scheduled Monitoring
                </div>
                {!isPro && <Badge variant="secondary" className="bg-primary text-primary-foreground">PRO</Badge>}
              </CardTitle>
              <CardDescription>Automate DISA audits for consistent compliance tracking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isPro && (
                <div className="bg-primary/10 p-4 rounded-xl flex items-center gap-3 border border-primary/20 mb-4">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium">Upgrade to Pro to enable automated daily or weekly audits.</p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Monitoring</Label>
                  <p className="text-xs text-muted-foreground">Automatically run scans on your registered AI systems.</p>
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
            <Button variant="ghost" disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="px-8">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
