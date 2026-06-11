
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit initialization for the DISA Audit pipeline.
 * Uses Gemini 1.5 Flash for fast, efficient accessibility analysis.
 * Explicitly pulls the API key from environment variables.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    }),
  ],
});
