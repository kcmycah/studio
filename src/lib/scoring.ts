import { TestRunResult } from "./types";

/**
 * Computes the DISA (Disability-Inclusive System Assessment) score.
 * This framework weights technical accessibility alongside functional equity.
 * The calculation is deterministic based on the provided results.
 */
export function computeDISAScore(testRuns: TestRunResult[]): number {
  if (!testRuns || testRuns.length === 0) return 0;

  // 1. Accessibility Segment (30% Weight)
  // Penalizes based on the severity and count of technical issues.
  const totalIssuesWeight = testRuns.reduce((sum, run) => {
    return sum + run.accessibilityIssues.reduce((pSum, issue) => {
      const weights = { critical: 10, serious: 5, moderate: 2, minor: 1 };
      return pSum + weights[issue.impact];
    }, 0);
  }, 0);

  // High weight of issues (e.g. 50+ total) results in a zero for this segment.
  const accessScore = Math.max(0, 100 - (totalIssuesWeight * 1.5));

  // 2. Task Completion Segment (40% Weight)
  // Pure functional performance for personas.
  const successfulRuns = testRuns.filter(run => run.success).length;
  const taskCompletionScore = (successfulRuns / testRuns.length) * 100;

  // 3. Accommodation & Equity Segment (30% Weight)
  // Checks if personas failed specifically due to critical blockages.
  const criticalFailures = testRuns.filter(run => 
    !run.success || run.accessibilityIssues.some(i => i.impact === 'critical')
  ).length;
  
  const accommodationScore = Math.max(0, 100 - (criticalFailures / testRuns.length * 100));

  // Final Weighted Calculation
  const finalScore = 
    (accessScore * 0.30) +
    (taskCompletionScore * 0.40) +
    (accommodationScore * 0.30);

  return Math.round(finalScore);
}
