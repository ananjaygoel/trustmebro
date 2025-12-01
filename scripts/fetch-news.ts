/**
 * TrustMeBro News Fetcher v2.0
 * 
 * Fetches news from NewsAPI + RSS feeds and rewrites them in GenZ style using AI Pipe + Claude
 * Run with: npm run fetch-news
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ SANITIZATION ============
// Strip HTML tags and problematic content that breaks MDX
function sanitizeForMDX(text: string, keepNewlines = false): string {
  if (!text) return '';
  let result = text
    // Remove HTML comments (<!-- -->) - these BREAK MDX!
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove script/style tags and content
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove img tags with all their attributes (Reddit embeds)
    .replace(/img\s+src\s*=\s*["'][^"']*["'][^>]*/gi, '')
    // Remove ALL HTML tags completely (Reddit feeds have broken HTML like <a ##)
    .replace(/<[^>]*>/g, ' ')
    // Remove any remaining < or > that could break MDX
    .replace(/</g, '')
    .replace(/>/g, '')
    // Remove URLs that look like image embeds
    .replace(/https?:\/\/[^\s]*\.(jpg|jpeg|png|gif|webp)[^\s]*/gi, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x[0-9a-f]+;/gi, '')  // Hex entities like &#x2018;
    // Remove any remaining HTML entities
    .replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    // Remove Reddit-specific noise
    .replace(/submitted by \/u\/\w+/gi, '')
    .replace(/\[link\]/gi, '')
    .replace(/\[comments\]/gi, '')
    // Remove "alt=" and "title=" leftovers
    .replace(/alt\s*=\s*["'][^"']*["']/gi, '')
    .replace(/title\s*=\s*["'][^"']*["']/gi, '')
    .replace(/src\s*=\s*["'][^"']*["']/gi, '')
    // Clean up curly braces that might break MDX expressions
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    // Remove any stray # that could break MDX when combined with other chars
    .replace(/<\s*#/g, ' ')
    .replace(/#\s*>/g, ' ');
  
  if (keepNewlines) {
    // Clean up excessive whitespace but keep paragraph structure
    result = result.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  } else {
    // Single line - collapse all whitespace
    result = result.replace(/\s+/g, ' ').trim();
  }
  return result;
}

// ============ CONFIGURATION ============
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const POSTS_DIR = './src/content/posts';

// Articles per category - optimized for zero rate limits
// 12 articles × 15sec delay = ~3min per run, no fallbacks needed
const ARTICLES_PER_CATEGORY = 2;
const PAGE_SIZE = 10;

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
    
    // Sort by publishedAt date (most recent first)
    items.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return items;
  } catch (error) {
    console.error(`❌ Failed to fetch RSS ${feedUrl}:`, error);
    return [];
  }
}

// ============ REWRITE WITH GROQ (FREE - 14,400 req/day!) ============
// Uses Llama 3.1 8B via Groq API - blazing fast LPU inference
// IMPORTANT: Free tier has 6,000 tokens per MINUTE limit!

// Rate limiting state (minimal for Gemini - much more generous limits)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds is plenty for Gemini

