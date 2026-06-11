/**
 * @fileOverview Data-driven Executive Summary generator for DISA assessments.
 */

export interface ExecutiveSummary {
  summaryText: string;
  recommendation: string;
  performanceLevel: string;
  color: string;
}

/**
 * Generates a concise, data-driven executive summary.
 */
export function generateExecutiveSummary(
  score: number,
  passedCount: number,
  totalCount: number,
  topIssues: { id: string; impact: string; count: number }[]
): ExecutiveSummary {
  // Determine performance level and color based on DISA score
  let performanceLevel: string;
  let color: string;
  if (score < 40) {
    performanceLevel = 'Critical';
    color = 'red';
  } else if (score < 60) {
    performanceLevel = 'Moderate';
    color = 'orange';
  } else if (score < 80) {
    performanceLevel = 'Fair';
    color = 'yellow';
  } else {
    performanceLevel = 'Strong';
    color = 'green';
  }

  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  
  // Format top issues string
  const topIssuesText = topIssues.slice(0, 3).map(issue => 
    `${issue.id} (${issue.impact}, ${issue.count}x)`
  ).join('; ');

  const summaryText = `DISA score: ${score} (${performanceLevel}). ` +
    `${passedCount} of ${totalCount} personas passed (${passRate}%). ` +
    `Top issues: ${topIssuesText || 'None detected by automated scan.'}`;

  let recommendation = '';
  if (score < 40) {
    recommendation = 'Immediate action required. Fix all critical and serious accessibility issues.';
  } else if (score < 60) {
    recommendation = 'Address the most severe issues, especially those affecting failed personas.';
  } else if (score < 80) {
    recommendation = 'Continue improving accessibility by fixing recurring issues and conducting manual tests.';
  } else {
    recommendation = 'Maintain current standards and perform regular manual audits.';
  }

  return { summaryText, recommendation, performanceLevel, color };
}
