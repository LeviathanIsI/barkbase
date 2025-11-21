#!/usr/bin/env python3
import os
import re
from pathlib import Path

def update_file(filepath):
    """Update a single file with dark mode classes for colored backgrounds"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        # All Tailwind color variants
        colors = [
            'slate', 'gray', 'zinc', 'neutral', 'stone',
            'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
            'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
        ]

        # Semantic colors
        semantic_colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info']

        # Fix bg-{color}-50 (very light backgrounds - these show as white/light cards)
        for color in colors + semantic_colors:
            pattern = rf'\bbg-{color}-50\b(?!\s+dark:)'
            replacement = f'bg-{color}-50 dark:bg-surface-primary'
            new_content, count = re.subn(pattern, replacement, content)
            if count > 0:
                content = new_content
                changes_made += count

        # Fix bg-{color}-100 (light backgrounds)
        for color in colors + semantic_colors:
            pattern = rf'\bbg-{color}-100\b(?!\s+dark:)'
            replacement = f'bg-{color}-100 dark:bg-surface-secondary'
            new_content, count = re.subn(pattern, replacement, content)
            if count > 0:
                content = new_content
                changes_made += count

        # Fix bg-{color}-200 (borders/dividers)
        for color in colors:
            pattern = rf'\bbg-{color}-200\b(?!\s+dark:)'
            replacement = f'bg-{color}-200 dark:bg-surface-border'
            new_content, count = re.subn(pattern, replacement, content)
            if count > 0:
                content = new_content
                changes_made += count

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes_made

        return 0
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return 0

def main():
    """Process all JSX files"""
    frontend_dir = Path('D:/barkbase-react/frontend/src')

    total_files = 0
    total_changes = 0
    updated_files = []

    for jsx_file in frontend_dir.rglob('*.jsx'):
        # Skip test files
        if '__tests__' in str(jsx_file) or '.test.' in str(jsx_file):
            continue

        changes = update_file(jsx_file)
        if changes > 0:
            total_files += 1
            total_changes += changes
            rel_path = jsx_file.relative_to(frontend_dir)
            updated_files.append((str(rel_path), changes))
            if len(updated_files) <= 50:
                print(f"[OK] {rel_path}: {changes} changes")

    if len(updated_files) > 50:
        print(f"... and {len(updated_files) - 50} more files")

    print(f"\n{'='*60}")
    print(f"SUMMARY:")
    print(f"Files updated: {total_files}")
    print(f"Total changes: {total_changes}")
    print(f"{'='*60}")

    if updated_files:
        print("\nTop 20 files by changes:")
        for filepath, changes in sorted(updated_files, key=lambda x: x[1], reverse=True)[:20]:
            print(f"  {filepath}: {changes} changes")

if __name__ == '__main__':
    main()
