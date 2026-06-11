
/**
 * Comprehensive DISA Scoring Framework.
 * Weighted average across four key domains of inclusive AI.
 */
export interface DISAResult {
  accessibilityScore: number;
  biasRiskScore: number;
  transparencyScore: number;
  equityDataScore: number;
  overallScore: number;
}

const WEIGHTS = {
  accessibility: 0.25,
  biasRisk: 0.25,
  transparency: 0.25,
  equityData: 0.25
};

export function computeFullDISAScore(scores: Partial<DISAResult>): DISAResult {
  const result: DISAResult = {
    accessibilityScore: scores.accessibilityScore ?? 0,
    biasRiskScore: scores.biasRiskScore ?? 0,
    transparencyScore: scores.transparencyScore ?? 0,
    equityDataScore: scores.equityDataScore ?? 0,
    overallScore: 0
  };

  result.overallScore = Math.round(
    (result.accessibilityScore * WEIGHTS.accessibility) +
    (result.biasRiskScore * WEIGHTS.biasRisk) +
    (result.transparencyScore * WEIGHTS.transparency) +
    (result.equityDataScore * WEIGHTS.equityData)
  );

  return result;
}
