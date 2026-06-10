import { TestRunResult } from "./types";

/**
 * Computes the DISA (Disability-Inclusive System Assessment) score.
 * This framework weights technical accessibility alongside functional equity.
 */
export function computeDISAScore(testRuns: TestRunResult[]): number {
  if (!testRuns || testRuns.length === 0) return 0;

  const totalIssues = testRuns.reduce((sum, run) => sum + run.accessibilityIssues.length, 0);
  const avgIssuesPerPersona = totalIssues / testRuns.length;
  
  // 1. Accessibility Score (20% Weight)
  // Based on issue density. We assume 20+ issues per persona is a critical failure.
  const accessScore = Math.max(0, Math.min(100, (1 - (avgIssuesPerPersona / 20)) * 100));

  // 2. Task Completion Score (25% Weight)
  // Percentage of personas that successfully completed the core task.
  const successfulRuns = testRuns.filter(run => run.success).length;
  const taskCompletionScore = (successfulRuns / testRuns.length) * 100;

  // 3. Accommodation Score (20% Weight)
  // In a full audit, this checks for specific ARIA/persona-specific UI.
  // MVP: Correlated with success but penalizes heavily for critical issues.
  const hasCriticalIssues = testRuns.some(run => run.accessibilityIssues.some(i => i.impact === 'critical'));
  const accommodationScore = taskCompletionScore * (hasCriticalIssues ? 0.7 : 1);

  // 4. Outcome Equity Score (20% Weight) - MVP Baseline
  // Measures if the AI response quality is equal across all personas.
  const outcomeEquityScore = 75;

  // 5. Recovery Score (10% Weight) - MVP Baseline
  // Measures how easily a user can recover from a hallucination or error.
  const recoveryScore = 60;

  // 6. Governance Evidence Score (5% Weight) - MVP Baseline
  // Checks for organizational commitment and documentation.
  const governanceEvidenceScore = 80;

  // Final Weighted Calculation
  const finalScore = 
    (accessScore * 0.20) +
    (taskCompletionScore * 0.25) +
    (accommodationScore * 0.20) +
    (outcomeEquityScore * 0.20) +
    (recoveryScore * 0.10) +
    (governanceEvidenceScore * 0.05);

  return Math.round(finalScore);
}
