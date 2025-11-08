#!/usr/bin/env python3
"""
Final comprehensive fix - add backgrounds to ANY className with borders but no bg-
This catches all edge cases including multiline elements
"""
import re
from pathlib import Path

def fix_classnames(content):
    """Add bg- to any className with border but no bg-"""

    # Pattern: className="..." where ... contains border but not bg-
    def fix_single_classname(match):
        full_match = match.group(0)
        classes = match.group(1)

        # Skip if already has bg-
        if 'bg-' in classes:
            return full_match

        # Skip if doesn't have border
        if 'border' not in classes:
            return full_match

        # Skip div elements with only border-t, border-b, border-l, border-r (these are dividers)
        if re.search(r'className="[^"]*border-[tblr]\b[^"]*"', full_match) and not re.search(r'className="[^"]*border border-', full_match):
            # This is likely just a divider line
            # But still check if it has form field markers like px-, py-, pl-, pr-, rounded-md, rounded-lg
            if not any(marker in classes for marker in ['px-', 'py-', 'pl-', 'pr-', 'rounded-md', 'rounded-lg', 'w-full']):
                return full_match

        # Add background at the beginning of className
        return f'className="bg-white dark:bg-surface-primary {classes}"'

    # Match className="..."
    content = re.sub(
        r'className="([^"]*)"',
        fix_single_classname,
        content
    )

    return content

def fix_file(filepath):
    """Fix a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        content = fix_classnames(content)

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
    print("FINAL COMPREHENSIVE BACKGROUND FIX")
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
