import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');
  
  // Get only articles from last 3 days for Google News
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const recentPosts = posts
    .filter(post => post.data.date >= threeDaysAgo)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  
  return rss({
    title: 'TrustMeBro - Latest News',
    description: 'Latest GenZ news updates from TrustMeBro. Fresh articles from the last 3 days.',
    site: context.site || 'https://trustmebro.pro',
    items: recentPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt ? new Date(post.data.publishedAt) : post.data.date,
      description: post.data.excerpt,
      link: `/posts/${post.slug}/`,
      categories: [post.data.category],
      author: post.data.author,
    })),
    customData: `<language>en-us</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<ttl>60</ttl>`,
  });
}