async function rewriteWithGemini(article: NewsArticle, retryCount = 0): Promise<RewrittenArticle | null> {
  if (!GEMINI_API_KEY) {
    console.log('⚠️  No GEMINI_API_KEY found, skipping article');
    return null;
  }

  // Small delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const waitTime = Math.max(0, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  if (waitTime > 0) {
    await new Promise(r => setTimeout(r, waitTime));
  }
  lastRequestTime = Date.now();

  const prompt = `You are a senior journalist writing for TrustMeBro news site.

## SOURCE MATERIAL
Title: ${article.title}
Content: ${article.description} ${article.content || ''}

## CRITICAL FORMATTING RULES
- SHORT paragraphs only (2-3 sentences MAX per paragraph)
- Add a BLANK LINE between every paragraph
- Use bullet points for lists of 3+ items
- Break up long sections with subheadings
- Make it SCANNABLE — readers skim first, then read

## WRITING STYLE
- Conversational, like explaining to a smart friend
- Specific facts: names, numbers, dates
- No filler phrases ("In today's world", "It's worth noting")
- No walls of text — white space is your friend

## STRUCTURE (400-600 words total)

**Title**: Catchy but informative, under 60 characters

**Excerpt**: 100-140 characters, the hook

**Content** — Format EXACTLY like this with blank lines:

## What's Happening

First paragraph here. Keep it to 2-3 sentences only.

Second paragraph with more details. Again, short and punchy.

Third paragraph if needed. No more than 3 sentences.

## Why This Matters

Explain the real impact in 2-3 short paragraphs.

Each paragraph separated by blank lines.

Use bullet points if listing multiple impacts:
- First impact
- Second impact  
- Third impact

## The Bottom Line

One or two short paragraphs wrapping it up.

End with a question or forward-looking thought.

## OUTPUT FORMAT
Return ONLY valid JSON:
{"title": "Title Here", "excerpt": "Excerpt here", "content": "## What's Happening\\n\\nFirst paragraph.\\n\\nSecond paragraph.\\n\\n## Why This Matters\\n\\nExplanation here.\\n\\n## The Bottom Line\\n\\nWrap up here."}

IMPORTANT: Use \\n\\n (double newline) between EVERY paragraph for proper spacing!`;

  try {
    // Using gemini-2.5-flash (latest model)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096, // Generous limit for long articles
            topP: 0.95,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    // Log HTTP status for debugging
    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle errors
    if (data.error) {
      const errorMsg = data.error.message || JSON.stringify(data.error);
      console.log(`❌ API Error: ${errorMsg}`);
      
      // Retry on rate limit or quota
      if (errorMsg.includes('quota') || errorMsg.includes('rate') || errorMsg.includes('429') || response.status === 429) {
        if (retryCount < 2) {
          console.log(`⏳ Rate limited, waiting 10s then retry (${retryCount + 1}/2)...`);
          await new Promise(r => setTimeout(r, 10000));
          return rewriteWithGemini(article, retryCount + 1);
        }
        console.error('❌ Rate limit exceeded after retries');
        return null;
      }
      
      return null;
    }

    // Extract content from Gemini response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.log('❌ Empty response from Gemini');
      return null;
    }

    // Parse JSON from response
    let cleanedContent = content
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // Find JSON object
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ No JSON found in response');
      console.log('   Preview:', content.slice(0, 200));
      return null;
    }

    let jsonStr = jsonMatch[0];

    // Fix common JSON issues
    jsonStr = jsonStr
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/,(\s*[}\]])/g, '$1');

    try {
      const parsed = JSON.parse(jsonStr);
      
      // Validate we got substantial content
      const wordCount = parsed.content?.split(/\s+/).length || 0;
      if (wordCount < 200) {
        console.log(`⚠️  Article too short (${wordCount} words), retrying...`);
        if (retryCount < 1) {
          return rewriteWithGemini(article, retryCount + 1);
        }
      }
      
      console.log(`   ✨ Generated ${wordCount} words`);
      return parsed;
    } catch (parseError) {
      console.log('❌ JSON parse failed');
      console.log('   Preview:', jsonStr.slice(0, 200));
      return null;
    }
  } catch (error) {
    console.error('❌ Rewrite failed:', error);
    return null;
  }
}

