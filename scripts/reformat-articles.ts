/**
 * Reformat existing articles with proper paragraph breaks
 * Run with: npx tsx scripts/reformat-articles.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const POSTS_DIR = './src/content/posts';

function formatContent(content: string): string {
  if (!content) return '';
  
  let result = content;
  
  // Replace escaped newlines with actual newlines
  result = result.replace(/\\n/g, '\n');
  
  // Add blank line before ## headers (if not already there)
  result = result.replace(/([^\n])(##\s)/g, '$1\n\n$2');
  
  // Add blank line after ## header lines
  result = result.replace(/(##[^\n]+)\n([^\n])/g, '$1\n\n$2');
  
  // Split into lines and process
  const lines = result.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines - add only one
    if (!line) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      continue;
    }
    
    // Headers get blank line before and after
    if (line.startsWith('##')) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      processedLines.push(line);
      processedLines.push('');
      continue;
    }
    
    // Bullet points - keep as is
    if (line.startsWith('-') || line.startsWith('*')) {
      processedLines.push(line);
      continue;
    }
    
    // Regular paragraph - split if too long
    if (line.length > 400) {
      // Split at sentence boundaries
      const sentences = line.match(/[^.!?]+[.!?]+/g) || [line];
      let currentPara = '';
      
      for (const sentence of sentences) {
        if (currentPara.length + sentence.length > 300 && currentPara.length > 100) {
          processedLines.push(currentPara.trim());
          processedLines.push(''); // blank line between paragraphs
          currentPara = sentence;
        } else {
          currentPara += sentence;
        }
      }
      if (currentPara.trim()) {
        processedLines.push(currentPara.trim());
      }
    } else {
      processedLines.push(line);
    }
  }
  
  // Join and clean up
  result = processedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  
  return result;
}

function reformatArticle(filepath: string): boolean {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    
    // Split frontmatter and content
    const parts = content.split('---');
    if (parts.length < 3) {
      console.log(`⏭️  Skipping (no frontmatter): ${path.basename(filepath)}`);
      return false;
    }
    
    const frontmatter = parts[1];
    const body = parts.slice(2).join('---');
    
    // Format the body content
    const formattedBody = formatContent(body);
    
    // Check if formatting changed anything
    if (formattedBody.trim() === body.trim()) {
      return false; // No changes needed
    }
    
    // Reconstruct the file
    const newContent = `---${frontmatter}---\n\n${formattedBody}\n`;
    
    fs.writeFileSync(filepath, newContent);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filepath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Reformatting articles with proper paragraph breaks...\n');
  
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  console.log(`📁 Found ${files.length} articles\n`);
  
  let reformatted = 0;
  let unchanged = 0;
  
  for (const file of files) {
    const filepath = path.join(POSTS_DIR, file);
    if (reformatArticle(filepath)) {
      reformatted++;
      console.log(`✅ Reformatted: ${file}`);
    } else {
      unchanged++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Reformatted: ${reformatted}`);
  console.log(`   ⏭️  Unchanged: ${unchanged}`);
}

main();
