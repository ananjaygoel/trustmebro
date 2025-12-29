/**
 * Shared constants for TrustMeBro application
 * Centralized category definitions to ensure consistency across all pages
 */

/**
 * Category emoji mappings for all content categories
 * Used throughout the site for visual category indicators
 */
export const categoryEmojis: Record<string, string> = {
  tech: '💻',
  ai: '🤖',
  gaming: '🎮',
  entertainment: '🎬',
  science: '🔬',
  viral: '🔥',
  health: '🏥',
  sports: '⚽',
  business: '💰',
  politics: '🏛️',
  world: '🌍',
  lifestyle: '✨',
};

/**
 * Category metadata with name, emoji, and slug
 * Used for navigation and category pages
 */
export const categories = [
  { name: 'Tech', emoji: '💻', slug: 'tech' },
  { name: 'AI', emoji: '🤖', slug: 'ai' },
  { name: 'Gaming', emoji: '🎮', slug: 'gaming' },
  { name: 'Entertainment', emoji: '🎬', slug: 'entertainment' },
  { name: 'Science', emoji: '🔬', slug: 'science' },
  { name: 'Viral', emoji: '🔥', slug: 'viral' },
  { name: 'Health', emoji: '🏥', slug: 'health' },
  { name: 'Sports', emoji: '⚽', slug: 'sports' },
  { name: 'Business', emoji: '💰', slug: 'business' },
  { name: 'Politics', emoji: '🏛️', slug: 'politics' },
  { name: 'World', emoji: '🌍', slug: 'world' },
  { name: 'Lifestyle', emoji: '✨', slug: 'lifestyle' },
] as const;

/**
 * Get emoji for a category, with fallback
 */
export function getCategoryEmoji(category: string): string {
  return categoryEmojis[category.toLowerCase()] || '📰';
}
