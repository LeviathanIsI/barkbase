#!/usr/bin/env python3
import os
import re
from pathlib import Path

def update_file(filepath):
    """Update a single file with complete theme-aware classes"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        # ALL bg-{color} patterns need dark: variants
        replacements = [
            # Whites and grays
            (r'\bbg-white\b(?!\s+dark:)', 'bg-white dark:bg-surface-primary'),
            (r'\bbg-gray-50\b(?!\s+dark:)', 'bg-gray-50 dark:bg-surface-secondary'),
            (r'\bbg-gray-100\b(?!\s+dark:)', 'bg-gray-100 dark:bg-surface-secondary'),
            (r'\bbg-gray-200\b(?!\s+dark:)', 'bg-gray-200 dark:bg-surface-border'),

            # All light color variants (these appear white/light)
            (r'\bbg-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-50\b(?!\s+dark:)',
             r'bg-\1-50 dark:bg-surface-primary'),
            (r'\bbg-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-100\b(?!\s+dark:)',
             r'bg-\1-100 dark:bg-surface-secondary'),

            # Semantic colors
            (r'\bbg-primary-50\b(?!\s+dark:)', 'bg-primary-50 dark:bg-surface-primary'),
            (r'\bbg-primary-100\b(?!\s+dark:)', 'bg-primary-100 dark:bg-surface-secondary'),
            (r'\bbg-secondary-50\b(?!\s+dark:)', 'bg-secondary-50 dark:bg-surface-primary'),
            (r'\bbg-secondary-100\b(?!\s+dark:)', 'bg-secondary-100 dark:bg-surface-secondary'),
            (r'\bbg-success-50\b(?!\s+dark:)', 'bg-success-50 dark:bg-surface-primary'),
            (r'\bbg-success-100\b(?!\s+dark:)', 'bg-success-100 dark:bg-surface-secondary'),
            (r'\bbg-warning-50\b(?!\s+dark:)', 'bg-warning-50 dark:bg-surface-primary'),
            (r'\bbg-warning-100\b(?!\s+dark:)', 'bg-warning-100 dark:bg-surface-secondary'),
            (r'\bbg-error-50\b(?!\s+dark:)', 'bg-error-50 dark:bg-surface-primary'),
            (r'\bbg-error-100\b(?!\s+dark:)', 'bg-error-100 dark:bg-surface-secondary'),
            (r'\bbg-info-50\b(?!\s+dark:)', 'bg-info-50 dark:bg-surface-primary'),
            (r'\bbg-info-100\b(?!\s+dark:)', 'bg-info-100 dark:bg-surface-secondary'),

            # Text colors
            (r'\btext-gray-900\b(?!\s+dark:)', 'text-gray-900 dark:text-text-primary'),
            (r'\btext-gray-800\b(?!\s+dark:)', 'text-gray-800 dark:text-text-primary'),
            (r'\btext-gray-700\b(?!\s+dark:)', 'text-gray-700 dark:text-text-primary'),
            (r'\btext-gray-600\b(?!\s+dark:)', 'text-gray-600 dark:text-text-secondary'),
            (r'\btext-gray-500\b(?!\s+dark:)', 'text-gray-500 dark:text-text-secondary'),
            (r'\btext-gray-400\b(?!\s+dark:)', 'text-gray-400 dark:text-text-tertiary'),
            (r'\btext-gray-300\b(?!\s+dark:)', 'text-gray-300 dark:text-text-tertiary'),

            # Borders
            (r'\bborder-gray-200\b(?!\s+dark:)', 'border-gray-200 dark:border-surface-border'),
            (r'\bborder-gray-300\b(?!\s+dark:)', 'border-gray-300 dark:border-surface-border'),

            # Dividers
            (r'\bdivide-gray-100\b(?!\s+dark:)', 'divide-gray-100 dark:divide-surface-border'),
            (r'\bdivide-gray-200\b(?!\s+dark:)', 'divide-gray-200 dark:divide-surface-border'),

            # Hover states
            (r'\bhover:bg-gray-50\b(?!\s+dark:)', 'hover:bg-gray-50 dark:hover:bg-surface-secondary'),
            (r'\bhover:bg-gray-100\b(?!\s+dark:)', 'hover:bg-gray-100 dark:hover:bg-surface-secondary'),
            (r'\bhover:bg-white\b(?!\s+dark:)', 'hover:bg-white dark:hover:bg-surface-primary'),
        ]

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

    print(f"\n{'='*60}")
    print(f"COMPLETE THEME FIX SUMMARY:")
    print(f"Files updated: {total_files}")
    print(f"Total changes: {total_changes}")
    print(f"{'='*60}")

    if updated_files:
        print("\nAll updated files:")
        for filepath, changes in sorted(updated_files, key=lambda x: x[1], reverse=True):
            print(f"  {filepath}: {changes} changes")

if __name__ == '__main__':
    main()
