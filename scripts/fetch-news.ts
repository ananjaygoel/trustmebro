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
// 100+ sources across all categories for maximum content variety
const RSS_FEEDS = [
  // ==================== TECH (20+ sources) ====================
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'tech', source: 'Ars Technica' },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'tech', source: 'The Verge' },
  { url: 'https://techcrunch.com/feed/', category: 'tech', source: 'TechCrunch' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'tech', source: 'BBC Tech' },
  { url: 'https://www.wired.com/feed/rss', category: 'tech', source: 'Wired' },
  { url: 'https://www.cnet.com/rss/news/', category: 'tech', source: 'CNET' },
  { url: 'https://www.zdnet.com/news/rss.xml', category: 'tech', source: 'ZDNet' },
  { url: 'https://www.engadget.com/rss.xml', category: 'tech', source: 'Engadget' },
  { url: 'https://gizmodo.com/rss', category: 'tech', source: 'Gizmodo' },
  { url: 'https://mashable.com/feeds/rss/all', category: 'tech', source: 'Mashable' },
  { url: 'https://www.technologyreview.com/feed/', category: 'tech', source: 'MIT Tech Review' },
  { url: 'https://www.techmeme.com/feed.xml', category: 'tech', source: 'Techmeme' },
  { url: 'https://www.tomshardware.com/feeds/all', category: 'tech', source: 'Toms Hardware' },
  { url: 'https://9to5mac.com/feed/', category: 'tech', source: '9to5Mac' },
  { url: 'https://9to5google.com/feed/', category: 'tech', source: '9to5Google' },
  { url: 'https://www.androidcentral.com/feed', category: 'tech', source: 'Android Central' },
  { url: 'https://www.macrumors.com/macrumors.xml', category: 'tech', source: 'MacRumors' },
  { url: 'https://www.androidpolice.com/feed/', category: 'tech', source: 'Android Police' },
  { url: 'https://www.xda-developers.com/feed/', category: 'tech', source: 'XDA Developers' },
  { url: 'https://www.howtogeek.com/feed/', category: 'tech', source: 'How-To Geek' },
  { url: 'https://lifehacker.com/rss', category: 'tech', source: 'Lifehacker' },
  { url: 'https://slashdot.org/rss/slashdot.rss', category: 'tech', source: 'Slashdot' },
  
  // ==================== AI (15+ sources) ====================
  { url: 'https://openai.com/blog/rss/', category: 'ai', source: 'OpenAI Blog' },
  { url: 'https://blog.google/technology/ai/rss/', category: 'ai', source: 'Google AI' },
  { url: 'https://www.artificialintelligence-news.com/feed/', category: 'ai', source: 'AI News' },
  { url: 'https://syncedreview.com/feed/', category: 'ai', source: 'Synced AI' },
  { url: 'https://www.marktechpost.com/feed/', category: 'ai', source: 'MarkTechPost' },
  { url: 'https://venturebeat.com/category/ai/feed/', category: 'ai', source: 'VentureBeat AI' },
  { url: 'https://machinelearningmastery.com/feed/', category: 'ai', source: 'ML Mastery' },
  { url: 'https://www.kdnuggets.com/feed', category: 'ai', source: 'KDnuggets' },
  { url: 'https://towardsdatascience.com/feed', category: 'ai', source: 'Towards Data Science' },
  { url: 'https://ai.googleblog.com/feeds/posts/default', category: 'ai', source: 'Google AI Blog' },
  { url: 'https://blogs.nvidia.com/feed/', category: 'ai', source: 'NVIDIA Blog' },
  { url: 'https://huggingface.co/blog/feed.xml', category: 'ai', source: 'Hugging Face' },
  { url: 'https://www.deepmind.com/blog/rss.xml', category: 'ai', source: 'DeepMind' },
  { url: 'https://www.unite.ai/feed/', category: 'ai', source: 'Unite AI' },
  { url: 'https://theaibeat.com/feed/', category: 'ai', source: 'The AI Beat' },
  
  // ==================== GAMING (20+ sources) ====================
  { url: 'https://www.ign.com/rss/articles', category: 'gaming', source: 'IGN' },
  { url: 'https://kotaku.com/rss', category: 'gaming', source: 'Kotaku' },
  { url: 'https://www.gamespot.com/feeds/mashup/', category: 'gaming', source: 'GameSpot' },
  { url: 'https://www.polygon.com/rss/index.xml', category: 'gaming', source: 'Polygon' },
  { url: 'https://www.pcgamer.com/rss/', category: 'gaming', source: 'PC Gamer' },
  { url: 'https://www.eurogamer.net/feed', category: 'gaming', source: 'Eurogamer' },
  { url: 'https://www.rockpapershotgun.com/feed', category: 'gaming', source: 'Rock Paper Shotgun' },
  { url: 'https://www.gamesradar.com/rss/', category: 'gaming', source: 'GamesRadar' },
  { url: 'https://www.destructoid.com/feed/', category: 'gaming', source: 'Destructoid' },
  { url: 'https://www.vg247.com/feed', category: 'gaming', source: 'VG247' },
  { url: 'https://www.pushsquare.com/feeds/latest', category: 'gaming', source: 'Push Square' },
  { url: 'https://www.nintendolife.com/feeds/latest', category: 'gaming', source: 'Nintendo Life' },
  { url: 'https://www.purexbox.com/feeds/latest', category: 'gaming', source: 'Pure Xbox' },
  { url: 'https://www.dualshockers.com/feed/', category: 'gaming', source: 'DualShockers' },
  { url: 'https://www.siliconera.com/feed/', category: 'gaming', source: 'Siliconera' },
  { url: 'https://www.thegamer.com/feed/', category: 'gaming', source: 'TheGamer' },
  { url: 'https://www.videogameschronicle.com/feed/', category: 'gaming', source: 'VGC' },
  { url: 'https://www.gameinformer.com/rss.xml', category: 'gaming', source: 'Game Informer' },
  { url: 'https://www.playstationlifestyle.net/feed/', category: 'gaming', source: 'PlayStation Lifestyle' },
  { url: 'https://mp1st.com/feed', category: 'gaming', source: 'MP1st' },
  
  // ==================== ENTERTAINMENT (15+ sources) ====================
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'entertainment', source: 'BBC Entertainment' },
  { url: 'https://variety.com/feed/', category: 'entertainment', source: 'Variety' },
  { url: 'https://www.hollywoodreporter.com/feed/', category: 'entertainment', source: 'Hollywood Reporter' },
  { url: 'https://deadline.com/feed/', category: 'entertainment', source: 'Deadline' },
  { url: 'https://ew.com/feed/', category: 'entertainment', source: 'Entertainment Weekly' },
  { url: 'https://www.vulture.com/rss/index.xml', category: 'entertainment', source: 'Vulture' },
  { url: 'https://www.indiewire.com/feed/', category: 'entertainment', source: 'IndieWire' },
  { url: 'https://collider.com/feed/', category: 'entertainment', source: 'Collider' },
  { url: 'https://screenrant.com/feed/', category: 'entertainment', source: 'Screen Rant' },
  { url: 'https://www.slashfilm.com/feed/', category: 'entertainment', source: 'SlashFilm' },
  { url: 'https://www.cinemablend.com/rss/topic/news/all', category: 'entertainment', source: 'CinemaBlend' },
  { url: 'https://www.avclub.com/rss', category: 'entertainment', source: 'AV Club' },
  { url: 'https://www.rottentomatoes.com/rss/news/', category: 'entertainment', source: 'Rotten Tomatoes' },
  { url: 'https://www.comingsoon.net/feed', category: 'entertainment', source: 'ComingSoon' },
  { url: 'https://www.thewrap.com/feed/', category: 'entertainment', source: 'The Wrap' },
  
  // ==================== SPORTS (15+ sources) ====================
  { url: 'https://www.espn.com/espn/rss/news', category: 'sports', source: 'ESPN' },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'sports', source: 'BBC Sport' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', category: 'sports', source: 'NY Times Sports' },
  { url: 'https://www.cbssports.com/rss/headlines/', category: 'sports', source: 'CBS Sports' },
  { url: 'https://sports.yahoo.com/rss/', category: 'sports', source: 'Yahoo Sports' },
  { url: 'https://www.si.com/.rss/full/', category: 'sports', source: 'Sports Illustrated' },
  { url: 'https://bleacherreport.com/articles/feed', category: 'sports', source: 'Bleacher Report' },
  { url: 'https://www.sbnation.com/rss/index.xml', category: 'sports', source: 'SB Nation' },
  { url: 'https://deadspin.com/rss', category: 'sports', source: 'Deadspin' },
  { url: 'https://theathletic.com/feeds/rss/news/', category: 'sports', source: 'The Athletic' },
  { url: 'https://www.sportingnews.com/rss', category: 'sports', source: 'Sporting News' },
  { url: 'https://www.skysports.com/rss/12040', category: 'sports', source: 'Sky Sports' },
  { url: 'https://www.goal.com/feeds/en/news', category: 'sports', source: 'Goal' },
  { url: 'https://www.90min.com/posts.rss', category: 'sports', source: '90min' },
  
  // ==================== SCIENCE (15+ sources) ====================
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'science', source: 'BBC Science' },
  { url: 'https://www.sciencedaily.com/rss/all.xml', category: 'science', source: 'Science Daily' },
  { url: 'https://www.livescience.com/feeds/all', category: 'science', source: 'Live Science' },
  { url: 'https://www.nature.com/nature.rss', category: 'science', source: 'Nature' },
  { url: 'https://www.newscientist.com/feed/home/', category: 'science', source: 'New Scientist' },
  { url: 'https://www.scientificamerican.com/feed/', category: 'science', source: 'Scientific American' },
  { url: 'https://phys.org/rss-feed/', category: 'science', source: 'Phys.org' },
  { url: 'https://www.space.com/feeds/all', category: 'science', source: 'Space.com' },
  { url: 'https://www.sciencenews.org/feed', category: 'science', source: 'Science News' },
  { url: 'https://www.popsci.com/feed/', category: 'science', source: 'Popular Science' },
  { url: 'https://www.smithsonianmag.com/rss/science-nature/', category: 'science', source: 'Smithsonian' },
  { url: 'https://www.discovermagazine.com/rss/all', category: 'science', source: 'Discover Magazine' },
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'science', source: 'NASA' },
  { url: 'https://www.iflscience.com/rss', category: 'science', source: 'IFLScience' },
  { url: 'https://earthsky.org/feed/', category: 'science', source: 'EarthSky' },
  
  // ==================== HEALTH (12+ sources) ====================
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', category: 'health', source: 'BBC Health' },
  { url: 'https://www.webmd.com/rss/rss.aspx', category: 'health', source: 'WebMD' },
  { url: 'https://www.health.com/feed/', category: 'health', source: 'Health.com' },
  { url: 'https://www.medicalnewstoday.com/rss', category: 'health', source: 'Medical News Today' },
  { url: 'https://www.healthline.com/rss', category: 'health', source: 'Healthline' },
  { url: 'https://www.everydayhealth.com/rss/', category: 'health', source: 'Everyday Health' },
  { url: 'https://www.statnews.com/feed/', category: 'health', source: 'STAT News' },
  { url: 'https://khn.org/feed/', category: 'health', source: 'Kaiser Health News' },
  { url: 'https://www.menshealth.com/rss/all.xml/', category: 'health', source: 'Mens Health' },
  { url: 'https://www.womenshealthmag.com/rss/all.xml/', category: 'health', source: 'Womens Health' },
  { url: 'https://www.prevention.com/rss/all.xml/', category: 'health', source: 'Prevention' },
  { url: 'https://www.mindbodygreen.com/rss', category: 'health', source: 'MindBodyGreen' },
  
  // ==================== BUSINESS (12+ sources) ====================
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'business', source: 'BBC Business' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', category: 'business', source: 'NY Times Business' },
  { url: 'https://www.forbes.com/real-time/feed2/', category: 'business', source: 'Forbes' },
  { url: 'https://fortune.com/feed/', category: 'business', source: 'Fortune' },
  { url: 'https://www.businessinsider.com/rss', category: 'business', source: 'Business Insider' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'business', source: 'Bloomberg' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'business', source: 'CNBC' },
  { url: 'https://www.marketwatch.com/rss/topstories', category: 'business', source: 'MarketWatch' },
  { url: 'https://www.ft.com/rss/home', category: 'business', source: 'Financial Times' },
  { url: 'https://www.entrepreneur.com/latest.rss', category: 'business', source: 'Entrepreneur' },
  { url: 'https://www.inc.com/rss/', category: 'business', source: 'Inc' },
  { url: 'https://hbr.org/feed', category: 'business', source: 'Harvard Business Review' },
  
  // ==================== WORLD NEWS (12+ sources) ====================
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', source: 'BBC World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'world', source: 'NY Times World' },
  { url: 'https://www.theguardian.com/world/rss', category: 'world', source: 'The Guardian' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'world', source: 'Al Jazeera' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'world', source: 'Reuters' },
  { url: 'https://www.npr.org/rss/rss.php?id=1004', category: 'world', source: 'NPR World' },
  { url: 'https://www.washingtonpost.com/arcio/rss/category/world/', category: 'world', source: 'Washington Post' },
  { url: 'https://www.latimes.com/world/rss2.0.xml', category: 'world', source: 'LA Times World' },
  { url: 'https://abcnews.go.com/abcnews/internationalheadlines', category: 'world', source: 'ABC News' },
  { url: 'https://www.cbsnews.com/latest/rss/world', category: 'world', source: 'CBS News' },
  { url: 'https://www.dw.com/rss/en/top-stories/s-9097', category: 'world', source: 'DW News' },
  { url: 'https://www.france24.com/en/rss', category: 'world', source: 'France24' },
  
  // ==================== VIRAL/TRENDING (10+ sources) ====================
  { url: 'https://www.reddit.com/r/technology/.rss', category: 'viral', source: 'Reddit Tech' },
  { url: 'https://www.reddit.com/r/gaming/.rss', category: 'viral', source: 'Reddit Gaming' },
  { url: 'https://www.reddit.com/r/worldnews/.rss', category: 'viral', source: 'Reddit World' },
  { url: 'https://www.reddit.com/r/science/.rss', category: 'viral', source: 'Reddit Science' },
  { url: 'https://www.reddit.com/r/movies/.rss', category: 'viral', source: 'Reddit Movies' },
  { url: 'https://www.reddit.com/r/news/.rss', category: 'viral', source: 'Reddit News' },
  { url: 'https://www.reddit.com/r/gadgets/.rss', category: 'viral', source: 'Reddit Gadgets' },
  { url: 'https://www.reddit.com/r/entertainment/.rss', category: 'viral', source: 'Reddit Entertainment' },
  { url: 'https://www.buzzfeed.com/index.xml', category: 'viral', source: 'BuzzFeed' },
  { url: 'https://www.boredpanda.com/feed/', category: 'viral', source: 'Bored Panda' },
  { url: 'https://www.upworthy.com/feed', category: 'viral', source: 'Upworthy' },
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
// IMPORTANT: Free tier has 6,000 tokens per MINUTE limit!

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests (safe for 6K TPM)
let consecutiveRateLimits = 0;

