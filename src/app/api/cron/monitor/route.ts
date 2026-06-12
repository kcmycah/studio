import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { AISystem, UserProfile, TestRunResult } from "@/lib/types";
import { computeDISAScore } from "@/lib/scoring";

/**
 * Cron endpoint for scheduled monitoring.
 * This should be called by an external cron service (e.g., Vercel Cron, GitHub Actions).
 */
export async function GET(req: NextRequest) {
  // Simple check for cron secret if provided in environment
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { firestore } = initializeFirebase();
  if (!firestore) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }
  
  try {
    // 1. Find all Pro/Enterprise users with monitoring enabled
    const usersQuery = query(
      collection(firestore, "users"),
      where("subscriptionStatus", "in", ["pro", "enterprise"])
    );
    const usersSnap = await getDocs(usersQuery);
    
    let processedSystems = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data() as UserProfile;
      if (!userData.settings.scheduledMonitor?.enabled) continue;

      // 2. Fetch all systems for this user
      const systemsQuery = query(
        collection(firestore, "ai_systems"),
        where("userId", "==", userDoc.id)
      );
      const systemsSnap = await getDocs(systemsQuery);

      for (const systemDoc of systemsSnap.docs) {
        const system = { id: systemDoc.id, ...systemDoc.data() } as AISystem;

        // 3. Simulate the audit (Calling our own internal logic/API)
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/run-tests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            personas: ["Blind", "Low vision", "Deaf", "Dyslexic", "Cognitive disability", "Motor impaired", "Speech impaired"],
            url: system.url 
          })
        });

        if (!response.ok) continue;

        const { results, domainScores, biasExplanation }: { results: TestRunResult[], domainScores: any, biasExplanation: string } = await response.json();
        
        // Use the domain score if available, or compute fallback
        const score = domainScores?.accessibility || computeDISAScore(results);

        // 4. Save the automated assessment
        const assessmentRef = doc(collection(firestore, "assessments"));
        await setDoc(assessmentRef, {
          systemId: system.id,
          userId: userDoc.id,
          version: `Auto-${new Date().toISOString().split('T')[0]}`,
          createdAt: serverTimestamp(),
          overallScore: score,
          domainScores: domainScores || null,
          details: {
            biasExplanation: biasExplanation || ""
          }
        });

        // 5. Save test runs with userId for security rule compliance
        for (const res of results) {
          const runRef = doc(collection(firestore, "testRuns"));
          await setDoc(runRef, {
            ...res,
            assessmentId: assessmentRef.id,
            userId: userDoc.id, // CRITICAL: Added for security rules
            createdAt: serverTimestamp()
          });
        }

        processedSystems++;
      }
    }

    return NextResponse.json({ success: true, processedSystems });
  } catch (error: any) {
    console.error("Cron Monitoring Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