// ============ HUMANIZE POST-PROCESSING ============
// Remove AI-sounding phrases and add natural variety
function humanizeContent(article: RewrittenArticle): RewrittenArticle {
  // Phrases that scream "AI wrote this"
  const aiPhrases: [RegExp, string][] = [
    [/\bIn today's (world|age|era|landscape)\b/gi, 'Right now'],
    [/\bIt's important to note that\b/gi, ''],
    [/\bAs we all know\b/gi, ''],
    [/\bIn a nutshell\b/gi, 'Basically'],
    [/\bAt the end of the day\b/gi, 'Ultimately'],
    [/\bmoving forward\b/gi, 'next'],
    [/\bThis begs the question\b/gi, 'This raises the question'],
    [/\bIt goes without saying\b/gi, ''],
    [/\bNeedless to say\b/gi, ''],
    [/\bLet's dive in\b/gi, ''],
    [/\bWithout further ado\b/gi, ''],
    [/\bBuckle up\b/gi, ''],
    [/\bHold onto your hats?\b/gi, ''],
    [/\bGame-changing\b/gi, 'significant'],
    [/\bRevolutionary\b/gi, 'major'],
    [/\bGroundbreaking\b/gi, 'notable'],
    [/\bexciting times\b/gi, 'interesting developments'],
    [/\bstakeholders\b/gi, 'people involved'],
    [/\binnovative solutions?\b/gi, 'new approaches'],
    [/\bsynergy\b/gi, 'collaboration'],
    [/\bleverage\b/gi, 'use'],
    [/\brobust\b/gi, 'strong'],
    [/\bseamless\b/gi, 'smooth'],
    [/\bholistic\b/gi, 'complete'],
    // GenZ overload cleanup
    [/\bno cap,?\s*/gi, ''],
    [/\bfr fr,?\s*/gi, ''],
    [/\bbestie,?\s*/gi, ''],
    [/\blowkey\s+/gi, ''],
    [/\bhighkey\s+/gi, ''],
    [/\bslayed\b/gi, 'nailed it'],
    [/\bslaying\b/gi, 'doing great'],
    [/\bslay\b/gi, 'impressive'],
    [/\bit's giving\b/gi, 'it feels like'],
    [/\brent free\b/gi, 'stuck in my head'],
    [/\bdelulu\b/gi, 'unrealistic'],
    [/💅/g, ''],
    [/✨{2,}/g, '✨'],
    [/🔥{2,}/g, '🔥'],
    [/😭{2,}/g, ''],
    // Clean up excessive punctuation
    [/!{2,}/g, '!'],
    [/\?{2,}/g, '?'],
    [/\.{4,}/g, '...'],
  ];

  let { title, excerpt, content } = article;

  // Apply replacements
  for (const [pattern, replacement] of aiPhrases) {
    title = title.replace(pattern, replacement);
    excerpt = excerpt.replace(pattern, replacement);
    content = content.replace(pattern, replacement);
  }

  // Clean up double spaces from removed phrases
  title = title.replace(/\s{2,}/g, ' ').trim();
  excerpt = excerpt.replace(/\s{2,}/g, ' ').trim();
  content = content.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  // Ensure title isn't too long after cleanup
  if (title.length > 70) {
    title = title.slice(0, 67) + '...';
  }

  return { title, excerpt, content };
}

// ============ FALLBACK REWRITE ============
// When AI fails, create a clean, readable summary
function fallbackRewrite(article: NewsArticle): RewrittenArticle | null {
  // Sanitize inputs to remove HTML that breaks MDX
  const cleanTitle = sanitizeForMDX(article.title);
  const cleanDescription = sanitizeForMDX(article.description);
  const cleanContent = sanitizeForMDX(article.content || article.description);
  
  // Check if we have enough content to work with
  const combinedContent = `${cleanTitle} ${cleanDescription} ${cleanContent}`;
  const wordCount = combinedContent.split(/\s+/).filter(w => w.length > 2).length;
  
  // Skip if source content is too thin (less than 20 meaningful words)
  if (wordCount < 20) {
    console.log(`   ⏭️ Skipping - insufficient source content (${wordCount} words)`);
    return null;
  }
  
  // Keep the original title (it's usually good enough)
  const title = cleanTitle.slice(0, 65);
  
  // Create a clean excerpt
  const excerpt = cleanDescription.length > 140 
    ? cleanDescription.slice(0, 137) + '...'
    : cleanDescription;
  
  // Build readable content with proper spacing
  const hasRealContent = cleanContent.length > cleanDescription.length + 50;
  
  // Split content into sentences for better formatting
  const sentences = cleanContent.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
  const formattedContent = sentences.length > 2 
    ? sentences.slice(0, 3).join(' ') + '\n\n' + sentences.slice(3, 6).join(' ')
    : cleanContent;
  
  const content = `## What's Happening

${cleanDescription}

${hasRealContent ? `## The Details

${formattedContent}

## Why It Matters

This story is worth watching. The implications could affect how we think about this topic going forward.

We'll continue to track developments and update you as we learn more.` : `## What We Know So Far

${cleanDescription}

More details are still emerging on this story.

## The Bottom Line

This is a developing situation. We'll keep you posted as more information becomes available.`}

## What's Next

Stay tuned for updates. Got thoughts? Drop them below.`;

  console.log('   📝 Used fallback rewrite (expanded summary)');
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

  // Skip if empty slug (broken title)
  if (!slug || slug.length < 3) {
    console.log(`⏭️  Skipping (invalid slug): ${article.title}`);
    return false;
  }

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

  // Final sanitization pass to catch any HTML that slipped through
  const safeTitle = sanitizeForMDX(article.title).replace(/"/g, '\\"');
  const safeExcerpt = sanitizeForMDX(article.excerpt).replace(/"/g, '\\"');
  const safeContent = sanitizeForMDX(article.content, true); // Keep newlines for content

  const frontmatter = `---
title: "${safeTitle}"
excerpt: "${safeExcerpt}"
category: "${category}"
date: ${date}
publishedAt: "${publishedAt}"
image: "${image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'}"
author: "${randomAuthor}"
source: "${source}"
featured: false
---

${safeContent}
`;

  fs.writeFileSync(filepath, frontmatter);
  console.log(`✅ Saved: ${filename}`);
  return true;
}

// ============ MAIN ============
async function main() {
  // Distribution settings - Gemini has generous limits!
  // 20 articles with 500-800 words each = real journalism
  const MAX_TOTAL_ARTICLES = 20;
  const ALL_CATEGORIES = ['tech', 'ai', 'gaming', 'business', 'entertainment', 'sports', 'science', 'health', 'world', 'viral'];
  const ARTICLES_PER_CATEGORY = Math.floor(MAX_TOTAL_ARTICLES / ALL_CATEGORIES.length); // 2 per category
  
  console.log('🔥 TrustMeBro News Fetcher v4.0 - Gemini Edition\n');
  console.log(`📊 Config: ${MAX_TOTAL_ARTICLES} articles × 500-800 words each\n`);
  console.log('✨ Powered by Google Gemini 1.5 Flash - no more rate limits!\n');
  
  // Ensure posts directory exists
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  let totalSaved = 0;
  let totalProcessed = 0;
  let aiRewrites = 0;      // Track successful AI rewrites
  let fallbackRewrites = 0; // Track fallback rewrites (indicates AI issues)
  
  // Track how many we've saved per category
  const categoryCounts: Record<string, number> = {};
  ALL_CATEGORIES.forEach(cat => categoryCounts[cat] = 0);

  // Group RSS feeds by category
  const feedsByCategory: Record<string, typeof RSS_FEEDS> = {};
  ALL_CATEGORIES.forEach(cat => feedsByCategory[cat] = []);
  RSS_FEEDS.forEach(feed => {
    if (feedsByCategory[feed.category]) {
      feedsByCategory[feed.category].push(feed);
    }
  });

  // Shuffle feeds within each category for variety EACH RUN
  // This ensures different feeds are used each time the workflow runs
  Object.values(feedsByCategory).forEach(feeds => {
    for (let i = feeds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [feeds[i], feeds[j]] = [feeds[j], feeds[i]];
    }
  });

  // Track which feed index to use next for each category (for round-robin within a run)
  const feedIndexByCategory: Record<string, number> = {};
  ALL_CATEGORIES.forEach(cat => feedIndexByCategory[cat] = 0);

  console.log(`📊 Target: ${ARTICLES_PER_CATEGORY} articles per category (${ALL_CATEGORIES.length} categories)`);
  console.log(`📡 RSS Feeds per category: ${Object.entries(feedsByCategory).map(([cat, feeds]) => `${cat}:${feeds.length}`).join(', ')}\n`);

  // ============ FETCH WITH TRUE VARIETY ============
  // For each category, we try different feeds until we get enough articles
  for (const category of ALL_CATEGORIES) {
    if (totalSaved >= MAX_TOTAL_ARTICLES) break;
    
    const feeds = feedsByCategory[category];
    if (!feeds || feeds.length === 0) continue;
    
    console.log(`\n📂 [${category.toUpperCase()}] Need ${ARTICLES_PER_CATEGORY} articles from ${feeds.length} available feeds`);
    
    // Try feeds one by one until we have enough articles for this category
    let feedsTried = 0;
    while (categoryCounts[category] < ARTICLES_PER_CATEGORY && feedsTried < feeds.length) {
      if (totalSaved >= MAX_TOTAL_ARTICLES) break;
      
      const feed = feeds[feedsTried];
      feedsTried++;
      
      console.log(`   🔗 Trying ${feed.source}...`);
      const articles = await fetchRSS(feed.url);
      
      if (articles.length === 0) {
        console.log(`   ⚠️  No articles from ${feed.source}`);
        continue;
      }
      
      // Try to get 1 article from this feed (variety = 1 per source)
      let gotOneFromThisFeed = false;
      for (const article of articles) {
        if (gotOneFromThisFeed) break; // Only 1 per feed for variety
        if (categoryCounts[category] >= ARTICLES_PER_CATEGORY) break;
        if (totalSaved >= MAX_TOTAL_ARTICLES) break;
        
        const potentialSlug = slugify(article.title);
        if (postExists(potentialSlug)) continue;
        
        console.log(`   📝 Processing: ${article.title.slice(0, 50)}...`);
        totalProcessed++;
        
        let rewritten = await rewriteWithGemini(article);
        let usedFallback = false;
        if (!rewritten) {
          rewritten = fallbackRewrite(article);
          if (!rewritten) {
            // Source content too thin, skip this article entirely
            continue;
          }
          usedFallback = true;
          fallbackRewrites++;
        } else {
          aiRewrites++;
        }
        
        // Apply humanize post-processing to remove AI-sounding phrases
        rewritten = humanizeContent(rewritten);
        
        const saved = savePost(
          rewritten,
          category,
          feed.source,
          article.urlToImage
        );
        if (saved) {
          totalSaved++;
          categoryCounts[category]++;
          gotOneFromThisFeed = true;
          console.log(`   ✅ Saved! [${category}: ${categoryCounts[category]}/${ARTICLES_PER_CATEGORY}] (Total: ${totalSaved}/${MAX_TOTAL_ARTICLES})${usedFallback ? ' [FALLBACK]' : ''}`);
        }
      }
    }
    
    if (categoryCounts[category] < ARTICLES_PER_CATEGORY) {
      console.log(`   ⚠️  Only got ${categoryCounts[category]}/${ARTICLES_PER_CATEGORY} for ${category} (tried ${feedsTried} feeds)`);
    }
  }

  // ============ SUMMARY ============
  console.log(`\n\n🎉 Done!`);
  console.log(`   📊 Processed: ${totalProcessed} articles`);
  console.log(`   ✅ Saved: ${totalSaved} new articles`);
  console.log(`\n   📁 Per Category:`);
  ALL_CATEGORIES.forEach(cat => {
    const count = categoryCounts[cat];
    const bar = '█'.repeat(count) + '░'.repeat(ARTICLES_PER_CATEGORY - count);
    console.log(`      ${cat.padEnd(15)} [${bar}] ${count}/${ARTICLES_PER_CATEGORY}`);
  });
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
