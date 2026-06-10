
'use client';

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  AuthCredential
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingCred, setPendingCred] = useState<AuthCredential | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (user && !userLoading && !pendingCred) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router, pendingCred]);

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
      router.push("/dashboard");
    } catch (error: any) {
      let message = "An error occurred during authentication.";
      console.error("Auth Error:", error.code, error.message);

      if (error.code === 'auth/invalid-api-key' || error.code === 'auth/invalid-credential') {
        message = "Firebase configuration is incorrect. Please check your keys.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
        message = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
        setErrorHint("It looks like you already have an account. Try signing in instead.");
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is not enabled in the Firebase Console.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "Network error. Please check your connection.";
      }
      
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      toast({ title: "Success", description: `Signed in as ${result.user.email}` });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Google Auth Error:", error.code, error.message);
      if (error.code === "auth/account-exists-with-different-credential") {
        setPendingCred(error.credential);
        toast({
          variant: "destructive",
          title: "Account Exists",
          description: "This email is used with a different sign-in method. Sign in with your password to link them.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: error.message || "An error occurred during Google sign-in.",
        });
      }
    } finally {
      setLoading(false);
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
              {pendingCred ? "Link your account" : isSignUp ? "Create your workspace" : "Sign in to your dashboard"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorHint && (
            <Alert className="bg-primary/5 border-primary/20 text-primary">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                {errorHint}
                <Button variant="link" size="sm" className="p-0 h-auto justify-start text-primary font-bold" onClick={() => setIsSignUp(false)}>
                  Switch to Sign In <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {pendingCred && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Linking Required</AlertTitle>
              <AlertDescription>
                Sign in with your email/password to link your Google account.
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
                  type="password"
                  placeholder="Password"
                  className="pl-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {pendingCred ? "Link Account" : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          {!pendingCred && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 font-medium border-primary/20 hover:bg-primary/5" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {!pendingCred && (
            <div className="text-sm text-center text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-semibold"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </div>
          )}
          {pendingCred && (
            <Button variant="ghost" size="sm" onClick={() => setPendingCred(null)}>
              Cancel Linking
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
