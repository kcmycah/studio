
'use client';

import { useState, useEffect } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
        // Create initial user profile
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
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address.",
      });
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset Link Sent",
        description: `Check your inbox at ${email}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message,
      });
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 bg-card shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold">DISA Audit</CardTitle>
            <CardDescription>
              {isSignUp ? "Create your workspace" : "Sign in to your account"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorHint && (
            <Alert className="bg-primary/5 border-primary/20 text-primary">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {errorHint}
              </AlertDescription>
            </Alert>
          )}

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
                    className="text-xs text-muted-foreground hover:text-primary underline"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
            <Button className="w-full h-12 text-lg font-medium bg-accent text-white" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-center text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-bold"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
