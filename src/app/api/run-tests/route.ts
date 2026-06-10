import { NextRequest, NextResponse } from "next/server";
import { PersonaType, AccessibilityIssue, TestRunResult } from "@/lib/types";

export const maxDuration = 60;

/**
 * Simple hashing function to generate a deterministic seed from a string.
 */
function getSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * API route to simulate a DISA accessibility audit findings with deterministic logic.
 */
export async function POST(req: NextRequest) {
  try {
    const { personas, url = "" } = await req.json();

    if (!personas || !Array.isArray(personas)) {
      return NextResponse.json({ error: "Invalid personas provided" }, { status: 400 });
    }

    const seed = getSeed(url);
    
    // Quality factor based on the URL (0.0 to 1.0)
    // This ensures some URLs are "better" than others consistently.
    const qualityFactor = (seed % 100) / 100;

    const results: TestRunResult[] = (personas as PersonaType[]).map((persona, index) => {
      // Deterministic success based on URL seed + persona index
      const personaSeed = (seed + index) % 100;
      const successThreshold = 20 + (qualityFactor * 30); // 20-50% chance of failure depending on URL
      const success = personaSeed > successThreshold;

      let accessibilityIssues: AccessibilityIssue[] = [];

      if (!success) {
        accessibilityIssues = [
          { 
            id: "load-failure", 
            impact: "critical", 
            description: "The automated auditor failed to load the interface or interact with core elements for this persona.",
            nodes: []
          }
        ];
      } else {
        // Deterministic simulation based on persona type
        const isVisual = ["Blind", "Low vision"].includes(persona);
        const isCognitive = ["Dyslexic", "Cognitive disability"].includes(persona);
        const isMotor = ["Motor impaired"].includes(persona);

        // More issues if qualityFactor is low
        const issueCountMultiplier = Math.floor((1 - qualityFactor) * 3) + 1;

        if (isVisual) {
          accessibilityIssues.push({
            id: "image-alt",
            impact: "critical",
            description: "Images must have alternate text for screen readers.",
            nodes: Array.from({ length: issueCountMultiplier }, (_, i) => `<img src='/asset-${i}.png'>`)
          });
          
          if (qualityFactor < 0.5) {
            accessibilityIssues.push({
              id: "aria-labels",
              impact: "serious",
              description: "Interactive elements lack descriptive ARIA labels.",
              nodes: ["<button class='send-btn'>...</button>"]
            });
          }
        }

        if (isCognitive) {
          accessibilityIssues.push({
            id: "reading-level",
            impact: "moderate",
            description: "Content exceeds recommended reading complexity for cognitive inclusive design.",
            nodes: ["<p class='ai-response'>The multifaceted paradigm of neural architectures...</p>"]
          });
        }

        if (isMotor && qualityFactor < 0.7) {
          accessibilityIssues.push({
            id: "focus-indicator",
            impact: "serious",
            description: "Keyboard focus indicators are missing or have insufficient contrast.",
            nodes: ["<a href='/help'>Help</a>"]
          });
        }

        // Common issues for everyone on "lower quality" links
        if (qualityFactor < 0.6) {
          accessibilityIssues.push({
            id: "color-contrast",
            impact: "serious",
            description: "Background and foreground colors do not meet WCAG AA contrast ratios.",
            nodes: ["<div class='chat-bubble-text'>...</div>"]
          });
        }
      }

      return {
        persona,
        success,
        accessibilityIssues
      };
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
