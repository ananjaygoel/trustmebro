/**
 * TrustMeBro Reddit Auto-Poster
 * Posts top articles to relevant subreddits
 * 
 * FREE: 100 queries/min limit
 * Run: npm run post-reddit
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ CONFIG ============
const POSTS_DIR = './src/content/posts';
const POSTED_LOG = './src/content/.reddit-posted.json';
const SITE_URL = 'https://trustmebro.pro';
const MAX_POSTS_PER_RUN = 3; // Stay conservative to avoid spam detection

// Subreddit mapping by category
const SUBREDDIT_MAP: Record<string, string[]> = {
  'tech': ['technology', 'technews', 'gadgets'],
  'ai': ['artificial', 'MachineLearning', 'OpenAI'],
  'gaming': ['gaming', 'Games', 'pcgaming'],
  'entertainment': ['entertainment', 'movies', 'television'],
  'sports': ['sports'],
  'science': ['science', 'EverythingScience'],
  'health': ['health', 'HealthNews'],
  'business': ['business', 'Economics'],
  'world': ['worldnews', 'news'],
  'viral': ['interestingasfuck', 'Damnthatsinteresting'],
};

// ============ CREDENTIALS ============
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || '';
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || '';
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD || '';

// ============ TYPES ============
interface PostedLog {
  reddit: string[];
}

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: Date;
  publishedAt: Date;
}

// ============ LOAD/SAVE LOG ============
function loadPostedLog(): PostedLog {
  try {
    if (fs.existsSync(POSTED_LOG)) {
      return JSON.parse(fs.readFileSync(POSTED_LOG, 'utf-8'));
    }
  } catch (e) {
    console.log('⚠️ Could not load Reddit posted log, starting fresh');
  }
  return { reddit: [] };
}

function savePostedLog(log: PostedLog): void {
  fs.writeFileSync(POSTED_LOG, JSON.stringify(log, null, 2));
}

// ============ GET RECENT ARTICLES ============
function getRecentArticles(): Article[] {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  const articles: Article[] = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      
      const title = frontmatter.match(/title:\s*"([^"]+)"/)?.[1] || '';
      const excerpt = frontmatter.match(/excerpt:\s*"([^"]+)"/)?.[1] || '';
      const category = frontmatter.match(/category:\s*"?([^"\n]+)"?/)?.[1]?.trim() || 'tech';
      const dateStr = frontmatter.match(/date:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      const publishedAtStr = frontmatter.match(/publishedAt:\s*"([^"]+)"/)?.[1];
      
      if (!title || !dateStr) continue;
      
      const date = new Date(dateStr);
      const publishedAt = publishedAtStr ? new Date(publishedAtStr) : date;
      
      // Only include articles from last 24 hours
      if (publishedAt >= oneDayAgo) {
        articles.push({
          slug: file.replace('.mdx', ''),
          title,
          excerpt,
          category,
          date,
          publishedAt
        });
      }
    } catch (e) {
      // Skip broken files
    }
  }
  
  // Sort by publishedAt descending
  return articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

// ============ REDDIT AUTH ============
async function getRedditAccessToken(): Promise<string | null> {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    console.log('⚠️ Reddit credentials not configured');
    return null;
  }
  
  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TrustMeBroBot/1.0 (by /u/' + REDDIT_USERNAME + ')'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: REDDIT_USERNAME,
        password: REDDIT_PASSWORD
      })
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      console.log('✅ Reddit auth successful');
      return data.access_token;
    } else {
      console.log('❌ Reddit auth failed:', data.error || data);
      return null;
    }
  } catch (error: any) {
    console.log('❌ Reddit auth error:', error.message);
    return null;
  }
}

// ============ POST TO REDDIT ============
async function postToReddit(
  token: string,
  subreddit: string,
  title: string,
  url: string
): Promise<boolean> {
  try {
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TrustMeBroBot/1.0 (by /u/' + REDDIT_USERNAME + ')'
      },
      body: new URLSearchParams({
        api_type: 'json',
        kind: 'link',
        sr: subreddit,
        title: title,
        url: url,
        resubmit: 'false', // Don't repost same URL
        sendreplies: 'false'
      })
    });
    
    const data = await response.json();
    
    if (data.json?.errors?.length > 0) {
      const error = data.json.errors[0];
      console.log(`   ⚠️ r/${subreddit}: ${error[1] || error[0]}`);
      return false;
    }
    
    if (data.json?.data?.url) {
      console.log(`   ✅ r/${subreddit}: Posted!`);
      return true;
    }
    
    console.log(`   ⚠️ r/${subreddit}: Unknown response`);
    return false;
  } catch (error: any) {
    console.log(`   ❌ r/${subreddit}: ${error.message}`);
    return false;
  }
}

// ============ MAIN ============
async function main() {
  console.log('\n🤖 TrustMeBro Reddit Auto-Poster\n');
  
  // Check credentials
  if (!REDDIT_CLIENT_ID) {
    console.log('❌ REDDIT_CLIENT_ID not set');
    console.log('\nTo set up Reddit posting:');
    console.log('1. Go to https://www.reddit.com/prefs/apps');
    console.log('2. Create a "script" type app');
    console.log('3. Add these GitHub secrets:');
    console.log('   - REDDIT_CLIENT_ID');
    console.log('   - REDDIT_CLIENT_SECRET');
    console.log('   - REDDIT_USERNAME');
    console.log('   - REDDIT_PASSWORD');
    return;
  }
  
  // Get auth token
  const token = await getRedditAccessToken();
  if (!token) return;
  
  // Load posted log
  const log = loadPostedLog();
  
  // Get recent articles
  const articles = getRecentArticles();
  console.log(`📰 Found ${articles.length} articles from last 24 hours\n`);
  
  // Filter out already posted
  const unposted = articles.filter(a => !log.reddit.includes(a.slug));
  console.log(`📤 ${unposted.length} not yet posted to Reddit\n`);
  
  if (unposted.length === 0) {
    console.log('✅ All recent articles already posted!');
    return;
  }
  
  // Post top articles
  let posted = 0;
  for (const article of unposted.slice(0, MAX_POSTS_PER_RUN)) {
    const subreddits = SUBREDDIT_MAP[article.category] || SUBREDDIT_MAP['tech'];
    const subreddit = subreddits[0]; // Use primary subreddit for category
    const url = `${SITE_URL}/posts/${article.slug}/`;
    
    console.log(`📝 Posting: ${article.title.slice(0, 50)}...`);
    console.log(`   Category: ${article.category} → r/${subreddit}`);
    
    const success = await postToReddit(token, subreddit, article.title, url);
    
    if (success) {
      log.reddit.push(article.slug);
      posted++;
    }
    
    // Rate limit: wait 10s between posts
    if (posted < MAX_POSTS_PER_RUN) {
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  
  // Save log
  savePostedLog(log);
  
  console.log(`\n🎉 Done! Posted ${posted} articles to Reddit`);
}

main().catch(console.error);
