
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
    
    let errorMessage = error.message || "AI Generation Failed";
    
    // Provide a more descriptive error message for 403 Forbidden
    if (errorMessage.includes("403") || errorMessage.toLowerCase().includes("permission")) {
      errorMessage = "AI Access Forbidden (403). \n\nTroubleshooting:\n1. Key Restrictions: Check 'APIs & Services > Credentials' in Google Cloud. If your key is restricted, allow 'Generative Language API'.\n2. API Enablement: Ensure 'Generative Language API' is enabled in your Google Cloud Project.\n3. Environment: Verify GEMINI_API_KEY is correctly set.";
    } else if (errorMessage.includes("404")) {
      errorMessage = "AI Model Not Found (404). Please ensure you are using a supported model identifier.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
