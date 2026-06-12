
'use client';

import { useState, useEffect } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Globe,
  Info,
  CheckCircle2,
  Users,
  BarChart4,
  ArrowRight,
  Scale
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { firebaseConfig } from "@/firebase/config";
import { cn } from "@/lib/utils";

const authSchema = z.object({
  email: z.string().email("Please enter a valid business email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ code: string; message: string } | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: userLoading } = useUser();

  const isConfigMissing = !firebaseConfig.apiKey;

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user && !userLoading) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  const onSubmit = async (values: AuthFormValues) => {
    setLoading(true);
    setErrorDetails(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const userRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userRef, {
          email: userCredential.user.email,
          subscriptionStatus: "free",
          createdAt: serverTimestamp(),
          settings: {
            emailResults: true,
            scheduledMonitor: {
              enabled: false,
              frequency: "weekly"
            }
          }
        });
        toast({ title: "Account Created", description: "Welcome to DISA Audit!" });
      } else {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast({ title: "Welcome Back", description: "Successfully signed in." });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setErrorDetails({ code: error.code, message: error.message });
      
      toast({
        variant: "destructive",
        title: isSignUp ? "Registration Failed" : "Access Denied",
        description: error.code || "An authentication error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = form.getValues("email");
    if (!email || !email.includes("@")) {
      toast({ 
        variant: "destructive", 
        title: "Email Required", 
        description: "Please enter your email address in the field above to receive a reset link." 
      });
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Reset Link Sent", description: `Check your inbox at ${email}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: error.message });
    } finally {
      setResetLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Pane: Branding & Comprehensive Framework Explanation */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#5e6ad225,transparent)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-accent p-2 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter">AuditAccess</span>
          </div>

          <div className="space-y-12 max-w-xl">
            <div className="space-y-4">
              <h2 className="text-5xl font-black leading-tight tracking-tighter">
                The Standard for <span className="text-accent">Inclusive AI.</span>
              </h2>
              <p className="text-xl text-white/70 font-medium leading-relaxed">
                Standard automated tools only check code compliance. AuditAccess measures <span className="text-white font-bold">functional equity</span> using the DISA framework.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-10">
              <div className="flex gap-5">
                <div className="shrink-0">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <Scale className="w-6 h-6 text-accent" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">What is DISA?</h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    The Disability-Inclusive System Assessment (DISA) weights accessibility alongside task completion. It ensures that users with disabilities can actually achieve their goals, not just interact with buttons.
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="shrink-0">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">Persona Simulations</h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    We audit your AI endpoints through 7 key disability personas, including Blind, Deaf, Dyslexic, and Cognitive disabilities, to identify real-world functional barriers.
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="shrink-0">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <BarChart4 className="w-6 h-6 text-accent" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">Strategic Briefings</h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Automated executive reporting translates complex accessibility violations into business risk and legal exposure metrics for stakeholders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/10">
          <div className="flex flex-wrap gap-8 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            <span>WCAG 2.2 / SECTION 508</span>
            <span>GDPR COMPLIANT</span>
            <span>AI GOVERNANCE READY</span>
            <span>v2.4 STABLE</span>
          </div>
        </div>
      </div>

      {/* Right Pane: Authentication Form */}
      <div className="flex items-center justify-center p-8 bg-background relative">
        <div className="max-w-md w-full space-y-8">
          <div className="lg:hidden text-center space-y-2 mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-accent/10 rounded-2xl mb-2">
              <ShieldCheck className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">AuditAccess</h1>
            <p className="text-muted-foreground">The inclusive standard for AI accessibility.</p>
          </div>

          <div className="space-y-6">
            <header className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">
                {isSignUp ? "Register Organization" : "Sign In"}
              </h2>
              <p className="text-muted-foreground font-medium">
                {isSignUp 
                  ? "Initialize your organization's DISA auditing pipeline." 
                  : "Access your centralized inclusive performance dashboard."}
              </p>
            </header>

            {isConfigMissing && (
              <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold uppercase text-[10px] tracking-widest">Configuration Missing</AlertTitle>
                <AlertDescription className="text-xs">
                  Firebase API Key not found. Please add your Firebase configuration to the <code className="bg-destructive/10 px-1 rounded">.env</code> file.
                </AlertDescription>
              </Alert>
            )}

            {errorDetails && (
              <div className="space-y-3">
                <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold uppercase text-[10px] tracking-widest">Intelligence & Diagnostics: {errorDetails.code}</AlertTitle>
                  <AlertDescription className="text-xs">{errorDetails.message}</AlertDescription>
                </Alert>
                
                <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                    <Info className="w-3 h-3" /> Troubleshooting Pro-Tips
                  </p>
                  <ul className="text-xs space-y-2 text-muted-foreground font-medium">
                    {errorDetails.code === 'auth/network-request-failed' && (
                      <li>• <strong>Ad-blockers</strong> often block Firebase. Try disabling uBlock or AdBlock for this domain.</li>
                    )}
                    {errorDetails.code === 'auth/operation-not-allowed' && (
                      <li>• <strong>Password Auth</strong> must be enabled in the Firebase Console under Authentication &gt; Sign-in method.</li>
                    )}
                    {(errorDetails.code === 'auth/unauthorized-domain' || errorDetails.message.includes('domain')) && (
                      <li>• This domain needs to be added to <strong>Authorized Domains</strong> in the Firebase Console.</li>
                    )}
                    <li>• Ensure your corporate firewall allows connections to <code className="bg-accent/10 px-1 rounded">firebaseapp.com</code>.</li>
                  </ul>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Work Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="name@company.com"
                            className="pl-10 h-12 border-2 focus-visible:ring-accent"
                            disabled={isConfigMissing || loading}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Security Token</FormLabel>
                        {!isSignUp && (
                          <button 
                            type="button" 
                            className="text-[10px] text-accent hover:underline font-black uppercase tracking-widest"
                            onClick={handleResetPassword}
                            disabled={resetLoading || isConfigMissing}
                          >
                            Reset Password
                          </button>
                        )}
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10 h-12 border-2 focus-visible:ring-accent"
                            disabled={isConfigMissing || loading}
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit"
                  className="w-full h-12 text-base font-black uppercase tracking-widest bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20" 
                  disabled={loading || isConfigMissing}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : null}
                  {isSignUp ? "Register Organization" : "Enter Workspace"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </Form>

            <footer className="pt-6 border-t flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground font-medium">
                {isSignUp ? "Already registered?" : "New to DISA Framework?"}{" "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorDetails(null);
                  }}
                  className="text-accent hover:underline font-black uppercase tracking-widest text-[11px]"
                  disabled={loading}
                >
                  {isSignUp ? "Sign In" : "Create Account"}
                </button>
              </p>

              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.3em] flex items-center gap-2">
                <Globe className="w-3 h-3" /> Inclusive AI Intelligence Pipeline
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
