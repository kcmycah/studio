
import { NextRequest, NextResponse } from "next/server";
import { PersonaType, AccessibilityIssue } from "@/lib/types";

export const maxDuration = 60; // 60 seconds max

/**
 * API route to simulate a DISA accessibility audit findings.
 * This route no longer interacts with Firestore to comply with Client-Side Mutation rules.
 * It returns raw simulation data which the client will then persist.
 */
export async function POST(req: NextRequest) {
  try {
    const { personas } = await req.json();

    // Basic validation
    if (!personas || !Array.isArray(personas)) {
      return NextResponse.json({ error: "Invalid personas provided" }, { status: 400 });
    }

    const testRunResults = (personas as PersonaType[]).map((persona) => {
      // Simulation logic
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

      return {
        persona,
        success,
        accessibilityIssues
      };
    });

    return NextResponse.json({ results: testRunResults });
  } catch (error: any) {
    console.error("Audit Simulation API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
