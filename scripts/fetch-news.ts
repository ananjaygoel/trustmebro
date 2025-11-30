/**
 * TrustMeBro News Fetcher v2.0
 * 
 * Fetches news from NewsAPI + RSS feeds and rewrites them in GenZ style using AI Pipe + Claude
 * Run with: npm run fetch-news
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ CONFIGURATION ============
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const POSTS_DIR = './src/content/posts';

// Articles per category - Groq has 14,400 req/day FREE!
const ARTICLES_PER_CATEGORY = 5;
const PAGE_SIZE = 15;

// Categories to fetch news for
const CATEGORIES = ['technology', 'business', 'entertainment', 'sports', 'science', 'health', 'general'];

// Map NewsAPI categories to our categories
const CATEGORY_MAP: Record<string, string> = {
  'technology': 'tech',
  'business': 'business',
  'entertainment': 'entertainment',
  'sports': 'sports',
  'science': 'science',
  'health': 'health',
  'general': 'world',
};

// RSS Feeds for additional content (unlimited!)
const RSS_FEEDS = [
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'tech', source: 'Ars Technica' },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'tech', source: 'The Verge' },
  { url: 'https://techcrunch.com/feed/', category: 'tech', source: 'TechCrunch' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'tech', source: 'BBC Tech' },
  { url: 'https://www.wired.com/feed/rss', category: 'tech', source: 'Wired' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', source: 'BBC World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'world', source: 'NY Times' },
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'entertainment', source: 'BBC Entertainment' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'science', source: 'BBC Science' },
  { url: 'https://www.reddit.com/r/technology/.rss', category: 'viral', source: 'Reddit Tech' },
  { url: 'https://www.reddit.com/r/worldnews/.rss', category: 'viral', source: 'Reddit World' },
];

interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string;
  source: { name: string };
  publishedAt: string;
}

interface RewrittenArticle {
  title: string;
  excerpt: string;
  content: string;
}

// ============ FETCH NEWS FROM NEWSAPI ============
async function fetchNews(category: string): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.log('⚠️  No NEWS_API_KEY found, skipping NewsAPI');
    return [];
  }

  const url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=${PAGE_SIZE}&apiKey=${NEWS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      console.error(`❌ NewsAPI error for ${category}:`, data.message);
      return [];
    }
    
    return data.articles.filter((a: NewsArticle) => 
      a.title && 
      a.description && 
      !a.title.includes('[Removed]') &&
      a.description.length > 50
    );
  } catch (error) {
    console.error(`❌ Failed to fetch ${category}:`, error);
    return [];
  }
}

// ============ FETCH NEWS FROM RSS FEEDS ============
async function fetchRSS(feedUrl: string): Promise<NewsArticle[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'TrustMeBro News Bot/2.0'
      }
    });
    const xml = await response.text();
    
    // Simple XML parsing for RSS items
    const items: NewsArticle[] = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || 
                        xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    
    for (const item of itemMatches.slice(0, 10)) {
      const title = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() || '';
      const description = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.trim() ||
                         item.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/)?.[1]?.trim() ||
                         item.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/)?.[1]?.trim() || '';
      const link = item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)?.[1]?.trim() ||
                   item.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
      const image = item.match(/<media:content[^>]*url="([^"]+)"/)?.[1] ||
                    item.match(/<enclosure[^>]*url="([^"]+)"/)?.[1] ||
                    item.match(/src="(https:\/\/[^"]+\.(jpg|jpeg|png|webp))"/)?.[1] || '';
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ||
                      item.match(/<published>([\s\S]*?)<\/published>/)?.[1] || '';
      
      // Clean HTML from description
      const cleanDescription = description
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .slice(0, 500);
      
      if (title && cleanDescription && cleanDescription.length > 30) {
        items.push({
          title: title.replace(/<[^>]+>/g, ''),
          description: cleanDescription,
          content: cleanDescription,
          url: link,
          urlToImage: image,
          source: { name: 'RSS' },
          publishedAt: pubDate,
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error(`❌ Failed to fetch RSS ${feedUrl}:`, error);
    return [];
  }
}

// ============ REWRITE WITH GROQ (FREE - 14,400 req/day!) ============
// Uses Llama 3.1 8B via Groq API - blazing fast LPU inference
async function rewriteWithGroq(article: NewsArticle): Promise<RewrittenArticle | null> {
  if (!GROQ_API_KEY) {
    console.log('⚠️  No GROQ_API_KEY found, using original content');
    return {
      title: article.title,
      excerpt: article.description,
      content: article.content || article.description,
    };
  }

  const prompt = `You are a Gen Z news writer AND SEO expert for "TrustMeBro" - a sarcastic, funny news site. 
Rewrite this news article to be:

**TONE & STYLE:**
- Hilarious and sarcastic (but still informative)
- Full of Gen Z slang (no cap, fr fr, lowkey, highkey, slay, ate, understood the assignment, main character energy, it's giving, etc.)
- Include jokes, memes references, and witty observations
- Use emojis sparingly but effectively
- Keep the facts accurate but make the delivery entertaining
- Add funny commentary and hot takes
- Make it sound like a friend telling you the news

**SEO REQUIREMENTS (IMPORTANT):**
- Title: Include primary keyword naturally, keep under 60 characters, make it click-worthy
- Excerpt: Include secondary keywords, keep between 120-160 characters for meta description
- Content: 
  - Use H2 (##) and H3 (###) headings with keywords
  - Include relevant keywords naturally throughout (don't keyword stuff)
  - First paragraph should contain the main keyword
  - Use semantic/related keywords throughout
  - Include numbers, statistics, or data when available
  - Aim for 300-500 words minimum for SEO value

Original Title: ${article.title}
Original Content: ${article.description} ${article.content || ''}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "title": "SEO-optimized catchy title (max 60 chars, include keyword + emoji)",
  "excerpt": "SEO meta description with keywords, 120-160 chars, compelling",
  "content": "full rewritten article in markdown with proper headings, keywords, 300-500 words"
}`;

  try {
    // Groq API - OpenAI compatible, using Llama 3.1 8B (fast & free!)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that outputs only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Groq error:', data.error.message || data.error);
      return null;
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response (clean up any markdown code blocks)
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('❌ Rewrite failed:', error);
    return null;
  }
}

// ============ SAVE POST ============
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

function postExists(slug: string): boolean {
  const filename = `${slug}.mdx`;
  const filepath = path.join(POSTS_DIR, filename);
  return fs.existsSync(filepath);
}

function savePost(article: RewrittenArticle, category: string, source: string, image: string): boolean {
  const slug = slugify(article.title);
  const date = new Date().toISOString().split('T')[0];
  const filename = `${slug}.mdx`;
  const filepath = path.join(POSTS_DIR, filename);

  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping (exists): ${slug}`);
    return false;
  }

  const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
excerpt: "${article.excerpt.replace(/"/g, '\\"')}"
category: "${category}"
date: ${date}
image: "${image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'}"
author: "TrustMeBro Bot"
source: "${source}"
featured: false
---

${article.content}
`;

  fs.writeFileSync(filepath, frontmatter);
  console.log(`✅ Saved: ${filename}`);
  return true;
}

// ============ MAIN ============
async function main() {
  console.log('🔥 TrustMeBro News Fetcher v2.0\n');
  console.log(`📊 Config: ${ARTICLES_PER_CATEGORY} articles per category, ${PAGE_SIZE} fetched per request\n`);
  
  // Ensure posts directory exists
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  let totalSaved = 0;
  let totalProcessed = 0;

  // ============ FETCH FROM NEWSAPI ============
  console.log('📡 === NEWSAPI SOURCES ===\n');
  
  for (const category of CATEGORIES) {
    console.log(`\n📰 Fetching ${category} news...`);
    const articles = await fetchNews(category);
    console.log(`   Found ${articles.length} articles`);
    
    let categoryCount = 0;
    for (const article of articles) {
      if (categoryCount >= ARTICLES_PER_CATEGORY) break;
      
      // Skip if we might already have this
      const potentialSlug = slugify(article.title);
      if (postExists(potentialSlug)) {
        console.log(`   ⏭️  Skipping (likely exists): ${article.title.slice(0, 40)}...`);
        continue;
      }
      
      console.log(`   📝 Processing: ${article.title.slice(0, 50)}...`);
      totalProcessed++;
      
      const rewritten = await rewriteWithGroq(article);
      if (rewritten) {
        const saved = savePost(
          rewritten,
          CATEGORY_MAP[category] || 'world',
          article.source.name,
          article.urlToImage
        );
        if (saved) {
          totalSaved++;
          categoryCount++;
        }
      }
      
      // Rate limiting - be nice to APIs
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // ============ FETCH FROM RSS FEEDS ============
  console.log('\n\n📡 === RSS FEED SOURCES ===\n');
  
  for (const feed of RSS_FEEDS) {
    console.log(`\n🔗 Fetching ${feed.source}...`);
    const articles = await fetchRSS(feed.url);
    console.log(`   Found ${articles.length} articles`);
    
    let feedCount = 0;
    for (const article of articles) {
      if (feedCount >= 5) break; // Max 5 per RSS feed
      
      // Skip if we might already have this
      const potentialSlug = slugify(article.title);
      if (postExists(potentialSlug)) {
        continue;
      }
      
      console.log(`   📝 Processing: ${article.title.slice(0, 50)}...`);
      totalProcessed++;
      
      const rewritten = await rewriteWithGroq(article);
      if (rewritten) {
        const saved = savePost(
          rewritten,
          feed.category,
          feed.source,
          article.urlToImage
        );
        if (saved) {
          totalSaved++;
          feedCount++;
        }
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\n\n🎉 Done!`);
  console.log(`   📊 Processed: ${totalProcessed} articles`);
  console.log(`   ✅ Saved: ${totalSaved} new articles`);
}

main().catch(console.error);
