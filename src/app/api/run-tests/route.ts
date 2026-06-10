import { NextRequest, NextResponse } from "next/server";
import { PersonaType, AccessibilityIssue, TestRunResult } from "@/lib/types";

export const maxDuration = 60; // 60 seconds max

/**
 * API route to simulate a DISA accessibility audit findings.
 * It returns raw simulation data which the client will then persist to Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const { personas } = await req.json();

    // Basic validation
    if (!personas || !Array.isArray(personas)) {
      return NextResponse.json({ error: "Invalid personas provided" }, { status: 400 });
    }

    const testRunResults: TestRunResult[] = (personas as PersonaType[]).map((persona) => {
      // Simulation logic: generates deterministic-ish but varying results for the MVP
      const success = Math.random() > 0.4; // 60% chance of passing
      let accessibilityIssues: AccessibilityIssue[] = [];

      if (!success) {
        accessibilityIssues = [
          { 
            id: "aria-labels", 
            impact: "critical", 
            description: `Significant accessibility barrier for ${persona}: Interactive elements lack descriptive labels.` 
          },
          { 
            id: "keyboard-navigation", 
            impact: "serious", 
            description: "Some control elements are unreachable via keyboard tab order." 
          }
        ];
      } else if (Math.random() > 0.7) {
        // Even successful runs can have minor warnings
        accessibilityIssues = [
          { 
            id: "color-contrast", 
            impact: "minor", 
            description: "Background contrast ratios are slightly below recommended levels." 
          }
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
