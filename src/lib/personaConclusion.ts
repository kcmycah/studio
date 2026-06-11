/**
 * @fileOverview Helper logic for generating persona-specific conclusions based on audit results.
 */

import { TestRunResult, AccessibilityIssue } from './types';

export function generatePersonaConclusion(run: TestRunResult): string {
  const issues = run.accessibilityIssues || [];
  const criticalCount = issues.filter(i => i.impact === 'critical').length;
  
  if (!run.success) {
    return 'Test failed to complete. The system interface did not load properly or a critical functional error occurred during the simulation.';
  }
  
  if (issues.length === 0) {
    return 'No accessibility barriers detected. The persona is expected to navigate and utilize the system without functional friction.';
  }
  
  if (criticalCount > 0) {
    return `Critical functional blockage. Detected ${criticalCount} critical issue(s) that fundamentally prevent this persona from completing core tasks.`;
  }
  
  return `Functional access maintained with ${issues.length} non-critical barrier(s). Task completion is possible, but user friction is elevated.`;
}
