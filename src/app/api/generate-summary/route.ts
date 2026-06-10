import { NextRequest, NextResponse } from "next/server";
import { generateAssessmentExecutiveSummary } from "@/ai/flows/generate-assessment-executive-summary";

/**
 * Route Handler for AI generation to bypass Server Action timeouts.
 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const result = await generateAssessmentExecutiveSummary(input);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Generation Error in Route Handler:", error);
    return NextResponse.json(
      { error: error.message || "AI Generation Failed" },
      { status: 500 }
    );
  }
}
