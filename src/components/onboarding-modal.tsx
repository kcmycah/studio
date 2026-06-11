
"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users, BarChart4, ArrowRight } from "lucide-react";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("disa_onboarding_seen");
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("disa_onboarding_seen", "true");
    setOpen(false);
  };

  const steps = [
    {
      title: "Welcome to DISA Audit",
      description: "Measuring functional equity in AI systems. Standard tools check code; we check outcomes for real people.",
      icon: ShieldCheck,
    },
    {
      title: "Persona Simulation",
      description: "We audit your interface through 7 key disability personas, from Blind users with screen readers to users with Cognitive disabilities.",
      icon: Users,
    },
    {
      title: "Deterministic Scoring",
      description: "Scores are computed using the DISA framework, providing a stable benchmark for compliance and engineering progress.",
      icon: BarChart4,
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md glass-morphism border-primary/20 p-0 overflow-hidden">
        <div className="bg-primary/10 p-8 flex justify-center border-b border-primary/5">
          <currentStep.icon className="w-16 h-16 text-primary" />
        </div>
        <div className="p-8 space-y-4">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl font-bold">{currentStep.title}</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground leading-relaxed">
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-between sm:justify-between pt-4">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-2 bg-muted"}`} 
                />
              ))}
            </div>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} size="sm">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleClose} size="sm">
                Get Started
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
