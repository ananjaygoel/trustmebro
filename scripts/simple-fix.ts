/**
 * SIMPLE FIX: Add line breaks after headers and split paragraphs
 */

import * as fs from 'fs';
import * as path from 'path';

const POSTS_DIR = './src/content/posts';

function fixContent(text: string): string {
  // Step 1: Fix "## Header Text immediately after" pattern
  // Add newline after headers like "## What's Happening" when followed by uppercase
  let result = text;
  
  // Match ## followed by header text, then immediately followed by text starting with uppercase
  // Common headers: What's Happening, Why This Matters, The Bottom Line, The Tea, etc.
  result = result.replace(
    /^(## (?:What's Happening|Why This Matters|The Bottom Line|The Tea|Key Points|What to Know|Looking Ahead|The Vibe Check|Details|The News|Update))(\s+)([A-Z])/gm,
    '$1\n\n$3'
  );
  
  // Now split each paragraph into shorter ones (2-3 sentences each)
  const lines = result.split('\n');
  const output: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Empty line - keep one
    if (!trimmed) {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      continue;
    }
    
    // Header - add spacing
    if (trimmed.startsWith('##')) {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      output.push(trimmed);
      output.push('');
      continue;
    }
    
    // Bullet point - keep as is
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      output.push(trimmed);
      continue;
    }
    
    // Regular paragraph - split into 2-3 sentence chunks
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    let chunk = '';
    let count = 0;
    
    for (const sentence of sentences) {
      chunk += sentence.trim() + ' ';
      count++;
      
      // Every 2-3 sentences or ~200 chars, make a new paragraph
      if (count >= 2 && (count >= 3 || chunk.length > 180)) {
        output.push(chunk.trim());
        output.push('');
        chunk = '';
        count = 0;
      }
    }
    
    // Remaining text
    if (chunk.trim()) {
      output.push(chunk.trim());
      output.push('');
    }
  }
  
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function processFile(filepath: string): boolean {
  const content = fs.readFileSync(filepath, 'utf-8');
  
  // Split frontmatter and body
  const parts = content.match(/^(---\n[\s\S]*?\n---)\n([\s\S]*)$/);
  if (!parts) return false;
  
  const frontmatter = parts[1];
  const body = parts[2];
  
  const fixed = fixContent(body);
  
  // Only save if changed
  if (fixed === body.trim()) return false;
  
  fs.writeFileSync(filepath, `${frontmatter}\n\n${fixed}\n`);
  return true;
}

// Main
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
let count = 0;

for (const f of files) {
  if (processFile(path.join(POSTS_DIR, f))) {
    count++;
    process.stdout.write('.');
  }
}

console.log(`\n✅ Fixed ${count} articles`);
