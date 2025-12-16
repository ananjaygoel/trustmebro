import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');
  const sortedPosts = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  
  return rss({
    title: 'TrustMeBro - News That Hits Different',
    description: 'GenZ news that actually slaps. No cap, just facts (probably). 🔥',
    site: context.site || 'https://trustmebro.pro',
    items: sortedPosts.slice(0, 1000).map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      link: `/posts/${post.slug}/`,
      categories: [post.data.category],
      author: post.data.author,
    })),
    customData: `<language>en-us</language>`,
  });
}
