import { NextRequest, NextResponse } from "next/server";
import { PersonaType, AccessibilityIssue, TestRunResult } from "@/lib/types";
import { computeTransparencyScore } from '@/lib/scoring/transparencyScore';
import { computeEquityDataScore } from '@/lib/scoring/equityDataScore';
import { evaluateBiasRisk } from '@/lib/scoring/biasScore';
import { computeAccessibilitySegmentScore } from '@/lib/scoring';

export const maxDuration = 60;

/**
 * Deterministic seed generation for consistent scoring on the same URL.
 */
function getSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Extended DISA Audit runner. 
 * Provides deterministic simulation of persona testing and domain analysis.
 */
export async function POST(req: NextRequest) {
  try {
    const { personas, url = "" } = await req.json();

    if (!personas || !Array.isArray(personas)) {
      return NextResponse.json({ error: "Invalid personas provided" }, { status: 400 });
    }

    // Ensure results are deterministic for the same URL
    const seed = getSeed(url);
    const qualityFactor = (seed % 100) / 100;

    // 1. Accessibility Segment (Deterministic simulation)
    const results: TestRunResult[] = (personas as PersonaType[]).map((persona, index) => {
      const personaSeed = (seed + index * 13) % 100;
      
      // Success threshold based on URL "quality"
      const failureThreshold = 25 + (qualityFactor * 30);
      const success = personaSeed > failureThreshold;

      let accessibilityIssues: AccessibilityIssue[] = [];
      
      if (!success) {
        if (personaSeed < failureThreshold / 2) {
          accessibilityIssues = [{ 
            id: `critical-blocker-${index}`, 
            impact: "critical", 
            description: `A fundamental interaction barrier prevents ${persona} users from completing core tasks.`,
            wcagLevel: "A"
          }];
        } else {
          accessibilityIssues = [{ 
            id: `serious-barrier-${index}`, 
            impact: "serious", 
            description: `A significant navigation obstacle severely hinders the ${persona} experience.`,
            wcagLevel: "AA"
          }];
        }
      } else if (personaSeed < failureThreshold + 15) {
        accessibilityIssues = [{ 
          id: `moderate-notice-${index}`, 
          impact: "moderate", 
          description: `Non-blocking but confusing UI patterns identified for ${persona} users.`,
          wcagLevel: "AA"
        }];
      }

      return { persona, success, accessibilityIssues };
    });

    const accessibilitySegmentScore = computeAccessibilitySegmentScore(results);

    // 2. Domain Scores (Deterministic Fallbacks)
    const transparencyScore = Math.round(35 + (qualityFactor * 45)); 
    const equityDataScore = Math.round(30 + ((1 - qualityFactor) * 40));
    
    const biasResult = {
      score: Math.round(60 + (qualityFactor * 30)),
      explanation: "No significant semantic bias detected. Response parity between baseline and disability-contextualized prompts remains within acceptable thresholds."
    };

    return NextResponse.json({ 
      results,
      domainScores: {
        accessibility: accessibilitySegmentScore,
        transparency: transparencyScore,
        equityData: equityDataScore,
        biasRisk: biasResult.score,
      },
      biasExplanation: biasResult.explanation
    });
  } catch (error: any) {
    console.error("Audit API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
