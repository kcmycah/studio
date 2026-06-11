
import axios from 'axios';
import * as cheerio from 'cheerio';
import { checkRobots } from '../crawler/robots';
import { TRANSPARENCY_KEYWORDS } from '../crawler/keywords';

/**
 * Crawls the target URL to evaluate transparency disclosures.
 */
export async function computeTransparencyScore(targetUrl: string): Promise<number> {
  const canCrawl = await checkRobots(targetUrl);
  if (!canCrawl) return 0;

  let score = 0;
  try {
    const response = await axios.get(targetUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    let pageText = $('body').text().toLowerCase();

    // Check potential sub-pages commonly used for AI transparency
    const subPaths = ['/transparency', '/ethics', '/safety', '/about/ai'];
    for (const path of subPaths) {
      try {
        const subUrl = new URL(path, targetUrl).href;
        const subRes = await axios.get(subUrl, { timeout: 3000 });
        if (subRes.status === 200) {
          pageText += ' ' + cheerio.load(subRes.data)('body').text().toLowerCase();
        }
      } catch {}
    }

    if (containsAny(pageText, TRANSPARENCY_KEYWORDS.modelCard)) score += 40;
    if (containsAny(pageText, TRANSPARENCY_KEYWORDS.trainingData)) score += 30;
    if (containsAny(pageText, TRANSPARENCY_KEYWORDS.fairnessEvaluation)) score += 30;
    
    return Math.min(100, score);
  } catch (error) {
    console.warn('Transparency crawl failed:', error);
    return 0;
  }
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}
