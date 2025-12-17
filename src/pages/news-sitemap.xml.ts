import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');
  
  // Get only articles from last 2 days (Google News prefers very recent content)
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const recentPosts = posts
    .filter(post => post.data.date >= twoDaysAgo)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  
  const siteName = 'TrustMeBro';
  const siteUrl = context.site || 'https://trustmebro.pro';
  
  const items = recentPosts.map(post => {
    const pubDate = post.data.publishedAt 
      ? new Date(post.data.publishedAt) 
      : post.data.date;
    
    // Format date as YYYY-MM-DD for Google News
    const formattedDate = pubDate.toISOString().split('T')[0];
    
    return `
    <url>
      <loc>${siteUrl}/posts/${post.slug}/</loc>
      <news:news>
        <news:publication>
          <news:name>${siteName}</news:name>
          <news:language>en</news:language>
        </news:publication>
        <news:publication_date>${pubDate.toISOString()}</news:publication_date>
        <news:title>${escapeXml(post.data.title)}</news:title>
      </news:news>
    </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new Response(xml.trim(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
