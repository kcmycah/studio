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
    
    // Provide a more descriptive error message for 403 Forbidden
    let errorMessage = error.message || "AI Generation Failed";
    if (errorMessage.includes("403")) {
      errorMessage = "AI Access Forbidden (403). Please ensure the Generative Language API is enabled in your Google Cloud Console for this API key.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