async function rewriteWithGroq(article: NewsArticle, retryCount = 0): Promise<RewrittenArticle | null> {
  if (!GROQ_API_KEY) {
    console.log('⚠️  No GROQ_API_KEY found, using original content');
    return {
      title: article.title,
      excerpt: article.description,
      content: article.content || article.description,
    };
  }

  // Rate limiting - wait between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const waitTime = Math.max(0, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  if (waitTime > 0) {
    await new Promise(r => setTimeout(r, waitTime));
  }
  lastRequestTime = Date.now();

  // If we've hit too many rate limits, slow down even more
  if (consecutiveRateLimits >= 3) {
    console.log('⏳ Cooling down after rate limits (30s)...');
    await new Promise(r => setTimeout(r, 30000));
    consecutiveRateLimits = 0;
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

Respond ONLY with valid JSON (no markdown, no code blocks). Use escaped characters for newlines (\\n) and quotes (\\""):
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
          { role: 'system', content: 'You are a helpful assistant that outputs only valid JSON. Always escape special characters properly. Use \\n for newlines in strings.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8, // Slightly lower for more consistent JSON output
        max_tokens: 1500, // Reduced to help with rate limits
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      const errorMsg = data.error.message || data.error;
      
      // Handle rate limiting with retry
      if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
        consecutiveRateLimits++;
        
        // Extract wait time from error message if available
        const waitMatch = errorMsg.match(/try again in (\d+\.?\d*)s/i);
        const waitSeconds = waitMatch ? parseFloat(waitMatch[1]) : 5;
        
        if (retryCount < 2) {
          console.log(`⏳ Rate limited, waiting ${waitSeconds + 2}s then retry (${retryCount + 1}/2)...`);
          await new Promise(r => setTimeout(r, (waitSeconds + 2) * 1000));
          return rewriteWithGroq(article, retryCount + 1);
        }
        
        console.error('❌ Rate limit exceeded after retries, skipping article');
        return null;
      }
      
      console.error('❌ Groq error:', errorMsg);
      return null;
    }

    // Reset rate limit counter on success
    consecutiveRateLimits = 0;

    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response (clean up any markdown code blocks)
    let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Fix common JSON issues - remove control characters
    cleanedContent = cleanedContent
      .replace(/[\x00-\x1F\x7F]/g, (char: string) => {
        // Keep escaped versions, remove raw control chars
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return ' '; // Replace other control chars with space
      });
    
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Try to fix common JSON issues
      let fixedJson = jsonMatch[0]
        .replace(/\n/g, '\\n') // Escape literal newlines
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\\n\\n/g, '\\n'); // Avoid double escaping
      
      try {
        return JSON.parse(fixedJson);
      } catch {
        console.error('❌ JSON parse failed after fixes:', parseError);
        return null;
      }
    }
  } catch (error) {
    console.error('❌ Rewrite failed:', error);
    return null;
  }
}

