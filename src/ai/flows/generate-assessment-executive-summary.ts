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

export async function generateAssessmentExecutiveSummary(
  input: AssessmentExecutiveSummaryInput
): Promise<AssessmentExecutiveSummaryOutput> {
  return assessmentExecutiveSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'executiveSummaryPrompt',
  input: { schema: AssessmentExecutiveSummaryInputSchema },
  output: { schema: AssessmentExecutiveSummaryOutputSchema },
  prompt: `Generate a concise, non-technical executive summary for an AI system accessibility assessment.

The AI system assessed is named: {{{systemName}}}.

Overall DISA Fairness Score: {{{overallScore}}} out of 100.

Key Findings and Areas for Improvement:
{{#each testRunSummaries}}
  For the '{{{persona}}}' persona:
  - Status: {{#if success}}Passed{{else}}Failed{{/if}}.
  {{#if accessibilityIssues.length}}
  - Identified accessibility issues:
    {{#each accessibilityIssues}}
      - Impact: {{{impact}}}, Description: {{{description}}}.
    {{/each}}
  {{else}}
  - No significant accessibility issues were found.
  {{/if}}

{{/each}}

Based on the above findings, provide an executive summary that:
1. Clearly states the overall performance of the AI system based on the DISA score.
2. Highlights specific successes in tested personas.
3. Identifies key areas for improvement, focusing on the most impactful accessibility issues across all personas without using overly technical jargon.
4. Is suitable for stakeholders who need a quick understanding of the audit findings.

Present the summary as a single block of text under the heading "Executive Summary".`,
});

const assessmentExecutiveSummaryFlow = ai.defineFlow(
  {
    name: 'assessmentExecutiveSummaryFlow',
    inputSchema: AssessmentExecutiveSummaryInputSchema,
    outputSchema: AssessmentExecutiveSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
