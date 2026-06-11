
"use client";

import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Users, 
  Zap, 
  Search, 
  BarChart4, 
  Mail,
  Scale,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HowItWorksPage() {
  const steps = [
    {
      icon: Search,
      title: "Targeted Scanning",
      description: "We analyze your AI's UI components against standard accessibility markers like WCAG 2.2."
    },
    {
      icon: Users,
      title: "Persona Simulation",
      description: "Our engine tests the interface through the lens of specific disability personas (Blind, Deaf, Dyslexic, etc.)."
    },
    {
      icon: Scale,
      title: "DISA Scoring",
      description: "Scores are computed using the Disability-Inclusive System Assessment framework, weighting equity alongside code compliance."
    },
    {
      icon: BarChart4,
      title: "Version Comparison",
      description: "Track your progress over time with side-by-side version audits to ensure no regressions occur during updates."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-20 max-w-5xl">
        <header className="text-center mb-20">
          <h1 className="font-headline text-5xl font-bold mb-6 tracking-tight">The DISA Framework</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Standard automated tools only check for code errors. DISA measures 
            <span className="text-primary font-bold"> functional equity</span>—ensuring users with 
            disabilities can actually complete the tasks your AI was built for.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {steps.map((step, idx) => (
            <Card key={idx} className="glass-morphism border-primary/10 p-8 hover:border-primary/30 transition-all">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-headline text-2xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </div>

        <section className="bg-primary/5 rounded-3xl p-10 border border-primary/20 mb-20">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1 space-y-4">
              <h2 className="font-headline text-3xl font-bold">Why Deterministic Scoring?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Consistency is key to compliance. DISA uses URL-seeded simulations to ensure that the same 
                AI system always returns the same baseline score until you make changes. This allows for 
                reliable benchmarking across your entire engineering team.
              </p>
              <div className="pt-4">
                 <Button asChild size="lg">
                   <Link href="/dashboard">Get Started Now <ArrowRight className="ml-2 w-4 h-4" /></Link>
                 </Button>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
               <div className="bg-background/50 p-6 rounded-2xl border border-border text-center">
                 <p className="text-3xl font-bold text-primary">30%</p>
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Accessibility</p>
               </div>
               <div className="bg-background/50 p-6 rounded-2xl border border-border text-center">
                 <p className="text-3xl font-bold text-secondary">40%</p>
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Task Completion</p>
               </div>
               <div className="bg-background/50 p-6 rounded-2xl border border-border text-center col-span-2">
                 <p className="text-3xl font-bold text-emerald-400">30%</p>
                 <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Equity & Accommodation</p>
               </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-muted-foreground text-sm max-w-2xl mx-auto">
          <p className="mb-4">
            DISA Audit is built to help companies meet WCAG 2.2 and Section 508 compliance. 
            We are a Merchant of Record compliant platform supporting inclusive design worldwide.
          </p>
          <div className="flex justify-center gap-6">
            <Link href="/privacy" className="hover:text-primary underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary underline">Terms of Service</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
