/**
 * Cleanup Script for Existing Articles
 * Fixes HTML junk, duplicate sentences, and thin content
 */

import * as fs from 'fs';
import * as path from 'path';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

// Category-specific context expanders (same as native-rewriter)
const CATEGORY_CONTEXT: Record<string, string[]> = {
  tech: [
    "This is part of the broader shift happening across the tech industry right now.",
    "Tech companies have been making moves like this as competition heats up.",
    "This could have major implications for how we use technology going forward.",
  ],
  ai: [
    "The AI space continues to evolve at a wild pace, with developments like this becoming more common.",
    "As AI capabilities expand, we're seeing more announcements like this reshape the industry.",
    "This adds to the ongoing AI race that's captivating the tech world.",
  ],
  gaming: [
    "The gaming community has been watching developments like this closely.",
    "This is the kind of news that gets gamers talking across social media.",
    "Gaming fans have strong opinions about moves like this, and for good reason.",
  ],
  business: [
    "This reflects broader trends we're seeing in the business world right now.",
    "Market watchers are paying close attention to developments like this.",
    "The business implications here could be significant in the coming months.",
  ],
  entertainment: [
    "Entertainment industry insiders have been buzzing about this.",
    "This is exactly the kind of news that gets fans excited or concerned.",
    "The entertainment world moves fast, and this is a prime example.",
  ],
  sports: [
    "Sports fans across the globe are reacting to this news.",
    "This could change the dynamics of the sport going forward.",
    "The sports world never stops delivering these kinds of storylines.",
  ],
  science: [
    "Scientists and researchers are watching this development closely.",
    "This could have implications for future research in this area.",
    "The scientific community tends to find developments like this significant.",
  ],
  health: [
    "Health experts are weighing in on what this means for people.",
    "This is the kind of health news that affects everyday decisions.",
    "Medical professionals are taking note of this development.",
  ],
  world: [
    "This is part of the larger geopolitical picture unfolding right now.",
    "International observers are watching how this situation develops.",
    "Global events like this tend to have ripple effects worldwide.",
  ],
  viral: [
    "The internet is doing what it does best - making this blow up everywhere.",
    "Social media has been going wild over this, as expected.",
    "This is exactly the kind of content that captures the internet's attention.",
  ],
};

function cleanContent(content: string): string {
  return content
    // Strip HTML tags and attributes
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/href="[^"]*"/gi, '')
    .replace(/src="[^"]*"/gi, '')
    .replace(/a href="[^"]*"/gi, '')
    // Remove broken URLs and image references
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\.[a-z]{3,4}\?[^\s]*/gi, '')
    // Fix weird characters
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function removeDuplicateSentences(content: string): string {
  const lines = content.split('\n');
  const seenSentences = new Set<string>();
  const cleanedLines: string[] = [];

  for (const line of lines) {
    // Keep markdown headers as-is
    if (line.startsWith('#')) {
      cleanedLines.push(line);
      continue;
    }

    // Split by sentences
    const sentences = line.match(/[^.!?]+[.!?]+/g) || [line];
    const uniqueSentences: string[] = [];

    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
      // Skip if we've seen this exact sentence or very similar
      if (normalized.length > 20 && !seenSentences.has(normalized)) {
        seenSentences.add(normalized);
        uniqueSentences.push(sentence);
      } else if (normalized.length <= 20) {
        uniqueSentences.push(sentence);
      }
    }

    if (uniqueSentences.length > 0) {
      cleanedLines.push(uniqueSentences.join(' ').trim());
    }
  }

  return cleanedLines.join('\n');
}

function getRandomContext(category: string): string {
  const contexts = CATEGORY_CONTEXT[category] || CATEGORY_CONTEXT['tech'];
  return contexts[Math.floor(Math.random() * contexts.length)];
}

function expandThinContent(content: string, title: string, category: string): string {
  const wordCount = content.split(/\s+/).length;
  
  // If content is too short, expand it
  if (wordCount < 100) {
    const cleanTitle = title.replace(/"/g, '').replace(/\.\.\.$/, '');
    
    const expandedContent = `## What's Happening

So basically, ${cleanTitle.toLowerCase()}. This news just dropped and people are already talking about it.

${getRandomContext(category)}

## Why This Matters

${getRandomContext(category)} ${getRandomContext(category)}

More details are expected to emerge as this story develops.

## The Bottom Line

This story is still unfolding, and we'll keep you updated as more information becomes available. What do you think about all this?`;
    
    return expandedContent;
  }
  
  return content;
}

function parseArticle(fileContent: string): { frontmatter: Record<string, string>; content: string } {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!match) {
    return { frontmatter: {}, content: fileContent };
  }

  const frontmatterStr = match[1];
  const content = match[2];

  // Parse frontmatter
  const frontmatter: Record<string, string> = {};
  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      let value = line.substring(colonIdx + 1).trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content };
}

