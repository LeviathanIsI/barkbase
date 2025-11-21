#!/usr/bin/env python3
"""
Fix the ACTUAL remaining issues:
1. Select elements without backgrounds
2. Gradients like from-blue-50 to-indigo-50 without dark variants
"""
import re
from pathlib import Path

def fix_select_backgrounds(line):
    """Add bg-white dark:bg-surface-primary to select elements"""
    # Match <select with className but NO bg- class
    pattern = r'(<select\s+[^>]*className="[^"]*?)(")'

    def add_bg(match):
        classes = match.group(1)
        # Only add if no bg- class present
        if 'bg-' not in classes:
            return classes + ' bg-white dark:bg-surface-primary' + match.group(2)
        return match.group(0)

    return re.sub(pattern, add_bg, line)

def fix_gradients(line):
    """Add dark variants to gradient backgrounds"""
    gradients = [
        # Blue/indigo gradients
        (r'from-blue-50 to-indigo-50(?!\s+dark:)', 'from-blue-50 to-indigo-50 dark:from-surface-primary dark:to-surface-primary'),
        (r'from-blue-50 to-blue-100(?!\s+dark:)', 'from-blue-50 to-blue-100 dark:from-surface-primary dark:to-surface-secondary'),

        # Purple/blue gradients
        (r'from-purple-50 to-blue-50(?!\s+dark:)', 'from-purple-50 to-blue-50 dark:from-surface-primary dark:to-surface-primary'),

        # Green gradients
        (r'from-green-50 to-blue-50(?!\s+dark:)', 'from-green-50 to-blue-50 dark:from-surface-primary dark:to-surface-primary'),
        (r'from-green-50 to-emerald-50(?!\s+dark:)', 'from-green-50 to-emerald-50 dark:from-surface-primary dark:to-surface-primary'),

        # Yellow/orange gradients
        (r'from-yellow-50 to-orange-50(?!\s+dark:)', 'from-yellow-50 to-orange-50 dark:from-surface-primary dark:to-surface-primary'),
    ]

    for pattern, replacement in gradients:
        line = re.sub(pattern, replacement, line)

    return line

def fix_file(filepath):
    """Fix a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Split into lines to preserve structure
        lines = content.split('\n')
        new_lines = []

        for line in lines:
            line = fix_select_backgrounds(line)
            line = fix_gradients(line)
            new_lines.append(line)

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
    print("FIXING REMAINING ISSUES")
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
