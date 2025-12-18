#!/usr/bin/env python3
"""
Fix YAML frontmatter issues in MDX files
"""

import os
import re
import glob

def fix_frontmatter(filepath):
    """Fix common YAML frontmatter issues"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file has frontmatter
    if not content.startswith('---'):
        return False
    
    # Split frontmatter and body
    parts = content.split('---', 2)
    if len(parts) < 3:
        return False
    
    frontmatter = parts[1]
    body = parts[2]
    
    original_frontmatter = frontmatter
    
    # Fix common issues:
    
    # 1. Fix single quotes containing apostrophes - switch to double quotes
    lines = frontmatter.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Check for fields that might have quote issues
        if ':' in line:
            key, _, value = line.partition(':')
            value = value.strip()
            
            # If value starts with single quote and contains apostrophe
            if value.startswith("'") and value.endswith("'"):
                inner = value[1:-1]
                if "'" in inner:
                    # Switch to double quotes and escape any double quotes inside
                    inner = inner.replace('"', '\\"')
                    value = f'"{inner}"'
                    line = f"{key}: {value}"
            
            # If value starts with double quote and has issues
            elif value.startswith('"') and value.endswith('"'):
                inner = value[1:-1]
                # Remove any backslash escapes that aren't needed
                inner = inner.replace("\\'", "'")
                value = f'"{inner}"'
                line = f"{key}: {value}"
        
        fixed_lines.append(line)
    
    frontmatter = '\n'.join(fixed_lines)
    
    # 2. Ensure publishedAt exists
    if 'publishedAt:' not in frontmatter:
        # Find date field and add publishedAt after it
        date_match = re.search(r'date:\s*(\d{4}-\d{2}-\d{2})', frontmatter)
        if date_match:
            date_str = date_match.group(1)
            frontmatter = frontmatter.replace(
                f'date: {date_str}',
                f'date: {date_str}\npublishedAt: "{date_str}T12:00:00.000Z"'
            )
    
    if frontmatter != original_frontmatter:
        new_content = f'---{frontmatter}---{body}'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    
    return False

def main():
    print("🔧 Fixing YAML frontmatter issues...\n")
    
    fixed_count = 0
    error_files = []
    
    for filepath in glob.glob('src/content/posts/*.mdx'):
        try:
            if fix_frontmatter(filepath):
                print(f"✅ Fixed: {os.path.basename(filepath)}")
                fixed_count += 1
        except Exception as e:
            error_files.append((filepath, str(e)))
            print(f"❌ Error: {os.path.basename(filepath)} - {e}")
    
    print(f"\n📊 Summary:")
    print(f"   Fixed: {fixed_count} files")
    print(f"   Errors: {len(error_files)} files")
    
    if error_files:
        print("\n❌ Files with errors:")
        for f, e in error_files:
            print(f"   {os.path.basename(f)}: {e}")

if __name__ == '__main__':
    main()
