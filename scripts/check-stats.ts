/**
 * TrustMeBro Stats Checker
 * Run: npx tsx scripts/check-stats.ts
 * 
 * Displays site stats, article counts, and recent activity
 */

import * as fs from 'fs';
import * as path from 'path';

const POSTS_DIR = './src/content/posts';
const API_TRACKER = './src/content/.api-tracker.json';
const SOCIAL_LOG = './src/content/.social-posted.json';
const SITE_URL = 'https://sparkly-flan-50adeb.netlify.app';

interface ArticleStats {
  total: number;
  byCategory: Record<string, number>;
  byDate: Record<string, number>;
  recentArticles: { title: string; date: string; category: string }[];
}

interface ApiTracker {
  date: string;
  hour: number;
  dailyCalls: number;
  hourlyCalls: number;
  lastReset: string;
}

function getArticleStats(): ArticleStats {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  const byCategory: Record<string, number> = {};
  const byDate: Record<string, number> = {};
  const articles: { title: string; date: string; category: string; publishedAt: Date }[] = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      
      const title = frontmatter.match(/title:\s*"([^"]+)"/)?.[1] || file;
      const category = frontmatter.match(/category:\s*"?([^"\n]+)"?/)?.[1]?.trim() || 'unknown';
      const date = frontmatter.match(/date:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || 'unknown';
      const publishedAt = frontmatter.match(/publishedAt:\s*"([^"]+)"/)?.[1];
      
      byCategory[category] = (byCategory[category] || 0) + 1;
      byDate[date] = (byDate[date] || 0) + 1;
      
      articles.push({
        title,
        date,
        category,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(0)
      });
    } catch (e) {
      // Skip broken files
    }
  }
  
  // Sort by publishedAt descending
  articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  
  return {
    total: files.length,
    byCategory,
    byDate,
    recentArticles: articles.slice(0, 10).map(a => ({
      title: a.title.slice(0, 50) + (a.title.length > 50 ? '...' : ''),
      date: a.date,
      category: a.category
    }))
  };
}

function getApiTracker(): ApiTracker | null {
  try {
    return JSON.parse(fs.readFileSync(API_TRACKER, 'utf-8'));
  } catch {
    return null;
  }
}

function getSocialStats(): { twitter: number; bluesky: number } {
  try {
    const log = JSON.parse(fs.readFileSync(SOCIAL_LOG, 'utf-8'));
    return {
      twitter: log.twitter?.length || 0,
      bluesky: log.bluesky?.length || 0
    };
  } catch {
    return { twitter: 0, bluesky: 0 };
  }
}

async function checkSiteStatus(): Promise<{ status: number; ok: boolean }> {
  try {
    const res = await fetch(SITE_URL, { method: 'HEAD' });
    return { status: res.status, ok: res.ok };
  } catch {
    return { status: 0, ok: false };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 TRUSTMEBRO STATS DASHBOARD');
  console.log('='.repeat(60) + '\n');
  
  // Site Status
  console.log('🌐 SITE STATUS');
  console.log('-'.repeat(40));
  const siteStatus = await checkSiteStatus();
  console.log(`   URL: ${SITE_URL}`);
  console.log(`   Status: ${siteStatus.ok ? '✅ ONLINE' : '❌ OFFLINE'} (HTTP ${siteStatus.status})`);
  
  // Article Stats
  console.log('\n📰 ARTICLE STATS');
  console.log('-'.repeat(40));
  const stats = getArticleStats();
  console.log(`   Total Articles: ${stats.total}`);
  
  console.log('\n   By Category:');
  const sortedCategories = Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCategories) {
    const bar = '█'.repeat(Math.min(count, 30));
    console.log(`      ${cat.padEnd(15)} ${bar} ${count}`);
  }
  
  console.log('\n   Recent 7 Days:');
  const last7Days = Object.entries(stats.byDate)
    .filter(([date]) => {
      const d = new Date(date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    })
    .sort((a, b) => b[0].localeCompare(a[0]));
  
  for (const [date, count] of last7Days) {
    console.log(`      ${date}: ${count} articles`);
  }
  
  // API Usage
  console.log('\n🤖 GEMINI API USAGE');
  console.log('-'.repeat(40));
  const apiTracker = getApiTracker();
  if (apiTracker) {
    console.log(`   Date: ${apiTracker.date}`);
    console.log(`   Daily Calls: ${apiTracker.dailyCalls}/100`);
    console.log(`   Hourly Calls: ${apiTracker.hourlyCalls}/30`);
    console.log(`   Last Reset: ${apiTracker.lastReset}`);
  } else {
    console.log('   No API tracker data found');
  }
  
  // Social Media
  console.log('\n📱 SOCIAL MEDIA');
  console.log('-'.repeat(40));
  const social = getSocialStats();
  console.log(`   Twitter Posts: ${social.twitter}`);
  console.log(`   Bluesky Posts: ${social.bluesky}`);
  if (social.twitter === 0 && social.bluesky === 0) {
    console.log('   ⚠️  No social posts recorded - check credentials!');
  }
  
  // Recent Articles
  console.log('\n📝 RECENT ARTICLES');
  console.log('-'.repeat(40));
  for (const article of stats.recentArticles) {
    console.log(`   [${article.category}] ${article.title}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Run: npx tsx scripts/check-stats.ts');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
