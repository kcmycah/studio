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
    description: "For individual developers and hobbyists.",
    features: [
      "Up to 2 AI systems",
      "Manual DISA audits",
      "Standard summaries",
      "Last 2 audit records",
      "Email results"
    ],
    buttonText: "Current Plan",
    disabled: true
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For professional accessibility teams.",
    features: [
      "Up to 10 AI systems",
      "Unlimited version history",
      "Version comparison tool",
      "KPI & Persona filtering",
      "Scheduled monitoring",
      "CSV Data Export",
      "Priority support"
    ],
    buttonText: "Upgrade to Pro",
    variantId: "647281",
    highlight: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For organizations with scale needs.",
    features: [
      "Unlimited AI systems",
      "Full API access",
      "Team workspace",
      "Account Manager",
      "SLA Guarantees"
    ],
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
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() } as UserProfile);
        }
      } catch (err) {
        console.error("Error fetching billing profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, db]);

  const handleUpgrade = async (variantId: string, planName: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be signed in to upgrade." });
      return;
    }
    
    setCheckoutLoading(planName);
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          variantId
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to initiate checkout");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Checkout Error",
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
        <main className="flex-1 md:ml-[260px] p-8 max-w-7xl mx-auto w-full">
          <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Billing & Plans</h1>
            <p className="text-muted-foreground mt-2 text-lg">Manage your subscription and unlock Pro features.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {PLANS.map((plan) => {
              const currentStatus = profile?.subscriptionStatus || 'free';
              const isCurrent = currentStatus === plan.id;
              
              return (
                <Card key={plan.id} className={cn(
                  "flex flex-col relative border-2 transition-all",
                  plan.highlight ? "border-accent shadow-xl scale-[1.02] z-10" : "border-border shadow-sm hover:border-accent/30"
                )}>
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold uppercase px-4 py-1 rounded-full shadow-lg">
                      Recommended
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {plan.id === 'free' && <Zap className="w-6 h-6 text-muted-foreground" />}
                      {plan.id === 'pro' && <Crown className="w-6 h-6 text-accent" />}
                      {plan.id === 'enterprise' && <Shield className="w-6 h-6 text-emerald-500" />}
                      {plan.name}
                    </CardTitle>
                    <div className="flex items-baseline gap-1 mt-6">
                      <span className="text-5xl font-black">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-lg">{plan.period}</span>}
                    </div>
                    <CardDescription className="mt-4 text-base">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow pt-6 border-t border-border/50">
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-medium">
                          <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-8">
                    <Button 
                      className={cn(
                        "w-full h-12 text-lg font-bold transition-all",
                        plan.highlight ? "bg-accent text-white hover:bg-accent/90" : "variant-outline"
                      )} 
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={plan.disabled || isCurrent || (!!checkoutLoading && checkoutLoading === plan.name)}
                      onClick={() => plan.variantId && handleUpgrade(plan.variantId, plan.name)}
                    >
                      {checkoutLoading === plan.name ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      {isCurrent ? "Current Plan" : plan.buttonText}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="bg-accent/5 rounded-3xl p-10 border border-accent/10 flex flex-col md:flex-row items-center gap-8">
            <div className="bg-white dark:bg-accent/20 p-6 rounded-2xl shadow-inner">
               <Shield className="w-12 h-12 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Merchant of Record</h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-4xl">
                DISA Audit processes payments through <strong>Lemon Squeezy</strong>, our global Merchant of Record. 
                This ensures secure processing and full tax compliance for businesses worldwide, including our partners in Jamaica.
              </p>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}