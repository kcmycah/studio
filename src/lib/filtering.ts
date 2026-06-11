
import { TestRun, AccessibilityIssue, ImpactLevel, WCAGLevel } from './types';

export interface FilterCriteria {
  wcagLevel?: WCAGLevel;
  impact?: ImpactLevel;
  persona?: string;
  success?: boolean;
}

export interface KPIStats {
  totalA: number;
  totalAA: number;
  totalAAA: number;
  criticalCount: number;
  overallPassRate: number;
}

/**
 * Filters test runs and their issues based on user criteria.
 */
export function filterTestRuns(runs: TestRun[], criteria: FilterCriteria) {
  return runs.map(run => {
    // Filter by persona or success if specified
    if (criteria.persona && run.persona !== criteria.persona) return null;
    if (criteria.success !== undefined && run.success !== criteria.success) return null;

    const filteredIssues = run.accessibilityIssues.filter(issue => {
      if (criteria.impact && issue.impact !== criteria.impact) return false;
      if (criteria.wcagLevel && issue.wcagLevel !== criteria.wcagLevel) return false;
      return true;
    });

    return { ...run, accessibilityIssues: filteredIssues };
  }).filter(Boolean) as TestRun[];
}

/**
 * Computes KPIs for a set of test runs.
 */
export function computeKPIs(runs: TestRun[]): KPIStats {
  let totalA = 0;
  let totalAA = 0;
  let totalAAA = 0;
  let criticalCount = 0;
  let successfulRuns = 0;

  runs.forEach(run => {
    if (run.success) successfulRuns++;
    run.accessibilityIssues.forEach(issue => {
      if (issue.wcagLevel === 'A') totalA++;
      if (issue.wcagLevel === 'AA') totalAA++;
      if (issue.wcagLevel === 'AAA') totalAAA++;
      if (issue.impact === 'critical') criticalCount++;
    });
  });

  return {
    totalA,
    totalAA,
    totalAAA,
    criticalCount,
    overallPassRate: runs.length > 0 ? Math.round((successfulRuns / runs.length) * 100) : 0
  };
}