// ============ FALLBACK GENZ REWRITE ============
// When AI fails, still add some GenZ flavor so we don't publish boring content
function fallbackGenZRewrite(article: NewsArticle): RewrittenArticle {
  const genZPrefixes = [
    "No cap, ", "Bestie, ", "Okay so like, ", "Not gonna lie, ", 
    "Fr fr, ", "Lowkey, ", "Highkey, ", "POV: ", "It's giving "
  ];
  const genZSuffixes = [
    " and honestly? We're here for it. 💅",
    " - no cap, this is wild. 🔥",
    " and it's lowkey iconic. ✨",
    " - the vibes are immaculate. 💫",
    " and we're not okay. 😭",
    " - slay or be slayed, bestie. 👑",
    " and that's on periodt. 💯"
  ];
  const emojis = ["🔥", "💀", "✨", "💅", "👀", "😭", "🫠", "💫", "👑", "🤯"];
  
  const randomPrefix = genZPrefixes[Math.floor(Math.random() * genZPrefixes.length)];
  const randomSuffix = genZSuffixes[Math.floor(Math.random() * genZSuffixes.length)];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  // Add emoji to title
  const title = `${article.title.slice(0, 55)} ${randomEmoji}`;
  
  // GenZ-ify the excerpt
  const excerpt = `${randomPrefix}${article.description.slice(0, 120)}...`;
  
  // Build content with GenZ flavor
  const content = `## The Tea ☕

${randomPrefix}${article.description}${randomSuffix}

## What's Actually Happening 👀

${article.content || article.description}

## The Vibe Check 💅

This whole situation is honestly giving main character energy. Whether you're here for it or not, it's definitely something to keep an eye on. Stay tuned bestie, we'll keep you updated! ✨

---
*your fave news source that actually gets it* 💕`;

  console.log('   🆘 Used fallback GenZ rewrite');
  return { title, excerpt, content };
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
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const publishedAt = now.toISOString();
  const filename = `${slug}.mdx`;
  const filepath = path.join(POSTS_DIR, filename);

  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping (exists): ${slug}`);
    return false;
  }

  const coolAuthors = [
    "your fave news bestie 💅",
    "certified yapper 🗣️",
    "the tea spiller ☕",
    "no cap correspondent 🧢",
    "vibes curator ✨",
    "main character energy 💫",
    "ur news bff 💕",
  ];
  const randomAuthor = coolAuthors[Math.floor(Math.random() * coolAuthors.length)];

  const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
excerpt: "${article.excerpt.replace(/"/g, '\\"')}"
category: "${category}"
date: ${date}
publishedAt: ${publishedAt}
image: "${image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'}"
author: "${randomAuthor}"
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
  console.log('🔥 TrustMeBro News Fetcher v2.1\n');
  console.log(`📊 Config: ${ARTICLES_PER_CATEGORY} articles per category, ${PAGE_SIZE} fetched per request\n`);
  console.log('⚡ Rate limiting: 5s between requests (Groq free tier: 6K TPM)\n');
  
  // Ensure posts directory exists
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  let totalSaved = 0;
  let totalProcessed = 0;
  let aiRewrites = 0;      // Track successful AI rewrites
  let fallbackRewrites = 0; // Track fallback rewrites (indicates AI issues)
  
  // Global limit to prevent rate limit issues
  const MAX_TOTAL_ARTICLES = 30;

  // ============ FETCH FROM NEWSAPI ============
  console.log('📡 === NEWSAPI SOURCES ===\n');
  
  for (const category of CATEGORIES) {
    if (totalSaved >= MAX_TOTAL_ARTICLES) {
      console.log(`\n🛑 Reached max articles limit (${MAX_TOTAL_ARTICLES}), stopping NewsAPI...`);
      break;
    }
    
    console.log(`\n📰 Fetching ${category} news...`);
    const articles = await fetchNews(category);
    console.log(`   Found ${articles.length} articles`);
    
    let categoryCount = 0;
    for (const article of articles) {
      if (categoryCount >= 2) break; // Reduced from 5 to 2 per category
      if (totalSaved >= MAX_TOTAL_ARTICLES) break;
      
      // Skip if we might already have this
      const potentialSlug = slugify(article.title);
      if (postExists(potentialSlug)) {
        console.log(`   ⏭️  Skipping (likely exists): ${article.title.slice(0, 40)}...`);
        continue;
      }
      
      console.log(`   📝 Processing: ${article.title.slice(0, 50)}...`);
      totalProcessed++;
      
      // Try AI rewrite, fallback to GenZ template if fails
      let rewritten = await rewriteWithGroq(article);
      let usedFallback = false;
      if (!rewritten) {
        rewritten = fallbackGenZRewrite(article);
        usedFallback = true;
        fallbackRewrites++;
      } else {
        aiRewrites++;
      }
      
      const saved = savePost(
        rewritten,
        CATEGORY_MAP[category] || 'world',
        article.source.name,
        article.urlToImage
      );
      if (saved) {
        totalSaved++;
        categoryCount++;
        console.log(`   ✅ Saved! (${totalSaved}/${MAX_TOTAL_ARTICLES})${usedFallback ? ' [FALLBACK]' : ''}`);
      }
    }
  }

  // ============ FETCH FROM RSS FEEDS ============
  console.log('\n\n📡 === RSS FEED SOURCES ===\n');
  
  for (const feed of RSS_FEEDS) {
    // Stop if we've saved enough articles
    if (totalSaved >= MAX_TOTAL_ARTICLES) {
      console.log(`\n🛑 Reached max articles limit (${MAX_TOTAL_ARTICLES}), stopping...`);
      break;
    }
    
    console.log(`\n🔗 Fetching ${feed.source}...`);
    const articles = await fetchRSS(feed.url);
    console.log(`   Found ${articles.length} articles`);
    
    let feedCount = 0;
    for (const article of articles) {
      if (feedCount >= 2) break; // Max 2 per RSS feed (reduced from 5)
      if (totalSaved >= MAX_TOTAL_ARTICLES) break;
      
      // Skip if we might already have this
      const potentialSlug = slugify(article.title);
      if (postExists(potentialSlug)) {
        continue;
      }
      
      console.log(`   📝 Processing: ${article.title.slice(0, 50)}...`);
      totalProcessed++;
      
      // Try AI rewrite, fallback to GenZ template if fails
      let rewritten = await rewriteWithGroq(article);
      let usedFallback = false;
      if (!rewritten) {
        rewritten = fallbackGenZRewrite(article);
        usedFallback = true;
        fallbackRewrites++;
      } else {
        aiRewrites++;
      }
      
      const saved = savePost(
        rewritten,
        feed.category,
        feed.source,
        article.urlToImage
      );
      if (saved) {
        totalSaved++;
        feedCount++;
        console.log(`   ✅ Saved! (${totalSaved}/${MAX_TOTAL_ARTICLES})${usedFallback ? ' [FALLBACK]' : ''}`);
      }
    }
  }

  // ============ SUMMARY ============
  console.log(`\n\n🎉 Done!`);
  console.log(`   📊 Processed: ${totalProcessed} articles`);
  console.log(`   ✅ Saved: ${totalSaved} new articles`);
  console.log(`\n   🤖 AI Rewrites: ${aiRewrites} (${totalSaved > 0 ? Math.round(aiRewrites/totalSaved*100) : 0}%)`);
  console.log(`   🆘 Fallback Rewrites: ${fallbackRewrites} (${totalSaved > 0 ? Math.round(fallbackRewrites/totalSaved*100) : 0}%)`);
  
  // Alert if too many fallbacks (indicates AI issues)
  if (fallbackRewrites > aiRewrites && totalSaved > 5) {
    console.log(`\n   ⚠️  WARNING: More fallbacks than AI rewrites!`);
    console.log(`   ⚠️  Check Groq API status or rate limits.`);
  }
  
  if (fallbackRewrites === 0 && totalSaved > 0) {
    console.log(`\n   ✨ Perfect run! All articles got full AI rewrites.`);
  }
}

main().catch(console.error);
