#!/usr/bin/env python3
"""
Fix incorrect hover + dark mode syntax
Fixes patterns like: hover:text-gray-600 dark:text-text-secondary
Should be: hover:text-gray-600 dark:hover:text-text-secondary
"""
import re
from pathlib import Path

def fix_hover_dark_syntax(line):
    """Fix hover dark mode syntax on a line"""
    original = line

    # Pattern: hover:text-gray-XXX followed by dark:text-YYY (should be dark:hover:text-YYY)
    # Match: hover:text-gray-600 dark:text-text-secondary
    # Replace with: hover:text-gray-600 dark:hover:text-text-secondary
    pattern = r'(hover:text-gray-\d+)\s+(dark:text-)'
    replacement = r'\1 dark:hover:text-'
    line = re.sub(pattern, replacement, line)

    # Pattern: hover:text-gray-XXX followed by dark:text-text-primary
    pattern2 = r'(hover:text-gray-\d+)\s+dark:text-text-primary'
    replacement2 = r'\1 dark:hover:text-text-primary'
    line = re.sub(pattern2, replacement2, line)

    # Pattern: hover:text-gray-XXX followed by dark:text-text-secondary
    pattern3 = r'(hover:text-gray-\d+)\s+dark:text-text-secondary'
    replacement3 = r'\1 dark:hover:text-text-secondary'
    line = re.sub(pattern3, replacement3, line)

    # Pattern: hover:text-gray-XXX followed by dark:text-text-tertiary
    pattern4 = r'(hover:text-gray-\d+)\s+dark:text-text-tertiary'
    replacement4 = r'\1 dark:hover:text-text-tertiary'
    line = re.sub(pattern4, replacement4, line)

    return line, line != original

def fix_file(filepath):
    """Fix all hover syntax in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        new_lines = []
        changed_lines = []

        for i, line in enumerate(lines, 1):
            new_line, changed = fix_hover_dark_syntax(line)
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
    print("FIXING HOVER + DARK MODE SYNTAX")
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
