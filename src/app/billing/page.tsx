
"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useUser, useFirestore } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, Crown, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      "Priority email support"
    ],
    buttonText: "Upgrade to Pro",
    variantId: "647281", // Example Lemon Squeezy variant ID
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
      "CSV data exports",
      "SSO & Team management",
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
      const q = query(collection(db, "users"), where("email", "==", user.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setProfile({ id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
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
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <header className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary">Plans & Pricing</Badge>
          <h1 className="font-headline text-5xl font-bold mb-4 tracking-tight">Scale Your Inclusivity</h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Choose the right DISA framework tools for your team's compliance journey.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const isCurrent = profile?.subscriptionStatus === plan.id;
            
            return (
              <Card key={plan.id} className={cn(
                "glass-morphism border-primary/10 flex flex-col relative",
                plan.highlight && "border-primary/40 shadow-2xl shadow-primary/10 scale-105 z-10"
              )}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    {plan.id === 'free' && <Zap className="w-5 h-5" />}
                    {plan.id === 'pro' && <Crown className="w-5 h-5 text-primary" />}
                    {plan.id === 'enterprise' && <Shield className="w-5 h-5 text-secondary" />}
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-headline font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full h-12" 
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={plan.disabled || isCurrent || (checkoutLoading === plan.name)}
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

        <div className="mt-20 bg-primary/5 rounded-3xl p-10 border border-primary/10 text-center max-w-3xl mx-auto">
          <h2 className="font-headline text-2xl font-bold mb-4">Merchant of Record Compliance</h2>
          <p className="text-muted-foreground leading-relaxed text-sm">
            DISA Audit uses Lemon Squeezy as our Merchant of Record. This allows us to securely process 
            payments from businesses in Jamaica and worldwide, handling all global tax compliance and 
            regulatory requirements so you can focus on building inclusive AI.
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
