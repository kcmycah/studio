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
  Globe,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { firebaseConfig } from "@/firebase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  useEffect(() => {
    if (user && !userLoading) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorDetails(null);
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
        toast({ title: "Account Created", description: "Welcome to DISA Audit!" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome Back", description: "Successfully signed in." });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setErrorDetails({ code: error.code, message: error.message });
      
      toast({
        variant: "destructive",
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
        description: error.code || "An authentication error occurred.",
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-accent/10 rounded-2xl mb-2">
            <ShieldCheck className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">DISA Audit</h1>
          <p className="text-muted-foreground">The inclusive standard for AI accessibility.</p>
        </div>

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
              <AlertTitle className="font-bold uppercase text-[10px] tracking-widest">Auth Error: {errorDetails.code}</AlertTitle>
              <AlertDescription className="text-xs">{errorDetails.message}</AlertDescription>
            </Alert>
            
            <div className="bg-accent/5 border border-accent/10 rounded-lg p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                <Info className="w-3 h-3" /> Troubleshooting Pro-Tips
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground font-medium">
                {errorDetails.code === 'auth/network-request-failed' && (
                  <li>• <strong>Ad-blockers</strong> often block Firebase. Try disabling uBlock or AdBlock.</li>
                )}
                {errorDetails.code === 'auth/operation-not-allowed' && (
                  <li>• <strong>Password Auth</strong> must be enabled in the Firebase Console under Authentication > Sign-in method.</li>
                )}
                {(errorDetails.code === 'auth/unauthorized-domain' || errorDetails.message.includes('domain')) && (
                  <li>• This domain needs to be added to <strong>Authorized Domains</strong> in the Firebase Console.</li>
                )}
                <li>• Ensure you are using a valid email and a password at least 6 characters long.</li>
              </ul>
            </div>
          </div>
        )}

        <Card className="border-2 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle>{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
            <CardDescription>
              {isSignUp ? "Register your organization for DISA auditing." : "Access your inclusive AI workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    className="pl-10 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isConfigMissing || loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="pl-10 pr-10 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isConfigMissing || loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isSignUp && (
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      className="text-xs text-accent hover:underline font-bold"
                      onClick={handleResetPassword}
                      disabled={resetLoading || isConfigMissing}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              <Button 
                className="w-full h-11 text-base font-bold bg-accent text-white hover:bg-accent/90" 
                disabled={loading || isConfigMissing}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isSignUp ? "Register Organization" : "Sign In to Workspace"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Already registered?" : "New to DISA?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-accent hover:underline font-bold"
                disabled={loading}
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </button>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center justify-center gap-2">
          <Globe className="w-3 h-3" /> Secure Inclusive AI Pipeline
        </p>
      </div>
    </div>
  );
}
