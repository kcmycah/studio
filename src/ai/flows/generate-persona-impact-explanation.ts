
'use server';
/**
 * @fileOverview A Genkit flow for generating human-readable explanations of accessibility issues tailored to specific disability personas.
 *
 * - generatePersonaImpactExplanation - A function that generates an explanation of an accessibility issue's impact.
 * - PersonaImpactExplanationInput - The input type for the generatePersonaImpactExplanation function.
 * - PersonaImpactExplanationOutput - The return type for the generatePersonaImpactExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const PersonaImpactExplanationInputSchema = z.object({
  issueDescription: z.string().describe('A detailed description of the accessibility issue found.'),
  issueImpact: z.string().describe('The severity of the accessibility issue (e.g., critical, serious, moderate, minor).'),
  disabilityPersona: z.string().describe('The specific disability persona for whom the explanation should be tailored (e.g., Blind, Low Vision, Deaf, Dyslexic, Motor Impaired, Cognitive Disability, Speech Impaired).')
});
export type PersonaImpactExplanationInput = z.infer<typeof PersonaImpactExplanationInputSchema>;

const PersonaImpactExplanationOutputSchema = z.object({
  explanation: z.string().describe('A human-readable explanation of the real-world impact of the accessibility issue on a user with the specified disability persona.')
});
export type PersonaImpactExplanationOutput = z.infer<typeof PersonaImpactExplanationOutputSchema>;

export async function generatePersonaImpactExplanation(input: PersonaImpactExplanationInput): Promise<PersonaImpactExplanationOutput> {
  return generatePersonaImpactExplanationFlow(input);
}

const personaImpactExplanationPrompt = ai.definePrompt({
  name: 'personaImpactExplanationPrompt',
  input: {schema: PersonaImpactExplanationInputSchema},
  output: {schema: PersonaImpactExplanationOutputSchema},
  model: googleAI.model('gemini-1.5-flash'),
  prompt: `You are an expert accessibility consultant. Your task is to explain the real-world impact of an accessibility issue on a user with a specific disability persona.
Provide a clear, human-readable explanation focusing on how the issue affects their experience and daily tasks.

Accessibility Issue Description: "{{{issueDescription}}}"
Impact Level: "{{{issueImpact}}}"
Disability Persona: "{{{disabilityPersona}}}"

Explain the real-world impact of this issue on a user who is "{{{disabilityPersona}}}".`
});

const generatePersonaImpactExplanationFlow = ai.defineFlow(
  {
    name: 'generatePersonaImpactExplanationFlow',
    inputSchema: PersonaImpactExplanationInputSchema,
    outputSchema: PersonaImpactExplanationOutputSchema
  },
  async (input) => {
    try {
      const {output} = await personaImpactExplanationPrompt(input);
      if (!output) {
        throw new Error('Failed to generate persona impact explanation.');
      }
      return output;
    } catch (error: any) {
      console.error("Genkit Persona Impact Flow Error:", error);
      throw error;
    }
  }
);
