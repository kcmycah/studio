import { TestRun } from "./types";

export function computeDISAScore(testRuns: TestRun[]): number {
  if (!testRuns || testRuns.length === 0) return 0;

  const totalIssues = testRuns.reduce((sum, run) => sum + run.accessibilityIssues.length, 0);
  const avgIssuesPerPersona = totalIssues / testRuns.length;
  
  // 1. Accessibility Score (based on number of issues)
  // Max expected issues is 20 per persona as per prompt, but we adjust for total persona count
  const accessScore = Math.max(0, Math.min(100, (1 - (avgIssuesPerPersona / 20)) * 100));

  // 2. Task Completion Score
  // 80 if at least one test succeeded, else 0
  const taskCompletionScore = testRuns.some(run => run.success) ? 80 : 0;

  // 3. Accommodation Score
  // 60 if at least one test succeeded, else 0
  const accommodationScore = testRuns.some(run => run.success) ? 60 : 0;

  // 4. Outcome Equity Score (MVP Constant)
  const outcomeEquityScore = 50;

  // 5. Recovery Score (MVP Constant)
  const recoveryScore = 50;

  // 6. Governance Evidence Score (MVP Constant)
  const governanceEvidenceScore = 50;

  // Weights from prompt:
  // accessScore*0.20 + taskCompletionScore*0.25 + accommodationScore*0.20 + 
  // outcomeEquityScore*0.20 + recoveryScore*0.10 + governanceEvidenceScore*0.05

  const finalScore = 
    (accessScore * 0.20) +
    (taskCompletionScore * 0.25) +
    (accommodationScore * 0.20) +
    (outcomeEquityScore * 0.20) +
    (recoveryScore * 0.10) +
    (governanceEvidenceScore * 0.05);

  return Math.round(finalScore);
}