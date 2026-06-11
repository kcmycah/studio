"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, Crown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "For developers and small prototypes.",
    features: [
      "Up to 2 AI systems",
      "Manual DISA audits",
      "Deterministic summaries",
      "Version history (last 2)",
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
    description: "For professional engineering teams.",
    features: [
      "Up to 10 AI systems",
      "Unlimited version history",
      "Any-version comparison",
      "Advanced KPI filtering",
      "Scheduled monitoring",
      "CSV Data Export",
      "Priority email support"
    ],
    buttonText: "Upgrade to Pro",
    variantId: "647281",
    highlight: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For large scale compliance needs.",
    features: [
      "Unlimited AI systems",
      "API access to raw data",
      "Team management",
      "24/7 Account manager",
      "Custom DISA weighting"
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
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() } as UserProfile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, db]);

  const handleUpgrade = async (variantId: string, planName: string) => {
    if (!user || !profile) return;
    
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
    } finally {
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
            <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
            <p className="text-muted-foreground mt-1">Scale your inclusivity with the right DISA framework tools.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => {
              const isCurrent = (profile?.subscriptionStatus || 'free') === plan.id;
              
              return (
                <Card key={plan.id} className={cn(
                  "flex flex-col relative",
                  plan.highlight && "border-accent ring-1 ring-accent/20 shadow-lg"
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
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={plan.disabled || isCurrent || (!!checkoutLoading && checkoutLoading === plan.name)}
                      onClick={() => plan.variantId && handleUpgrade(plan.variantId, plan.name)}
                    >
                      {checkoutLoading === plan.name ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {isCurrent ? "Current Plan" : plan.buttonText}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="mt-16 bg-accent/5 rounded-2xl p-8 border border-accent/10">
            <h2 className="text-xl font-bold mb-4">Merchant of Record Compliance</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
              DISA Audit uses Lemon Squeezy as our Merchant of Record. This allows us to securely process 
              payments globally (including Jamaica), handling all global tax compliance and 
              regulatory requirements so you can focus on building inclusive AI.
            </p>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
