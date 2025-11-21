#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Define the replacements
replacements = [
    # Backgrounds
    (r'\bbg-white\b(?!\s+dark:)', 'bg-white dark:bg-surface-primary'),
    (r'\bbg-gray-50\b(?!\s+dark:)', 'bg-gray-50 dark:bg-surface-secondary'),
    (r'\bbg-gray-100\b(?!\s+dark:)', 'bg-gray-100 dark:bg-surface-secondary'),
    (r'\bbg-gray-200\b(?!\s+dark:)', 'bg-gray-200 dark:bg-surface-border'),

    # Text colors
    (r'\btext-gray-900\b(?!\s+dark:)', 'text-gray-900 dark:text-text-primary'),
    (r'\btext-gray-800\b(?!\s+dark:)', 'text-gray-800 dark:text-text-primary'),
    (r'\btext-gray-700\b(?!\s+dark:)', 'text-gray-700 dark:text-text-primary'),
    (r'\btext-gray-600\b(?!\s+dark:)', 'text-gray-600 dark:text-text-secondary'),
    (r'\btext-gray-500\b(?!\s+dark:)', 'text-gray-500 dark:text-text-secondary'),
    (r'\btext-gray-400\b(?!\s+dark:)', 'text-gray-400 dark:text-text-tertiary'),

    # Borders
    (r'\bborder-gray-200\b(?!\s+dark:)', 'border-gray-200 dark:border-surface-border'),
    (r'\bborder-gray-300\b(?!\s+dark:)', 'border-gray-300 dark:border-surface-border'),
]

def update_file(filepath):
    """Update a single file with dark mode classes"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        for pattern, replacement in replacements:
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
    """Process all JSX files in features directory"""
    features_dir = Path('D:/barkbase-react/frontend/src/features')

    total_files = 0
    total_changes = 0
    updated_files = []

    for jsx_file in features_dir.rglob('*.jsx'):
        # Skip test files
        if '__tests__' in str(jsx_file) or '.test.' in str(jsx_file):
            continue

        changes = update_file(jsx_file)
        if changes > 0:
            total_files += 1
            total_changes += changes
            rel_path = jsx_file.relative_to(features_dir)
            updated_files.append((str(rel_path), changes))
            print(f"Updated {rel_path}: {changes} changes")

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
