#!/usr/bin/env python3
"""
Comprehensive dark mode fix - find and fix ALL instances missing dark variants
"""
import re
from pathlib import Path

def fix_line(line):
    """Apply all dark mode fixes to a line"""
    original = line

    # 1. Add backgrounds to input/select/textarea elements without them
    # Match input/select/textarea with className but NO bg- class
    for tag in ['input', 'select', 'textarea']:
        pattern = rf'(<{tag}\s+[^>]*className="[^"]*?)(")'

        def add_bg(match):
            classes = match.group(1)
            # Skip if already has bg- class
            if 'bg-' in classes:
                return match.group(0)
            # Add background before closing quote
            return classes + ' bg-white dark:bg-surface-primary' + match.group(2)

        line = re.sub(pattern, add_bg, line)

    # 2. Fix text-white without dark variant (but skip if in special contexts)
    # Pattern: text-white not followed by dark:text-
    if 'text-white' in line and 'dark:text-' not in line:
        # Add dark variant after text-white
        line = re.sub(
            r'\btext-white\b(?!\s+dark:)',
            'text-white dark:text-white',
            line
        )

    # 3. Fix bg-primary-50 without dark variant
    if 'bg-primary-50' in line and 'dark:bg-' not in line:
        line = re.sub(
            r'\bbg-primary-50\b(?!\s+dark:)',
            'bg-primary-50 dark:bg-surface-primary/30',
            line
        )

    # 4. Fix border-gray-300 without dark variant
    if 'border-gray-300' in line and 'dark:border-' not in line:
        line = re.sub(
            r'\bborder-gray-300\b(?!\s+dark:)',
            'border-gray-300 dark:border-surface-border',
            line
        )

    # 5. Fix text-gray-600 without dark variant
    if 'text-gray-600' in line and 'dark:text-' not in line:
        line = re.sub(
            r'\btext-gray-600\b(?!\s+dark:)',
            'text-gray-600 dark:text-text-secondary',
            line
        )

    # 6. Fix text-gray-700 without dark variant
    if 'text-gray-700' in line and 'dark:text-' not in line:
        line = re.sub(
            r'\btext-gray-700\b(?!\s+dark:)',
            'text-gray-700 dark:text-text-primary',
            line
        )

    # 7. Fix text-gray-800 without dark variant
    if 'text-gray-800' in line and 'dark:text-' not in line:
        line = re.sub(
            r'\btext-gray-800\b(?!\s+dark:)',
            'text-gray-800 dark:text-text-primary',
            line
        )

    # 8. Fix bg-blue-50, bg-green-50, etc. without dark variants (for colored info boxes)
    color_patterns = [
        (r'\bbg-blue-50\b(?!\s+dark:)', 'bg-blue-50 dark:bg-blue-950/20'),
        (r'\bbg-green-50\b(?!\s+dark:)', 'bg-green-50 dark:bg-green-950/20'),
        (r'\bbg-red-50\b(?!\s+dark:)', 'bg-red-50 dark:bg-red-950/20'),
        (r'\bbg-yellow-50\b(?!\s+dark:)', 'bg-yellow-50 dark:bg-yellow-950/20'),
        (r'\bbg-purple-50\b(?!\s+dark:)', 'bg-purple-50 dark:bg-purple-950/20'),
        (r'\bbg-orange-50\b(?!\s+dark:)', 'bg-orange-50 dark:bg-orange-950/20'),
    ]

    for pattern, replacement in color_patterns:
        line = re.sub(pattern, replacement, line)

    return line

def fix_file(filepath):
    """Fix a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        lines = content.split('\n')
        new_lines = []

        for line in lines:
            new_lines.append(fix_line(line))

        content = '\n'.join(new_lines)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False

    except Exception as e:
        print(f"ERROR: {filepath}: {e}")
        return False

def main():
    frontend_dir = Path('D:/barkbase-react/frontend/src')

    print("=" * 80)
    print("COMPREHENSIVE DARK MODE FIX")
    print("=" * 80)
    print()

    total_files = 0
    updates = []

    for jsx_file in frontend_dir.rglob('*.jsx'):
        if '__tests__' in str(jsx_file) or '.test.' in str(jsx_file):
            continue

        if fix_file(jsx_file):
            total_files += 1
            rel_path = jsx_file.relative_to(frontend_dir)
            updates.append(str(rel_path))
            print(f"[OK] {rel_path}")

    print()
    print("=" * 80)
    print(f"Files updated: {total_files}")
    print("=" * 80)

    return total_files

if __name__ == '__main__':
    main()
