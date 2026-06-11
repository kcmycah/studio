
import axios from 'axios';
import * as cheerio from 'cheerio';
import { checkRobots } from '../crawler/robots';
import { EQUITY_KEYWORDS } from '../crawler/keywords';

/**
 * Crawls the target URL to evaluate Equity-Data Readiness.
 * Looks for indicators that the system was built with inclusive demographic data.
 */
export async function computeEquityDataScore(targetUrl: string): Promise<number> {
  const canCrawl = await checkRobots(targetUrl);
  if (!canCrawl) return 0;

  let score = 0;
  try {
    const response = await axios.get(targetUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    let pageText = $('body').text().toLowerCase();

    const subPaths = ['/data', '/research', '/privacy', '/impact'];
    for (const path of subPaths) {
      try {
        const subUrl = new URL(path, targetUrl).href;
        const subRes = await axios.get(subUrl, { timeout: 3000 });
        if (subRes.status === 200) {
          pageText += ' ' + cheerio.load(subRes.data)('body').text().toLowerCase();
        }
      } catch {}
    }

    if (containsAny(pageText, EQUITY_KEYWORDS.disability)) score += 40;
    if (containsAny(pageText, EQUITY_KEYWORDS.geography)) score += 30;
    if (containsAny(pageText, EQUITY_KEYWORDS.digitalLiteracy)) score += 30;
    
    return Math.min(100, score);
  } catch (error) {
    console.warn('Equity data crawl failed:', error);
    return 0;
  }
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}
