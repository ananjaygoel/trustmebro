/**
 * Fix articles to be ACTUALLY readable - short paragraphs like real news
 */

import * as fs from 'fs';
import * as path from 'path';

const POSTS_DIR = './src/content/posts';

function fixArticleContent(content: string): string {
  if (!content) return '';
  
  let result = content.trim();
  
  // CRITICAL: Split "## Header Text after" into "## Header\n\nText after"
  result = result.replace(/^(##\s*[A-Za-z][A-Za-z0-9\s'''\-,!?:]+?)([A-Z][a-z])/gm, '$1\n\n$2');
  
  // Also handle headers that run into the next sentence
  result = result.replace(/(##\s*[^\n]+?)([A-Z][a-z])/g, (match, header, nextChar) => {
    // Check if the header already ends properly
    if (header.trim().match(/[.!?:]$/)) return match;
    return header.trim() + '\n\n' + nextChar;
  });
  
  // Split into lines and process
  const lines = result.split('\n');
  const newLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines - add only one
    if (!trimmed) {
      if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push('');
      }
      continue;
    }
    
    // Keep headers as-is with spacing
    if (trimmed.startsWith('##')) {
      if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push('');
      }
      newLines.push(trimmed);
      newLines.push('');
      continue;
    }
    
    // Keep bullet points as-is
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      newLines.push(trimmed);
      continue;
    }
    
    // For regular text - split into ~2-3 sentence paragraphs
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    
    let currentPara = '';
    let sentenceCount = 0;
    
    for (const sentence of sentences) {
      currentPara += sentence.trim() + ' ';
      sentenceCount++;
      
      // Create paragraph every 2-3 sentences or at ~250 chars
      if (sentenceCount >= 2 && (sentenceCount >= 3 || currentPara.length > 200)) {
        newLines.push(currentPara.trim());
        newLines.push('');
        currentPara = '';
        sentenceCount = 0;
      }
    }
    
    // Don't forget remaining text
    if (currentPara.trim()) {
      newLines.push(currentPara.trim());
      newLines.push('');
    }
  }
  
  // Clean up multiple blank lines
  result = newLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  
  return result;
}

function fixArticle(filepath: string): boolean {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    
    // Split frontmatter and content
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      console.log(`⏭️  Skipping (no frontmatter): ${path.basename(filepath)}`);
      return false;
    }
    
    const frontmatter = match[1];
    const body = match[2];
    
    // Fix the body content
    const fixedBody = fixArticleContent(body);
    
    // Check if we made changes
    if (fixedBody.trim() === body.trim()) {
      return false;
    }
    
    // Reconstruct
    const newContent = `---\n${frontmatter}\n---\n\n${fixedBody}\n`;
    
    fs.writeFileSync(filepath, newContent);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${filepath}`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing articles with proper paragraph breaks...\n');
  
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  console.log(`📁 Found ${files.length} articles\n`);
  
  let fixed = 0;
  
  for (const file of files) {
    const filepath = path.join(POSTS_DIR, file);
    if (fixArticle(filepath)) {
      fixed++;
      console.log(`✅ Fixed: ${file}`);
    }
  }
  
  console.log(`\n📊 Fixed ${fixed} articles`);
}

main();
