/**
 * Scraper Library
 * 
 * A utility package for web scraping
 */

// Export all types
export * from './types/index.js';

// Export IGRO scraper
export * from './igro-scraper.js';

/**
 * Example function to demonstrate the library
 * @param url - The URL to scrape
 * @returns A promise that resolves to the scraped data
 */
export async function scrape(url: string): Promise<string> {
  // This is just a placeholder implementation
  return `Scraped data from ${url}`;
}

/**
 * Version of the library
 */
export const version = '0.1.0';

// Export default object for convenience
export default {
  scrape,
  version
}; 