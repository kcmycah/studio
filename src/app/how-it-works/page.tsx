
"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Users, 
  Zap, 
  Search, 
  BarChart4, 
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
      description: "Track progress over time with side-by-side version audits to ensure no regressions occur during updates."
    }
  ];

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-[260px] p-8 pt-24 md:pt-8 max-w-5xl mx-auto w-full">
          <header className="text-center mb-16 mt-8">
            <h1 className="text-4xl font-bold tracking-tight mb-6">The DISA Framework</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Standard automated tools only check for code errors. DISA measures 
              <span className="text-accent font-bold"> functional equity</span>—ensuring users with 
              disabilities can actually complete the tasks your AI was built for.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {steps.map((step, idx) => (
              <Card key={idx} className="glass-morphism p-8 hover:border-accent/50 transition-all group">
                <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </Card>
            ))}
          </div>

          <section className="bg-accent/5 rounded-2xl p-10 border border-accent/20 mb-16">
            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-bold">Why Deterministic Scoring?</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Consistency is key to compliance. DISA uses URL-seeded simulations to ensure that the same 
                  AI system always returns the same baseline score until you make changes.
                </p>
                <div className="pt-4">
                   <Button asChild size="lg" className="bg-accent text-white hover:bg-accent/90">
                     <Link href="/dashboard">Get Started <ArrowRight className="ml-2 w-4 h-4" /></Link>
                   </Button>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                 <div className="bg-background p-6 rounded-xl border border-border text-center">
                   <p className="text-2xl font-bold text-accent">30%</p>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Accessibility</p>
                 </div>
                 <div className="bg-background p-6 rounded-xl border border-border text-center">
                   <p className="text-2xl font-bold text-emerald-500">40%</p>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Task Completion</p>
                 </div>
                 <div className="bg-background p-6 rounded-xl border border-border text-center col-span-2">
                   <p className="text-2xl font-bold text-amber-500">30%</p>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Equity</p>
                 </div>
              </div>
            </div>
          </section>

          <footer className="text-center text-muted-foreground text-xs py-10 border-t border-border/50">
            <p className="mb-4">
              DISA Audit helps companies meet WCAG 2.2 and Section 508 compliance. 
              Built with ❤️ for an inclusive future.
            </p>
            <div className="flex justify-center gap-6">
              <Link href="#" className="hover:text-accent underline">Privacy Policy</Link>
              <Link href="#" className="hover:text-accent underline">Terms of Service</Link>
            </div>
          </footer>
        </main>
      </div>
    </AuthGuard>
  );
}
