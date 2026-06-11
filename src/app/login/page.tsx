
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  CheckCircle2,
  BarChart4,
  Users,
  Scale,
  Globe,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (user && !userLoading) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorHint(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
        toast({ title: "Account Created", description: "Welcome to AuditAccess!" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome Back", description: "Successfully signed in." });
      }
    } catch (error: any) {
      let message = "An error occurred during authentication.";
      if (error.code === 'auth/network-request-failed') {
        message = "Network request failed. This is often caused by an ad-blocker.";
        setErrorHint("Troubleshooting: Disable extensions like uBlock or AdBlock for this site.");
      } else if (error.code === 'auth/invalid-credential') {
        message = "Incorrect email or password.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
        setIsSignUp(false);
      }
      toast({
        variant: "destructive",
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "Email Required", description: "Please enter your email address." });
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    { icon: ShieldCheck, text: "WCAG 2.2 accessibility scanning (axe-core)" },
    { icon: Users, text: "Bias detection across 7 disability personas" },
    { icon: Scale, text: "DISA framework compliant equity scoring" },
    { icon: BarChart4, text: "Version comparison & executive reporting" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column: Messaging & Info */}
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
            <Globe className="w-3 h-3" /> Inclusive AI Standard
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-[0.9]">
              AuditAccess <span className="text-accent">Pipeline.</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium max-w-lg leading-relaxed">
              The Disability Inclusion Scoring Algorithm (DISA) – the industry standard for evaluating AI systems for functional fairness and accessibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <span className="text-sm font-bold text-foreground/80 leading-tight">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-accent/5 border border-accent/10 space-y-2">
            <p className="text-sm font-black uppercase tracking-widest text-accent">Strategic Impact</p>
            <p className="text-muted-foreground text-sm font-medium">
              Trusted by product teams to eliminate "Digital Ableism" and ensure AI endpoints provide equitable service delivery for all users.
            </p>
          </div>
        </div>

        {/* Right Column: Auth Card & Preview */}
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-700">
          <Card className="border-2 border-border shadow-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-8 text-center">
              <div className="mx-auto bg-white p-4 rounded-2xl w-fit shadow-inner mb-4">
                <ShieldCheck className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </CardTitle>
              <CardDescription className="text-base">
                {isSignUp ? "Join the inclusive AI movement." : "Sign in to manage your audit pipeline."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-4">
              {errorHint && (
                <Alert className="bg-destructive/5 border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-bold">{errorHint}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Corporate email"
                      className="pl-10 h-12 bg-muted/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="pl-10 pr-10 h-12 bg-muted/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isSignUp && (
                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        className="text-xs text-muted-foreground hover:text-accent font-bold"
                        onClick={handleResetPassword}
                        disabled={resetLoading}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
                <Button className="w-full h-12 text-lg font-black bg-accent text-white hover:bg-accent/90" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {isSignUp ? "Start Free Audit" : "Sign In to Workspace"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-6 flex justify-center">
              <p className="text-sm text-muted-foreground font-medium">
                {isSignUp ? "Already evaluating?" : "New to DISA?"}{" "}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-accent hover:underline font-black"
                >
                  {isSignUp ? "Sign In" : "Register Organization"}
                </button>
              </p>
            </CardFooter>
          </Card>

          {/* Example Result Preview Card */}
          <div className="bg-card border-2 border-border rounded-3xl p-8 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <BarChart4 className="w-32 h-32 text-accent" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Example Briefing Result</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black text-emerald-500">62</span>
                  <span className="text-xl font-bold opacity-30">/100</span>
                </div>
                <p className="text-sm font-black text-emerald-600/80 mt-1 uppercase tracking-wider">Performance: Fair</p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: "Accessibility", val: 74 },
                  { label: "Bias Risk", val: 51 },
                  { label: "Transparency", val: 48 },
                  { label: "Equity Data", val: 35 },
                ].map((d, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{d.label}</p>
                    <div className="flex items-center gap-2">
                       <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                         <div className="h-full bg-accent" style={{ width: `${d.val}%` }} />
                       </div>
                       <span className="text-[10px] font-bold">{d.val}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
