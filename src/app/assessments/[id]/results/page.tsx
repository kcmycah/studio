
"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/**
 * Legacy Fallback Route.
 * Since assessments have been migrated to subcollections, we direct users to the dashboard
 * to re-enter the reports via the new path-scoped links.
 */
export default function LegacyAssessmentRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background text-foreground">
      <Alert className="max-w-md border-accent/20 bg-accent/5">
        <AlertCircle className="w-5 h-5 text-accent" />
        <AlertTitle className="font-bold">System Update</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>The audit storage architecture has been upgraded to a high-performance subcollection model.</p>
          <p className="text-xs font-medium text-muted-foreground">Redirecting to your centralized dashboard in 3 seconds...</p>
        </AlertDescription>
      </Alert>
      <Loader2 className="w-6 h-6 animate-spin text-accent mt-8 opacity-20" />
    </div>
  );
}
