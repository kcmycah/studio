import { TestRunResult } from "./types";

/**
 * Computes the Accessibility segment score for the DISA framework.
 * This weights technical violations and persona success.
 */
export function computeAccessibilitySegmentScore(testRuns: TestRunResult[]): number {
  if (!testRuns || testRuns.length === 0) return 0;

  // 1. Technical Violations (weighted)
  const totalIssuesWeight = testRuns.reduce((sum, run) => {
    return sum + run.accessibilityIssues.reduce((pSum, issue) => {
      const weights = { critical: 10, serious: 5, moderate: 2, minor: 1 };
      return pSum + (weights[issue.impact] || 1);
    }, 0);
  }, 0);

  const violationScore = Math.max(0, 100 - (totalIssuesWeight * 2));

  // 2. Persona Success Rate
  const successfulRuns = testRuns.filter(run => run.success).length;
  const successScore = (successfulRuns / testRuns.length) * 100;

  // Combine segments for the Accessibility Domain score
  return Math.round((violationScore * 0.4) + (successScore * 0.6));
}

/**
 * Legacy wrapper to maintain compatibility with existing components
 */
export function computeDISAScore(testRuns: TestRunResult[]): number {
  return computeAccessibilitySegmentScore(testRuns);
}
