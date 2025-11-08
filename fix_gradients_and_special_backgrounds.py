#!/usr/bin/env python3
"""
Fix gradient backgrounds and special colored backgrounds for dark mode
"""
import re
from pathlib import Path

FIXES = [
    # Gradient backgrounds (purple/pink promo cards)
    (r'bg-gradient-to-r from-purple-50 to-pink-50', 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-surface-primary dark:to-surface-primary'),
    (r'border-purple-200(?!\s+dark:)', 'border-purple-200 dark:border-purple-900/30'),

    # Blue info/warning boxes
    (r'bg-blue-50(?!\s+dark:)', 'bg-blue-50 dark:bg-blue-950/20'),
    (r'border-blue-200(?!\s+dark:)', 'border-blue-200 dark:border-blue-900/30'),
    (r'text-blue-900(?!\s+dark:)', 'text-blue-900 dark:text-blue-100'),
    (r'text-blue-800(?!\s+dark:)', 'text-blue-800 dark:text-blue-200'),
    (r'text-blue-700(?!\s+dark:)', 'text-blue-700 dark:text-blue-300'),
    (r'text-blue-600(?!\s+dark:)', 'text-blue-600 dark:text-blue-400'),

    # Purple text in gradient cards
    (r'text-purple-900(?!\s+dark:)', 'text-purple-900 dark:text-purple-100'),
    (r'text-purple-800(?!\s+dark:)', 'text-purple-800 dark:text-purple-200'),
    (r'text-purple-700(?!\s+dark:)', 'text-purple-700 dark:text-purple-300'),
    (r'text-purple-600(?!\s+dark:)', 'text-purple-600 dark:text-purple-400'),
    (r'border-purple-300(?!\s+dark:)', 'border-purple-300 dark:border-purple-700'),

    # Yellow/amber warning boxes
    (r'bg-yellow-50(?!\s+dark:)', 'bg-yellow-50 dark:bg-yellow-950/20'),
    (r'bg-amber-50(?!\s+dark:)', 'bg-amber-50 dark:bg-amber-950/20'),
    (r'border-yellow-200(?!\s+dark:)', 'border-yellow-200 dark:border-yellow-900/30'),
    (r'border-amber-200(?!\s+dark:)', 'border-amber-200 dark:border-amber-900/30'),

    # Red error/danger boxes
    (r'bg-red-50(?!\s+dark:)', 'bg-red-50 dark:bg-red-950/20'),
    (r'border-red-200(?!\s+dark:)', 'border-red-200 dark:border-red-900/30'),
    (r'text-red-900(?!\s+dark:)', 'text-red-900 dark:text-red-100'),
    (r'text-red-800(?!\s+dark:)', 'text-red-800 dark:text-red-200'),

    # Green success boxes
    (r'bg-green-50(?!\s+dark:)', 'bg-green-50 dark:bg-green-950/20'),
    (r'border-green-200(?!\s+dark:)', 'border-green-200 dark:border-green-900/30'),
    (r'bg-emerald-50(?!\s+dark:)', 'bg-emerald-50 dark:bg-emerald-950/20'),
    (r'border-emerald-100(?!\s+dark:)', 'border-emerald-100 dark:border-emerald-900/30'),

    # Border colors for colored boxes
    (r'border-amber-100(?!\s+dark:)', 'border-amber-100 dark:border-amber-900/30'),
    (r'border-rose-100(?!\s+dark:)', 'border-rose-100 dark:border-rose-900/30'),
    (r'border-blue-100(?!\s+dark:)', 'border-blue-100 dark:border-blue-900/30'),
]

def fix_line(line):
    """Apply all fixes to a line"""
    original = line

    for pattern, replacement in FIXES:
        line = re.sub(pattern, replacement, line)

    return line, line != original

def fix_file(filepath):
    """Fix a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        new_lines = []
        changed_lines = []

        for i, line in enumerate(lines, 1):
            new_line, changed = fix_line(line)
            new_lines.append(new_line)
            if changed:
                changed_lines.append(i)

        if changed_lines:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return len(changed_lines), changed_lines

        return 0, []

    except Exception as e:
        print(f"ERROR: {filepath}: {e}")
        return 0, []

def main():
    frontend_dir = Path('D:/barkbase-react/frontend/src')

    print("=" * 80)
    print("FIXING GRADIENTS AND COLORED BACKGROUNDS")
    print("=" * 80)
    print()

    total_files = 0
    total_lines = 0
    updates = []

    for jsx_file in frontend_dir.rglob('*.jsx'):
        if '__tests__' in str(jsx_file) or '.test.' in str(jsx_file):
            continue

        lines_changed, line_numbers = fix_file(jsx_file)

        if lines_changed > 0:
            total_files += 1
            total_lines += lines_changed
            rel_path = jsx_file.relative_to(frontend_dir)
            updates.append({'path': str(rel_path), 'lines': lines_changed})
            print(f"[OK] {rel_path}: {lines_changed} lines")

    print()
    print("=" * 80)
    print(f"Files updated: {total_files}")
    print(f"Lines updated: {total_lines}")
    print("=" * 80)

    return total_files, total_lines

if __name__ == '__main__':
    main()
