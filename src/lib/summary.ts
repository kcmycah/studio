import { TestRun, ImpactLevel } from './types';

export interface SummaryOutput {
  text: string;
  recommendation: string;
  criticalFlags: string[];
}

/**
 * Generates a deterministic executive summary based on DISA score, domain results, and test findings.
 * Provides immediate, data-driven insights without external AI generation.
 */
export function generateExecutiveSummary(
  score: number,
  testRuns: TestRun[],
  domainScores?: {
    accessibility: number;
    biasRisk: number;
    transparency: number;
    equityData: number;
  }
): SummaryOutput {
  const passed = testRuns.filter(run => run.success).length;
  const total = testRuns.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Performance level based on score
  let performance = '';
  if (score < 40) {
    performance = 'CRITICAL level requiring immediate intervention';
  } else if (score < 60) {
    performance = 'SIGNIFICANT accessibility gaps and equity risks';
  } else if (score < 80) {
    performance = 'MODERATE compliance with room for technical improvement';
  } else {
    performance = 'STRONG DISA framework compliance';
  }

  // Domain context
  let domainInsight = '';
  if (domainScores) {
    const lowest = Object.entries(domainScores).reduce((a, b) => a[1] < b[1] ? a : b);
    domainInsight = ` The most significant risk factor is identified in the ${lowest[0].toUpperCase()} domain (${lowest[1]}%).`;
  }

  // Extract failed personas
  const failedPersonas = testRuns.filter(run => !run.success).map(run => run.persona);
  const criticalFlags = failedPersonas.length > 0 
    ? [`Blocked personas: ${failedPersonas.join(', ')}`]
    : [];

  const summaryText = `This assessment for DISA Framework compliance resulted in an overall score of ${score}/100, which indicates ${performance}. The system successfully accommodated ${passed} of ${total} personas (${passRate}% functional equity).${domainInsight} Functional blockages were detected for ${failedPersonas.length > 0 ? failedPersonas.join(', ') : 'no specific'} personas.`;

  // Recommendation logic
  let recommendation = '';
  if (score < 60) {
    recommendation = 'IMMEDIATE ACTION: Resolve all critical functional blockages and address the highlighted domain deficits before the next release cycle.';
  } else if (score < 80) {
    recommendation = 'PRIORITY FIX: Address the recurring serious issues and initiate manual usability testing with the flagged personas to bridge the remaining equity gaps.';
  } else {
    recommendation = 'MAINTENANCE: Maintain current high standards and focus on achieving WCAG AAA compliance to ensure long-term inclusive performance.';
  }

  return {
    text: summaryText,
    recommendation,
    criticalFlags,
  };
}
