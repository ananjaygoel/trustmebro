/**
 * Fix articles PROPERLY - short paragraphs, proper headers
 */

import * as fs from 'fs';
import * as path from 'path';

const POSTS_DIR = './src/content/posts';

function fixArticleContent(content: string): string {
  if (!content) return '';
  
  let result = content.trim();
  
  // Fix headers like "## What's Happening Some text here" -> "## What's Happening\n\nSome text here"
  // Match ## followed by header words, then a sentence starting with capital letter
  result = result.replace(/##\s*(What's Happening|Why This Matters|The Bottom Line|The Tea|The Vibe Check|Key Points|What You Need to Know|Looking Ahead|Final Thoughts)(\s*)([A-Z])/gi, 
    (match, header, space, firstChar) => {
      return `## ${header}\n\n${firstChar}`;
    }
  );
  
  // Generic fix: ## HeaderWords followed immediately by sentence
  result = result.replace(/##\s*([A-Za-z][A-Za-z'\s]{2,30}?)([A-Z][a-z]{2,})/g, 
    (match, header, nextWord) => {
      // Only split if header looks complete (ends with common header endings)
      const headerTrim = header.trim();
      if (headerTrim.match(/(Happening|Matters|Line|Tea|Check|Points|Know|Ahead|Thoughts|News|Update|Details)$/i)) {
        return `## ${headerTrim}\n\n${nextWord}`;
      }
      return match;
    }
  );
  
  // Split into lines
  const lines = result.split('\n');
  const newLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty
    if (!trimmed) {
      if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push('');
      }
      continue;
    }
    
    // Headers
    if (trimmed.startsWith('##')) {
      if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push('');
      }
      newLines.push(trimmed);
      newLines.push('');
      continue;
    }
    
    // Bullets
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      newLines.push(trimmed);
      continue;
    }
    
    // Regular text - split at 2-3 sentences
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    let para = '';
    let count = 0;
    
    for (const s of sentences) {
      para += s.trim() + ' ';
      count++;
      
      if (count >= 2 && (count >= 3 || para.length > 200)) {
        newLines.push(para.trim());
        newLines.push('');
        para = '';
        count = 0;
      }
    }
    
    if (para.trim()) {
      newLines.push(para.trim());
      newLines.push('');
    }
  }
  
  return newLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function fixArticle(filepath: string): boolean {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return false;
    
    const frontmatter = match[1];
    const body = match[2];
    const fixedBody = fixArticleContent(body);
    
    if (fixedBody.trim() === body.trim()) return false;
    
    fs.writeFileSync(filepath, `---\n${frontmatter}\n---\n\n${fixedBody}\n`);
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  let fixed = 0;
  
  for (const file of files) {
    if (fixArticle(path.join(POSTS_DIR, file))) {
      fixed++;
      console.log(`✅ ${file}`);
    }
  }
  
  console.log(`\n📊 Fixed ${fixed} articles`);
}

main();
