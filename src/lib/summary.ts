import { TestRun } from './types';

/**
 * Output interface for the deterministic summary engine.
 */
export interface SummaryOutput {
  text: string;
  recommendation: string;
  criticalFlags: string[];
}

/**
 * Interface for the aggregated issue data.
 */
export interface TopIssue {
  id: string;
  impact: string;
  count: number;
  description: string;
}

/**
 * Generates a deterministic executive summary based on DISA score and test findings.
 * This replaces the previous GenAI-powered summary with a faster, more predictable logic.
 */
export function generateExecutiveSummary(
  score: number,
  testRuns: TestRun[],
  topIssues: TopIssue[]
): SummaryOutput {
  const passed = testRuns.filter(run => run.success).length;
  const total = testRuns.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Performance level based on score
  let performance = '';
  if (score < 40) {
    performance = 'critical issues requiring immediate action';
  } else if (score < 60) {
    performance = 'moderate issues that need addressing';
  } else if (score < 80) {
    performance = 'fair accessibility with room for improvement';
  } else {
    performance = 'strong accessibility compliance';
  }

  // Extract failed personas
  const failedPersonas = testRuns.filter(run => !run.success).map(run => run.persona);
  const criticalFlags = failedPersonas.length > 0 
    ? [`Failed personas: ${failedPersonas.join(', ')}`]
    : [];

  // Format top issues (max 3)
  const topIssuesText = topIssues.slice(0, 3).map(issue => 
    `${issue.id.replace(/-/g, ' ')} (${issue.impact}) – ${issue.count} occurrence(s)`
  ).join('; ');

  const summaryText = `DISA score: ${score} (${performance}). ${passed} of ${total} personas passed (${passRate}%). Top accessibility issues: ${topIssuesText || 'None detected by automated scan.'}.`;

  // Recommendation based on score and issues
  let recommendation = '';
  if (score < 60) {
    recommendation = 'Immediately fix all critical and serious issues, then re-run tests.';
  } else if (score < 80) {
    recommendation = 'Address the top recurring issues and conduct manual testing with disabled users.';
  } else {
    recommendation = 'Maintain current standards, but continue manual audits to catch the remaining 60-70% of issues.';
  }

  if (failedPersonas.length > 0) {
    recommendation += ` Pay special attention to personas: ${failedPersonas.join(', ')}.`;
  }

  return {
    text: summaryText,
    recommendation,
    criticalFlags,
  };
}
