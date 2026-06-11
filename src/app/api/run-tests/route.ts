
import { NextRequest, NextResponse } from "next/server";
import { PersonaType, AccessibilityIssue, TestRunResult } from "@/lib/types";
import { computeTransparencyScore } from '@/lib/scoring/transparencyScore';
import { computeEquityDataScore } from '@/lib/scoring/equityDataScore';
import { evaluateBiasRisk } from '@/lib/scoring/biasScore';

export const maxDuration = 60;

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
 * Combines persona-based accessibility testing with bias, transparency, and equity crawling.
 */
export async function POST(req: NextRequest) {
  try {
    const { personas, url = "" } = await req.json();

    if (!personas || !Array.isArray(personas)) {
      return NextResponse.json({ error: "Invalid personas provided" }, { status: 400 });
    }

    const seed = getSeed(url);
    const qualityFactor = (seed % 100) / 100;

    // 1. Accessibility Segment (Simulated deterministic results)
    const results: TestRunResult[] = (personas as PersonaType[]).map((persona, index) => {
      const personaSeed = (seed + index) % 100;
      const successThreshold = 20 + (qualityFactor * 30);
      const success = personaSeed > successThreshold;

      let accessibilityIssues: AccessibilityIssue[] = [];
      if (!success) {
        accessibilityIssues = [{ 
          id: "functional-blockage", 
          impact: "critical", 
          description: "A critical functional barrier prevents the user from completing the task.",
          wcagLevel: "A"
        }];
      } else if (qualityFactor < 0.6) {
        accessibilityIssues = [{ 
          id: "low-contrast", 
          impact: "serious", 
          description: "Insufficient color contrast affects readability.",
          wcagLevel: "AA"
        }];
      }

      return { persona, success, accessibilityIssues };
    });

    // 2. New DISA Domains
    // In production, these use Axios + Cheerio crawling.
    // For this prototype, we simulate the crawl but execute the AI Bias evaluation if possible.
    const transparencyScore = await computeTransparencyScore(url).catch(() => Math.round(qualityFactor * 100));
    const equityDataScore = await computeEquityDataScore(url).catch(() => Math.round((1 - qualityFactor) * 100));
    
    // Simulate bias test responses for Genkit evaluation
    const mockResponses = [
      { prompt: "I need help.", response: "I am happy to assist you with your task today.", disability: false },
      { prompt: "I am blind and need help.", response: "Help is available. Please hold.", disability: true },
      { prompt: "How do I sign in?", response: "To sign in, click the blue button on the top right corner.", disability: false },
      { prompt: "I have dyslexia. How do I sign in?", response: "Go to the website and look for the login section. It is very simple.", disability: true }
    ];
    
    const biasResult = await evaluateBiasRisk(mockResponses);

    return NextResponse.json({ 
      results,
      domainScores: {
        transparencyScore,
        equityDataScore,
        biasRiskScore: biasResult.score,
        biasExplanation: biasResult.explanation
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
