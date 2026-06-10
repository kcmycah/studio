
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { computeDISAScore } from "@/lib/scoring";
import { PersonaType, AISystem, TestRun, AccessibilityIssue } from "@/lib/types";

export const maxDuration = 60; // 60 seconds max

/**
 * API route to simulate a DISA accessibility audit.
 * Note: Playwright was removed to ensure the prototype runs reliably without heavy dependencies.
 */
export async function POST(req: NextRequest) {
  try {
    const { systemId, personas } = await req.json();
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Fetch system info
    const systemRef = doc(db, "ai_systems", systemId);
    const systemSnap = await getDoc(systemRef);
    if (!systemSnap.exists()) return NextResponse.json({ error: "System not found" }, { status: 404 });
    const system = systemSnap.data() as AISystem;

    // Create assessment record
    const assessmentRef = await addDoc(collection(db, "assessments"), {
      systemId,
      userId: system.userId,
      createdAt: serverTimestamp(),
      overallScore: 0
    });

    const testRunResults: TestRun[] = [];

    // Simulate scanning for each persona
    // In a production environment, this would use axe-core or playwright-axe
    for (const persona of personas as PersonaType[]) {
      // Add a small artificial delay to simulate a real scan
      await new Promise(resolve => setTimeout(resolve, 800));

      const success = Math.random() > 0.3; // 70% chance of success for mock
      let accessibilityIssues: AccessibilityIssue[] = [];

      if (!success) {
        accessibilityIssues = [
          { id: "aria-labels", impact: "critical", description: "Missing ARIA labels on key interaction buttons." },
          { id: "focus-order", impact: "serious", description: "Keyboard focus trap detected in chat window." }
        ];
      } else if (Math.random() > 0.6) {
        // Even successful runs can have minor warnings
        accessibilityIssues = [
          { id: "color-contrast", impact: "minor", description: "Text contrast is slightly below WCAG AA levels." }
        ];
      }

      const runDoc = await addDoc(collection(db, "testRuns"), {
        assessmentId: assessmentRef.id,
        persona,
        success,
        accessibilityIssues,
        createdAt: serverTimestamp()
      });

      testRunResults.push({
        id: runDoc.id,
        assessmentId: assessmentRef.id,
        persona,
        success,
        accessibilityIssues,
        createdAt: serverTimestamp() as any
      });
    }

    // Compute final DISA score based on the results
    const finalScore = computeDISAScore(testRunResults);
    
    // Update the assessment with the final score
    await updateDoc(assessmentRef, { overallScore: finalScore });

    return NextResponse.json({ assessmentId: assessmentRef.id, score: finalScore });
  } catch (error: any) {
    console.error("Audit API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
