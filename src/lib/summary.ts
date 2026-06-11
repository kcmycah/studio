
import { TestRun, ImpactLevel } from './types';

export interface SummaryOutput {
  text: string;
  recommendation: string;
  criticalFlags: string[];
}

export interface TopIssue {
  id: string;
  impact: ImpactLevel;
  count: number;
  description: string;
}

/**
 * Generates a deterministic executive summary based on DISA score and test findings.
 * Includes score context, pass rates, and top technical risks.
 */
export function generateExecutiveSummary(
  score: number,
  testRuns: TestRun[],
  topIssues: TopIssue[]
): SummaryOutput {
  // Fixed typo from testRurns to testRuns
  const passed = testRuns.filter(run => run.success).length;
  const total = testRuns.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Performance level based on score
  let performance = '';
  if (score < 40) {
    performance = 'CRITICAL issues requiring immediate intervention';
  } else if (score < 60) {
    performance = 'significant accessibility gaps present';
  } else if (score < 80) {
    performance = 'fair accessibility with moderate improvement needed';
  } else {
    performance = 'strong DISA framework compliance';
  }

  // Extract failed personas
  const failedPersonas = testRuns.filter(run => !run.success).map(run => run.persona);
  const criticalFlags = failedPersonas.length > 0 
    ? [`Blocked personas: ${failedPersonas.join(', ')}`]
    : [];

  // Format top issues (max 3)
  const topIssuesText = topIssues.slice(0, 3).map(issue => 
    `${issue.id.replace(/-/g, ' ')} [${issue.impact}]`
  ).join('; ');

  const summaryText = `DISA Audit results: ${score}/100 (${performance}). Successfully accommodated ${passed} of ${total} personas (${passRate}% functional equity). Top technical risks: ${topIssuesText || 'None detected by automated audit.'}.`;

  // Recommendation logic
  let recommendation = '';
  if (score < 60) {
    recommendation = 'IMMEDIATE ACTION: Resolve all critical blockages and re-audit. System is currently at high risk for outcome disparity.';
  } else if (score < 80) {
    recommendation = 'PRIORITY FIX: Address recurring serious issues and initiate manual usability testing with the flagged personas.';
  } else {
    recommendation = 'OPTIMIZATION: Maintain current standards and focus on WCAG AAA compliance for enhanced inclusivity.';
  }

  if (failedPersonas.length > 0) {
    recommendation += ` Critical attention required for: ${failedPersonas.join(', ')}.`;
  }

  return {
    text: summaryText,
    recommendation,
    criticalFlags,
  };
}
