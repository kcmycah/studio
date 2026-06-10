'use client';

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from "firebase/auth";
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
  const { user, loading: userLoading } = useUser();

  // Redirect if already logged in
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
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Account Created", description: "Welcome to AuditAccess!" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome Back", description: "Successfully signed in." });
      }
    } catch (error: any) {
      let message = "An error occurred during authentication.";
      console.error("Auth Error Code:", error.code);

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        message = "Incorrect email or password. Please try again.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
        setErrorHint("You already have an account! Please switch to 'Sign In'.");
        setIsSignUp(false);
      } else if (error.code === 'auth/weak-password') {
        message = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many failed attempts. Please try again later or reset your password.";
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
        description: "Please enter your email address to receive a reset link.",
      });
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset Link Sent",
        description: `A password reset email has been sent to ${email}.`,
      });
    } catch (error: any) {
      console.error("Reset Error:", error.code);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "Could not send reset email. Please ensure the email is correct.",
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <Card className="w-full max-w-md border-primary/20 glass-morphism shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="font-headline text-3xl">AuditAccess</CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp ? "Create your workspace" : "Welcome back to your dashboard"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorHint && (
            <Alert className="bg-primary/5 border-primary/20 text-primary animate-in fade-in slide-in-from-top-1 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
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
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isSignUp && (
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    className="px-0 h-auto text-xs text-muted-foreground hover:text-primary"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Sending..." : "Forgot password?"}
                  </Button>
                </div>
              )}
            </div>
            <Button className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-center text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorHint(null);
              }}
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
