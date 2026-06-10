import { NextRequest, NextResponse } from "next/server";
import { PersonaType, AccessibilityIssue, TestRunResult } from "@/lib/types";

export const maxDuration = 60;

/**
 * API route to simulate a DISA accessibility audit findings with axe-core style metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const { personas } = await req.json();

    if (!personas || !Array.isArray(personas)) {
      return NextResponse.json({ error: "Invalid personas provided" }, { status: 400 });
    }

    const results: TestRunResult[] = (personas as PersonaType[]).map((persona) => {
      const success = Math.random() > 0.2; // 80% page load success
      let accessibilityIssues: AccessibilityIssue[] = [];

      if (!success) {
        accessibilityIssues = [
          { 
            id: "fatal-error", 
            impact: "critical", 
            description: "The automated auditor failed to load the interface for this persona.",
            nodes: []
          }
        ];
      } else {
        // Deterministic simulation based on persona string
        const isVisual = ["Blind", "Low vision"].includes(persona);
        const isCognitive = ["Dyslexic", "Cognitive disability"].includes(persona);

        if (isVisual) {
          accessibilityIssues.push({
            id: "image-alt",
            impact: "critical",
            description: "Images must have alternate text",
            nodes: ["<img src='logo.png'>", "<img src='hero_banner.jpg'>"]
          });
        }

        if (isCognitive) {
          accessibilityIssues.push({
            id: "reading-level",
            impact: "moderate",
            description: "Content exceeds recommended reading complexity",
            nodes: ["<p class='intro-text'>...highly sophisticated algorithms...</p>"]
          });
        }

        // Common issues
        accessibilityIssues.push({
          id: "color-contrast",
          impact: "serious",
          description: "Background and foreground colors do not have enough contrast",
          nodes: ["<div class='chat-message'>Hello</div>"]
        });
      }

      return {
        persona,
        success,
        accessibilityIssues
      };
    });

    // Score calculation (Simplified for API response)
    const passedPersonas = results.filter(r => r.success).length;
    const score = Math.round((passedPersonas / results.length) * 100);

    return NextResponse.json({ results, score });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
