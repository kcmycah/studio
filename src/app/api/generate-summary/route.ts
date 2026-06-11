
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
    if (errorMessage.includes("403")) {
      errorMessage = "AI Access Forbidden (403). Possible reasons:\n1. Propagation: It can take 5+ mins for the 'Generative Language API' enablement to sync.\n2. API Restrictions: Check 'APIs & Services > Credentials' in Google Cloud. Ensure your key is NOT restricted, or specifically allow the 'Generative Language API'.\n3. Billing: Ensure your Cloud project has a billing account attached (required for some Gemini usage).";
    } else if (errorMessage.includes("404")) {
      errorMessage = "AI Model Not Found (404). Please ensure you are using a supported model identifier like 'googleai/gemini-1.5-flash'.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
