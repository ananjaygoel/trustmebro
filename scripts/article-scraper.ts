/**
 * Article Scraper - Extracts full article text from URLs
 * Uses readability algorithm to extract main content
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ScrapedArticle {
  title: string;
  content: string;
  excerpt: string;
  byline?: string;
  siteName?: string;
  length: number;
}

// Sites that block scraping - skip these
const BLOCKED_DOMAINS = [
  'wsj.com',
  'nytimes.com', 
  'ft.com',
  'bloomberg.com',
  'washingtonpost.com',
  'reuters.com',
  'apnews.com',
];

// Check if URL is from a blocked domain
function isBlocked(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return true;
  }
}

/**
 * Scrape full article content from a URL
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle | null> {
  if (!url || isBlocked(url)) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrustMeBro/1.0; +https://trustmebro.pro)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Create a DOM from the HTML
    const dom = new JSDOM(html, { url });
    
    // Use Readability to extract the article
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.length < 200) {
      return null;
    }

    // Clean up the content
    const cleanContent = article.textContent
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      title: article.title || '',
      content: cleanContent,
      excerpt: article.excerpt || cleanContent.slice(0, 200),
      byline: article.byline || undefined,
      siteName: article.siteName || undefined,
      length: cleanContent.length,
    };
  } catch (error) {
    // Silently fail - scraping isn't always possible
    return null;
  }
}

/**
 * Enhance an RSS article with full scraped content
 */
export async function enhanceWithFullContent(
  article: { title: string; description: string; url?: string; content?: string }
): Promise<{ title: string; description: string; content: string }> {
  // If we already have good content (>500 chars), don't scrape
  const currentContent = article.content || article.description || '';
  if (currentContent.length > 500) {
    return {
      title: article.title,
      description: article.description,
      content: currentContent,
    };
  }

  // Try to scrape full article
  if (article.url) {
    const scraped = await scrapeArticle(article.url);
    if (scraped && scraped.content.length > currentContent.length) {
      return {
        title: scraped.title || article.title,
        description: scraped.excerpt || article.description,
        content: scraped.content,
      };
    }
  }

  // Fall back to what we have
  return {
    title: article.title,
    description: article.description,
    content: currentContent,
  };
}

// Test
if (process.argv[1]?.includes('article-scraper')) {
  const testUrl = process.argv[2] || 'https://www.theverge.com/2024/1/1/test';
  console.log(`Testing scraper with: ${testUrl}\n`);
  
  scrapeArticle(testUrl).then(result => {
    if (result) {
      console.log('Title:', result.title);
      console.log('Length:', result.length, 'chars');
      console.log('\nExcerpt:', result.excerpt);
      console.log('\nContent preview:', result.content.slice(0, 500) + '...');
    } else {
      console.log('Failed to scrape article');
    }
  });
}
