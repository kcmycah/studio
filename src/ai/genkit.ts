
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Genkit initialization for the DISA Audit pipeline.
 * Uses Gemini 1.5 Flash for fast, efficient accessibility analysis.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // Correct standard model identifier for the google-genai plugin
  model: 'googleai/gemini-1.5-flash',
});
