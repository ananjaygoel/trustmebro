/**
 * TrustMeBro Social Media Auto-Poster
 * Posts top articles to Bluesky + Twitter/X with GenZ vibes
 * 
 * Budget:
 * - Bluesky: Unlimited (FREE)
 * - Twitter: 500 posts/month = ~16/day = ~1-2 per run
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ CONFIG ============
const POSTS_DIR = './src/content/posts';
const POSTED_LOG = './src/content/.social-posted.json';
const SITE_URL = 'https://trustmebro.pro';
const MAX_TWEETS_PER_RUN = 2; // Conservative for 500/month limit
const MAX_BLUESKY_PER_RUN = 5; // Bluesky is unlimited

// ============ CREDENTIALS ============
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || '';
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD || '';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || '';

// ============ TYPES ============
interface PostedLog {
  twitter: string[];
  bluesky: string[];
}

interface ArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  viralityScore: number;
}

// ============ VIRALITY SCORE ============
function calculateViralityScore(title: string, excerpt: string, category: string): number {
  let score = 0;
  
  // Category boost
  const categoryScores: Record<string, number> = {
    'viral': 50,
    'entertainment': 35,
    'gaming': 30,
    'ai': 25,
    'tech': 20,
    'sports': 15,
    'science': 10,
    'business': 10,
    'health': 10,
    'world': 5,
  };
  score += categoryScores[category.toLowerCase()] || 0;
  
  // Hot keywords boost
  const hotWords = [
    'breaking', 'just', 'drama', 'shocking', 'wild', 'leaked', 
    'exclusive', 'finally', 'confirmed', 'dead', 'viral', 'insane',
    'accused', 'arrested', 'fired', 'cancelled', 'exposed', 'caught'
  ];
  const titleLower = title.toLowerCase();
  hotWords.forEach(word => {
    if (titleLower.includes(word)) score += 15;
  });
  
  // GenZ slang boost (indicates good rewrite)
  const genZWords = [
    'no cap', 'fr fr', 'lowkey', 'highkey', 'slay', 'ate', 
    'main character', 'giving', 'bestie', 'periodt', 'understood the assignment'
  ];
  genZWords.forEach(word => {
    if (titleLower.includes(word) || excerpt.toLowerCase().includes(word)) score += 10;
  });
  
  // Emoji count boost
  const emojiCount = (title.match(/\p{Emoji}/gu) || []).length;
  score += emojiCount * 5;
  
  // Title length (shorter = better for social)
  if (title.length < 60) score += 10;
  if (title.length < 45) score += 5;
  
  return score;
}

// ============ GENERATE SOCIAL POST ============
function generateSocialPost(article: ArticleMeta, platform: 'twitter' | 'bluesky'): string {
  const url = `${SITE_URL}/posts/${article.slug}`;
  
  // GenZ caption starters
  const starters = [
    "🔥 ",
    "💀 ",
    "no cap, ",
    "bestie, ",
    "not me finding out ",
    "the way ",
    "pov: ",
    "okay but ",
    "literally ",
    "bruh ",
  ];
  
  // GenZ endings
  const endings = [
    " 👀",
    " 💅",
    " and i'm here for it",
    " no thoughts just vibes",
    " this is sending me",
    "",
    " 😭",
    " we need to talk about this",
  ];
  
  const starter = starters[Math.floor(Math.random() * starters.length)];
  const ending = endings[Math.floor(Math.random() * endings.length)];
  
  // Category hashtags
  const categoryHashtags: Record<string, string[]> = {
    'tech': ['#Tech', '#TechNews'],
    'ai': ['#AI', '#ArtificialIntelligence', '#Tech'],
    'gaming': ['#Gaming', '#Gamer', '#VideoGames'],
    'entertainment': ['#Entertainment', '#Celeb', '#PopCulture'],
    'sports': ['#Sports', '#ESPN'],
    'science': ['#Science', '#STEM'],
    'business': ['#Business', '#Finance'],
    'health': ['#Health', '#Wellness'],
    'world': ['#WorldNews', '#Breaking'],
    'viral': ['#Viral', '#Trending'],
  };
  
  const hashtags = categoryHashtags[article.category.toLowerCase()] || ['#News'];
  const hashtagStr = hashtags.slice(0, 2).join(' ');
  
  // Clean title (remove emoji at end if present for cleaner look)
  let cleanTitle = article.title.replace(/\s*[\p{Emoji}]\s*$/gu, '').trim();
  
  // Build post
  if (platform === 'twitter') {
    // Twitter: 280 chars max
    const basePost = `${starter}${cleanTitle}${ending}\n\n${hashtagStr}\n${url}`;
    if (basePost.length <= 280) {
      return basePost;
    }
    // Truncate if needed
    const maxTitleLen = 280 - starter.length - ending.length - hashtagStr.length - url.length - 10;
    cleanTitle = cleanTitle.slice(0, maxTitleLen) + '...';
    return `${starter}${cleanTitle}${ending}\n\n${hashtagStr}\n${url}`;
  } else {
    // Bluesky: 300 chars max, but more relaxed
    return `${starter}${cleanTitle}${ending}\n\n${article.excerpt.slice(0, 100)}...\n\n${hashtagStr}\n\n🔗 ${url}`;
  }
}

// ============ BLUESKY API ============
async function postToBluesky(text: string): Promise<boolean> {
  if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
    console.log('⚠️  Bluesky credentials not configured');
    return false;
  }
  
  try {
    // Step 1: Create session
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: BLUESKY_HANDLE,
        password: BLUESKY_APP_PASSWORD,
      }),
    });
    
    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      console.error('❌ Bluesky auth failed:', err);
      return false;
    }
    
    const session = await sessionRes.json();
    
    // Step 2: Create post
    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: {
          text: text,
          createdAt: new Date().toISOString(),
        },
      }),
    });
    
    if (!postRes.ok) {
      const err = await postRes.text();
      console.error('❌ Bluesky post failed:', err);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Bluesky error:', error);
    return false;
  }
}

// ============ TWITTER API (OAuth 1.0a) ============
async function postToTwitter(text: string): Promise<boolean> {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    console.log('⚠️  Twitter credentials not configured');
    return false;
  }
  
  try {
    // Twitter API v2 with OAuth 1.0a
    const crypto = await import('crypto');
    
    const oauth = {
      oauth_consumer_key: TWITTER_API_KEY,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: TWITTER_ACCESS_TOKEN,
      oauth_version: '1.0',
    };
    
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    
    // Create signature base string
    const params = { ...oauth };
    const sortedParams = Object.keys(params).sort().map(k => 
      `${encodeURIComponent(k)}=${encodeURIComponent(params[k as keyof typeof params])}`
    ).join('&');
    
    const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(TWITTER_API_SECRET)}&${encodeURIComponent(TWITTER_ACCESS_SECRET)}`;
    
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');
    
    const authHeader = 'OAuth ' + Object.entries({ ...oauth, oauth_signature: signature })
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(', ');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error('❌ Twitter post failed:', err);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Twitter error:', error);
    return false;
  }
}

// ============ LOAD/SAVE POSTED LOG ============
function loadPostedLog(): PostedLog {
  try {
    if (fs.existsSync(POSTED_LOG)) {
      return JSON.parse(fs.readFileSync(POSTED_LOG, 'utf-8'));
    }
  } catch (e) {
    console.log('⚠️  Could not load posted log, starting fresh');
  }
  return { twitter: [], bluesky: [] };
}

function savePostedLog(log: PostedLog): void {
  // Keep only last 500 entries per platform to prevent file bloat
  log.twitter = log.twitter.slice(-500);
  log.bluesky = log.bluesky.slice(-500);
  fs.writeFileSync(POSTED_LOG, JSON.stringify(log, null, 2));
}

// ============ GET RECENT ARTICLES ============
function getRecentArticles(): ArticleMeta[] {
  const articles: ArticleMeta[] = [];
  
  if (!fs.existsSync(POSTS_DIR)) return articles;
  
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) continue;
      
      const frontmatter = frontmatterMatch[1];
      const title = frontmatter.match(/title:\s*"([^"]+)"/)?.[1] || '';
      const excerpt = frontmatter.match(/excerpt:\s*"([^"]+)"/)?.[1] || '';
      const category = frontmatter.match(/category:\s*"([^"]+)"/)?.[1] || '';
      // Use publishedAt (quoted ISO string) or fall back to date (unquoted)
      const publishedAt = frontmatter.match(/publishedAt:\s*"([^"]+)"/)?.[1] || '';
      const date = publishedAt || frontmatter.match(/date:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || '';
      
      const slug = file.replace('.mdx', '');
      
      // Only include articles from last 24 hours
      const articleDate = new Date(date);
      const now = new Date();
      const hoursDiff = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff <= 24 && title) {
        articles.push({
          slug,
          title,
          excerpt,
          category,
          date,
          viralityScore: calculateViralityScore(title, excerpt, category),
        });
      }
    } catch (e) {
      // Skip files that can't be parsed
    }
  }
  
  // Sort by virality score (highest first)
  return articles.sort((a, b) => b.viralityScore - a.viralityScore);
}

// ============ MAIN ============
async function main() {
  console.log('📱 TrustMeBro Social Media Poster\n');
  
  const postedLog = loadPostedLog();
  const articles = getRecentArticles();
  
  console.log(`📰 Found ${articles.length} articles from last 24 hours\n`);
  
  if (articles.length === 0) {
    console.log('No recent articles to post');
    return;
  }
  
  // Show top articles by virality
  console.log('🔥 Top articles by virality score:');
  articles.slice(0, 5).forEach((a, i) => {
    console.log(`   ${i + 1}. [${a.viralityScore}] ${a.title.slice(0, 50)}...`);
  });
  console.log('');
  
  let twitterPosted = 0;
  let blueskyPosted = 0;
  let twitterFailed = 0;  // Track failures to stop trying after repeated fails
  let blueskyFailed = 0;
  
  // Only try top articles by virality (no point trying 50+)
  const topArticles = articles.slice(0, 10);
  
  for (const article of topArticles) {
    // Check if we've hit limits OR too many failures
    if (twitterPosted >= MAX_TWEETS_PER_RUN && blueskyPosted >= MAX_BLUESKY_PER_RUN) {
      console.log('\n✅ Hit posting limits, stopping');
      break;
    }
    if (twitterFailed >= 3 && blueskyFailed >= 3) {
      console.log('\n⚠️ Too many failures on both platforms, stopping');
      break;
    }
    
    // Post to Twitter (if not already posted and under limit)
    if (twitterPosted < MAX_TWEETS_PER_RUN && twitterFailed < 3 && !postedLog.twitter.includes(article.slug)) {
      const tweet = generateSocialPost(article, 'twitter');
      console.log(`\n🐦 Posting to Twitter: ${article.title.slice(0, 40)}...`);
      
      const success = await postToTwitter(tweet);
      if (success) {
        console.log('   ✅ Twitter posted!');
        postedLog.twitter.push(article.slug);
        twitterPosted++;
        twitterFailed = 0; // Reset on success
      } else {
        twitterFailed++;
      }
      
      // Small delay between posts
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Post to Bluesky (if not already posted and under limit)
    if (blueskyPosted < MAX_BLUESKY_PER_RUN && blueskyFailed < 3 && !postedLog.bluesky.includes(article.slug)) {
      const post = generateSocialPost(article, 'bluesky');
      console.log(`\n🦋 Posting to Bluesky: ${article.title.slice(0, 40)}...`);
      
      const success = await postToBluesky(post);
      if (success) {
        console.log('   ✅ Bluesky posted!');
        postedLog.bluesky.push(article.slug);
        blueskyPosted++;
        blueskyFailed = 0; // Reset on success
      } else {
        blueskyFailed++;
      }
      
      // Longer delay for Bluesky to avoid rate limits
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  // Save updated log
  savePostedLog(postedLog);
  
  console.log(`\n\n🎉 Done!`);
  console.log(`   🐦 Twitter: ${twitterPosted} new posts`);
  console.log(`   🦋 Bluesky: ${blueskyPosted} new posts`);
}

main().catch(console.error);
