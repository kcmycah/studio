
import axios from 'axios';
import robotsParser from 'robots-parser';

const cache = new Map<string, boolean>();

/**
 * Checks robots.txt to see if crawling is allowed.
 * Caches results per domain to respect server bandwidth.
 */
export async function checkRobots(url: string): Promise<boolean> {
  try {
    const baseUrl = new URL(url).origin;
    if (cache.has(baseUrl)) return cache.get(baseUrl)!;
    
    const robotsUrl = `${baseUrl}/robots.txt`;
    const response = await axios.get(robotsUrl, { timeout: 5000 });
    const robots = robotsParser(robotsUrl, response.data);
    
    // Using a custom user-agent to identify our compliance bot
    const allowed = robots.isAllowed(url, 'DISA-Bot') ?? true;
    cache.set(baseUrl, allowed);
    return allowed;
  } catch {
    // If robots.txt fails or doesn't exist, we assume crawling is permissible for auditing.
    return true;
  }
}