function rebuildArticle(frontmatter: Record<string, string>, content: string): string {
  const lines = ['---'];
  
  // Rebuild frontmatter in order
  const orderedKeys = ['title', 'excerpt', 'category', 'date', 'publishedAt', 'image', 'author', 'source', 'featured'];
  
  for (const key of orderedKeys) {
    if (frontmatter[key] !== undefined) {
      let value = frontmatter[key];
      // Quote strings that need it
      if (key === 'title' || key === 'excerpt' || key === 'image' || key === 'author' || key === 'source' || key === 'publishedAt') {
        value = `"${value.replace(/"/g, '\\"')}"`;
      }
      lines.push(`${key}: ${value}`);
    }
  }
  
  lines.push('---');
  lines.push('');
  lines.push(content);
  
  return lines.join('\n');
}

async function cleanupArticle(filePath: string): Promise<{ cleaned: boolean; deleted: boolean; issues: string[] }> {
  const issues: string[] = [];
  let cleaned = false;
  let deleted = false;

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, content } = parseArticle(fileContent);
    
    let newContent = content;
    let newExcerpt = frontmatter.excerpt || '';
    const category = frontmatter.category || 'tech';
    const title = frontmatter.title || '';

    // Check for HTML junk
    if (/href=|<a |<img |&nbsp;|&quot;/.test(newContent) || /href=|<a |<img /.test(newExcerpt)) {
      issues.push('HTML junk');
      newContent = cleanContent(newContent);
      newExcerpt = cleanContent(newExcerpt);
      cleaned = true;
    }

    // Check for duplicate sentences
    const beforeDedupe = newContent;
    newContent = removeDuplicateSentences(newContent);
    if (newContent !== beforeDedupe) {
      issues.push('duplicate sentences');
      cleaned = true;
    }

    // Check for broken/garbage content
    if (newContent.includes('Jpeg?') || newContent.includes('.jpg?') || newContent.includes('.png?') ||
        newExcerpt.includes('href=') || newExcerpt.length < 20) {
      issues.push('broken content');
      
      // If excerpt is broken, generate new one
      if (newExcerpt.length < 20 || newExcerpt.includes('href=')) {
        newExcerpt = `${title.replace(/"/g, '').substring(0, 100)}... Here's what you need to know.`;
      }
      
      // Regenerate content if it's garbage
      const contentWordCount = newContent.split(/\s+/).filter(w => w.length > 2).length;
      if (contentWordCount < 30) {
        newContent = expandThinContent('', title, category);
      }
      cleaned = true;
    }

    // Check if content is too thin
    const wordCount = newContent.split(/\s+/).length;
    if (wordCount < 80) {
      issues.push('thin content');
      newContent = expandThinContent(newContent, title, category);
      cleaned = true;
    }

    // If still broken after cleanup, delete the file
    if (newContent.split(/\s+/).length < 50 || newExcerpt.length < 10) {
      fs.unlinkSync(filePath);
      deleted = true;
      return { cleaned: false, deleted: true, issues: [...issues, 'unfixable - deleted'] };
    }

    if (cleaned) {
      frontmatter.excerpt = newExcerpt;
      const newFileContent = rebuildArticle(frontmatter, newContent);
      fs.writeFileSync(filePath, newFileContent);
    }

    return { cleaned, deleted, issues };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return { cleaned: false, deleted: false, issues: ['error'] };
  }
}

async function main() {
  console.log('🧹 TrustMeBro Article Cleanup Script\n');

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  console.log(`📂 Found ${files.length} articles to check\n`);

  let cleanedCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const result = await cleanupArticle(filePath);

    if (result.deleted) {
      console.log(`🗑️  Deleted: ${file}`);
      console.log(`   Issues: ${result.issues.join(', ')}`);
      deletedCount++;
    } else if (result.cleaned) {
      console.log(`✅ Cleaned: ${file}`);
      console.log(`   Fixed: ${result.issues.join(', ')}`);
      cleanedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Cleaned: ${cleanedCount} articles`);
  console.log(`   🗑️  Deleted: ${deletedCount} articles`);
  console.log(`   ⏭️  Skipped (already clean): ${skippedCount} articles`);
}

main().catch(console.error);
