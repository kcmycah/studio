
/**
 * Keywords used for functional transparency and equity-data crawling.
 * Based on the DISA Framework policy paper requirements.
 */
export const TRANSPARENCY_KEYWORDS = {
  modelCard: ['model card', 'system card', 'technical report', 'model documentation', 'whitepaper', 'datasheet'],
  trainingData: ['training data', 'dataset', 'data sources', 'training corpus', 'data provenance'],
  fairnessEvaluation: ['bias evaluation', 'fairness assessment', 'ethical review', 'ai governance', 'algorithmic audit']
};

export const EQUITY_KEYWORDS = {
  disability: ['disability', 'icf', 'who disability', 'disabled', 'accessibility data', 'impairment breakdown'],
  geography: ['geography', 'region', 'parish', 'postal code', 'demographic area', 'global south'],
  digitalLiteracy: ['digital literacy', 'internet access', 'connectivity', 'digital divide', 'educational level']
};
