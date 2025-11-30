/**
 * TrustMeBro News Fetcher
 * 
 * Fetches news from NewsAPI and rewrites them in GenZ style using AI Pipe + Claude
 * Run with: npm run fetch-news
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ CONFIGURATION ============
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const AIPIPE_TOKEN = process.env.AIPIPE_TOKEN || '';
const POSTS_DIR = './src/content/posts';

// Categories to fetch news for
const CATEGORIES = ['technology', 'business', 'entertainment', 'sports', 'science', 'health'];

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

// ============ FETCH NEWS ============
async function fetchNews(category: string): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.log('⚠️  No NEWS_API_KEY found, using sample data');
    return [];
  }

  const url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=5&apiKey=${NEWS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      console.error(`❌ NewsAPI error for ${category}:`, data.message);
      return [];
    }
    
    return data.articles.filter((a: NewsArticle) => a.title && a.description);
  } catch (error) {
    console.error(`❌ Failed to fetch ${category}:`, error);
    return [];
  }
}

// ============ REWRITE WITH AI PIPE + CLAUDE ============
async function rewriteWithAIPipe(article: NewsArticle): Promise<RewrittenArticle | null> {
  if (!AIPIPE_TOKEN) {
    console.log('⚠️  No AIPIPE_TOKEN found, using original content');
    return {
      title: article.title,
      excerpt: article.description,
      content: article.content || article.description,
    };
  }

  const prompt = `You are a Gen Z news writer for "TrustMeBro" - a sarcastic, funny news site. 
Rewrite this news article to be:
- Hilarious and sarcastic (but still informative)
- Full of Gen Z slang (no cap, fr fr, lowkey, highkey, slay, ate, understood the assignment, main character energy, it's giving, etc.)
- Include jokes, memes references, and witty observations
- Use emojis sparingly but effectively
- Keep the facts accurate but make the delivery entertaining
- Add funny commentary and hot takes
- Make it sound like a friend telling you the news

Original Title: ${article.title}
Original Content: ${article.description} ${article.content || ''}

Respond in JSON format:
{
  "title": "catchy Gen Z title with emoji",
  "excerpt": "funny 1-2 sentence summary",
  "content": "full rewritten article in markdown (3-5 paragraphs)"
}`;

  try {
    const response = await fetch('https://aipipe.org/openrouter/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIPIPE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4', // Claude Sonnet via AI Pipe
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ AI Pipe error:', data.error);
      return null;
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
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

function savePost(article: RewrittenArticle, category: string, source: string, image: string) {
  const slug = slugify(article.title);
  const date = new Date().toISOString().split('T')[0];
  const filename = `${slug}.mdx`;
  const filepath = path.join(POSTS_DIR, filename);

  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping (exists): ${slug}`);
    return;
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
}

// ============ MAIN ============
async function main() {
  console.log('🔥 TrustMeBro News Fetcher\n');
  
  // Ensure posts directory exists
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  let totalSaved = 0;

  for (const category of CATEGORIES) {
    console.log(`\n📰 Fetching ${category} news...`);
    const articles = await fetchNews(category);
    
    for (const article of articles.slice(0, 3)) { // Max 3 per category
      console.log(`  📝 Processing: ${article.title.slice(0, 50)}...`);
      
      const rewritten = await rewriteWithAIPipe(article);
      if (rewritten) {
        savePost(
          rewritten,
          CATEGORY_MAP[category] || 'world',
          article.source.name,
          article.urlToImage
        );
        totalSaved++;
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n🎉 Done! Saved ${totalSaved} new articles.`);
}

main().catch(console.error);
