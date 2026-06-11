
import { NextRequest, NextResponse } from "next/server";
import { generatePersonaImpactExplanation } from "@/ai/flows/generate-persona-impact-explanation";

/**
 * Route Handler for generating AI-powered persona impact explanations.
 * This helps non-technical stakeholders understand the real-world consequences of accessibility issues.
 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    
    if (!input.issueDescription || !input.issueImpact || !input.disabilityPersona) {
      return NextResponse.json({ error: "Missing required fields for impact explanation." }, { status: 400 });
    }

    const result = await generatePersonaImpactExplanation(input);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Impact Explanation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate impact explanation." },
      { status: 500 }
    );
  }
}
