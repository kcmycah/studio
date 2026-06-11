import { TestRun, ImpactLevel } from './types';

export interface SummaryOutput {
  text: string;
  recommendation: string;
  criticalFlags: string[];
  problemStatement: string;
  solutionStrategy: string;
}

/**
 * Generates an executive-level deterministic summary using high-stakes professional terminology.
 * Follows a Problem/Solution methodology for corporate stakeholders.
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

  // Professional risk assessment
  let riskStatus = '';
  if (score < 40) {
    riskStatus = 'EXPOSURE CRITICAL: Significant legal and functional barriers identified.';
  } else if (score < 60) {
    riskStatus = 'SUBSTANTIAL RISK: Major compliance gaps detected in core interaction paths.';
  } else if (score < 80) {
    riskStatus = 'MODERATE COMPLIANCE: Standardized patterns identified with residual friction.';
  } else {
    riskStatus = 'OPTIMIZED PERFORMANCE: Demonstrating industry-leading inclusive benchmarks.';
  }

  const failedPersonas = testRuns.filter(run => !run.success).map(run => run.persona);
  
  const problemStatement = failedPersonas.length > 0
    ? `The current AI implementation presents systematic functional blockages for users identifying as ${failedPersonas.join(', ')}. These barriers impede mission-critical workflows and represent a significant parity gap in service delivery.`
    : `While technical parity is high, the system remains susceptible to regression. Current audits indicate a ${passRate}% success rate across all functional personas, with minor friction points identified in peripheral modules.`;

  const solutionStrategy = score < 70
    ? `A comprehensive remediation roadmap is required. Focus must be prioritized on 'Critical' and 'Serious' barriers to restore functional access for ${failedPersonas.join(', ') || 'at-risk cohorts'}. Technical debt in the ${Object.entries(domainScores || {}).sort((a,b) => a[1]-b[1])[0]?.[0].toUpperCase() || 'Accessibility'} domain must be addressed to mitigate legal and brand exposure.`
    : `Focus should shift toward 'AAA' optimization and proactive monitoring. Implementing a persistent feedback loop for diverse user cohorts will ensure the current ${score}/100 benchmark is maintained throughout the next deployment cycle.`;

  const summaryText = `This executive briefing details the findings of a DISA Framework assessment. The audit results in an overall Inclusive Performance Score of ${score}/100, signifying ${riskStatus}. Of the ${total} simulated disability personas, ${passed} successfully reached task completion, indicating a ${passRate}% functional equity threshold.`;

  const recommendation = score < 60 
    ? 'MANDATORY INTERVENTION: Authorize an immediate engineering sprint to resolve identified critical blockages.'
    : 'STRATEGIC OPTIMIZATION: Integrate inclusive design patterns into the standard QA pipeline to bridge remaining parity gaps.';

  return {
    text: summaryText,
    recommendation,
    criticalFlags: failedPersonas.map(p => `Functional Blockage: ${p}`),
    problemStatement,
    solutionStrategy
  };
}