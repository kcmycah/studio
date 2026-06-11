
"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Crown, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "For individual developers.",
    features: ["Up to 2 AI systems", "Manual audits", "Standard reports"],
    buttonText: "Current Plan",
    disabled: true
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For professional teams.",
    features: ["Up to 10 systems", "Full history", "Comparison tools", "Scheduled monitoring"],
    buttonText: "Upgrade to Pro",
    variantId: "647281", // Replace with your actual Lemon Squeezy variant ID
    highlight: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For scaling organizations.",
    features: ["Unlimited systems", "API access", "Priority support"],
    buttonText: "Contact Sales",
    variantId: "647282"
  }
];

export default function BillingPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() } as UserProfile);
      setLoading(false);
    });
  }, [user, db]);

  const handleUpgrade = async (variantId: string, planName: string) => {
    setCheckoutLoading(planName);
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          userEmail: user?.email,
          variantId
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Billing initialization failed.");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Billing Error",
        description: err.message
      });
      setCheckoutLoading(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-6xl mx-auto w-full">
          <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Billing & Plans</h1>
            <p className="text-muted-foreground mt-2 text-lg">Select the plan that fits your accessibility workflow.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => {
              const currentStatus = profile?.subscriptionStatus || 'free';
              const isCurrent = currentStatus === plan.id;
              
              return (
                <Card key={plan.id} className={cn(
                  "flex flex-col relative border-2 transition-all duration-300",
                  plan.highlight ? "border-accent shadow-xl bg-card" : "border-border shadow-sm hover:border-accent/40"
                )}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {plan.id === 'free' && <Zap className="w-5 h-5 text-muted-foreground" />}
                      {plan.id === 'pro' && <Crown className="w-5 h-5 text-accent" />}
                      {plan.id === 'enterprise' && <Shield className="w-5 h-5 text-emerald-500" />}
                      {plan.name}
                    </CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>}
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full font-bold" 
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={plan.disabled || isCurrent || !!checkoutLoading}
                      onClick={() => plan.variantId && handleUpgrade(plan.variantId, plan.name)}
                    >
                      {checkoutLoading === plan.name && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {isCurrent ? "Current Plan" : plan.buttonText}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Alert className="mt-16 bg-accent/5 border-accent/20">
            <AlertCircle className="h-4 w-4 text-accent" />
            <AlertTitle className="font-bold text-accent">Safe Payments</AlertTitle>
            <AlertDescription className="text-sm">
              All transactions are secured by <strong>Lemon Squeezy</strong>, our Merchant of Record. 
              Billing will appear as "Lemon Squeezy" on your statement.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    </AuthGuard>
  );
}
