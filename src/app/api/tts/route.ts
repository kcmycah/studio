
import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/ai/flows/text-to-speech-flow";

/**
 * Route Handler for Text-to-Speech generation.
 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text for TTS" }, { status: 400 });
    }

    const result = await textToSpeech(text);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("TTS API Error:", error);
    return NextResponse.json(
      { error: error.message || "TTS generation failed" },
      { status: 500 }
    );
  }
}
