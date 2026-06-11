
'use server';
/**
 * @fileOverview A Genkit flow for generating a concise, non-technical executive summary of an AI system assessment.
 *
 * - generateAssessmentExecutiveSummary - A function that handles the generation of the executive summary.
 * - AssessmentExecutiveSummaryInput - The input type for the generateAssessmentExecutiveSummary function.
 * - AssessmentExecutiveSummaryOutput - The return type for the generateAssessmentExecutiveSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AssessmentExecutiveSummaryInputSchema = z.object({
  overallScore: z
    .number()
    .describe(
      'The overall DISA fairness score (0-100) for the AI system assessment.'
    ),
  systemName: z.string().describe('The name of the AI system being assessed.'),
  testRunSummaries: z
    .array(
      z.object({
        persona: z.string().describe('The disability persona tested.'),
        success: z
          .boolean()
          .describe(
            'Whether the accessibility test for this persona was successful.'
          ),
        accessibilityIssues: z
          .array(
            z.object({
              id: z
                .string()
                .describe('Unique identifier for the accessibility issue.'),
              description: z
                .string()
                .describe('A brief description of the accessibility issue.'),
              impact: z
                .string()
                .describe(
                  'The impact level of the issue (e.g., critical, serious, moderate, minor).')
            })
          )
          .describe('A list of key accessibility issues found for this persona.'),
      })
    )
    .describe('Summaries of each test run, including persona, success status, and accessibility issues.'),
});
export type AssessmentExecutiveSummaryInput = z.infer<
  typeof AssessmentExecutiveSummaryInputSchema
>;

const AssessmentExecutiveSummaryOutputSchema = z.object({
  executiveSummary: z
    .string()
    .describe(
      'A concise, non-technical executive summary of the assessment findings.'
    ),
});
export type AssessmentExecutiveSummaryOutput = z.infer<
  typeof AssessmentExecutiveSummaryOutputSchema
>;

/**
 * Server action wrapper for the flow.
 */
export async function generateAssessmentExecutiveSummary(
  input: AssessmentExecutiveSummaryInput
): Promise<AssessmentExecutiveSummaryOutput> {
  return assessmentExecutiveSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'executiveSummaryPrompt',
  input: { schema: AssessmentExecutiveSummaryInputSchema },
  output: { schema: AssessmentExecutiveSummaryOutputSchema },
  // Use the standard model identifier for Genkit v1.x
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert accessibility consultant specializing in the DISA (Disability-Inclusive System Assessment) framework. 
Generate a concise, non-technical executive summary for an AI system accessibility assessment.

AI System: {{{systemName}}}
Overall DISA Fairness Score: {{{overallScore}}} / 100

Detailed Findings:
{{#each testRunSummaries}}
- Persona: {{{persona}}}
  Status: {{#if success}}Passed{{else}}Failed{{/if}}
  {{#if accessibilityIssues.length}}
  Issues:
    {{#each accessibilityIssues}}
    * [{{{impact}}}] {{{description}}}
    {{/each}}
  {{else}}
  * No significant issues found for this persona.
  {{/if}}
{{/each}}

Task: Provide a professional executive summary that stakeholders can understand.
1. Evaluate the overall performance based on the score.
2. Highlight specific successes in persona testing.
3. Identify top critical/serious risks across all personas.
4. Recommend high-level next steps for remediation.

Return the result as a single block of clear, readable text.`,
});

const assessmentExecutiveSummaryFlow = ai.defineFlow(
  {
    name: 'assessmentExecutiveSummaryFlow',
    inputSchema: AssessmentExecutiveSummaryInputSchema,
    outputSchema: AssessmentExecutiveSummaryOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) throw new Error("No output generated from AI model.");
      return output;
    } catch (error: any) {
      console.error("Genkit Executive Summary Flow Error:", error);
      throw error;
    }
  }
);
