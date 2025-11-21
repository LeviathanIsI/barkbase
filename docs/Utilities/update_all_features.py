#!/usr/bin/env python3
"""
Script to add dark mode variants to ALL React feature components systematically.
"""

import re
import os
from pathlib import Path

# Define the replacement patterns
REPLACEMENTS = [
    # Background colors
    (r'\bbg-white\b(?! dark:)', r'bg-white dark:bg-surface-primary'),
    (r'\bbg-gray-50\b(?! dark:)', r'bg-gray-50 dark:bg-surface-secondary'),
    (r'\bbg-gray-100\b(?! dark:)', r'bg-gray-100 dark:bg-surface-secondary'),
    (r'\bbg-gray-200\b(?! dark:)', r'bg-gray-200 dark:bg-surface-border'),

    # Text colors
    (r'\btext-gray-900\b(?! dark:)', r'text-gray-900 dark:text-text-primary'),
    (r'\btext-gray-800\b(?! dark:)', r'text-gray-800 dark:text-text-primary'),
    (r'\btext-gray-700\b(?! dark:)', r'text-gray-700 dark:text-text-primary'),
    (r'\btext-gray-600\b(?! dark:)', r'text-gray-600 dark:text-text-secondary'),
    (r'\btext-gray-500\b(?! dark:)', r'text-gray-500 dark:text-text-secondary'),
    (r'\btext-gray-400\b(?! dark:)', r'text-gray-400 dark:text-text-tertiary'),

    # Border colors
    (r'\bborder-gray-200\b(?! dark:)', r'border-gray-200 dark:border-surface-border'),
    (r'\bborder-gray-300\b(?! dark:)', r'border-gray-300 dark:border-surface-border'),

    # Hardcoded colors
    (r'\bbg-\[#F5F6FA\]', r'bg-background-primary'),
    (r'\bbg-\[#FFFFFF\]', r'bg-white dark:bg-surface-primary'),
    (r'\btext-\[#263238\]', r'text-gray-900 dark:text-text-primary'),
    (r'\btext-\[#64748B\]', r'text-gray-600 dark:text-text-secondary'),
    (r'\bborder-\[#E0E0E0\]', r'border-gray-200 dark:border-surface-border'),
    (r'\bborder-\[#F5F6FA\]', r'border-gray-200 dark:border-surface-border'),
]

def should_process(file_path):
    """Check if file should be processed (exclude tests)."""
    path_str = str(file_path)
    return '__tests__' not in path_str and 'node_modules' not in path_str

def update_file(file_path):
    """Update a single file with dark mode variants."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        replacement_count = 0

        # Apply all replacements
        for pattern, replacement in REPLACEMENTS:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                matches = len(re.findall(pattern, content))
                replacement_count += matches
                content = new_content

        # Only write if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return replacement_count

        return 0
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
        return 0

def main():
    """Main function to update all feature files."""
    base_path = Path('D:/barkbase-react/frontend/src/features')

    results = {}
    total_replacements = 0

    # Process all .jsx files in features directory
    for jsx_file in base_path.rglob('*.jsx'):
        if should_process(jsx_file):
            count = update_file(jsx_file)
            if count > 0:
                rel_path = jsx_file.relative_to(base_path)
                results[str(rel_path)] = count
                total_replacements += count

    print(f"\n{'='*60}")
    print(f"Updated {len(results)} files with {total_replacements} total replacements")
    print(f"{'='*60}\n")

    # Show first 30 files
    for file, count in sorted(results.items())[:30]:
        print(f"  {file}: {count} replacements")

    if len(results) > 30:
        print(f"\n  ... and {len(results) - 30} more files")

    return results

if __name__ == '__main__':
    main()
