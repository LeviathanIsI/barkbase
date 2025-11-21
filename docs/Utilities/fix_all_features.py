#!/usr/bin/env python3
import os
import re
from pathlib import Path

def update_file(filepath):
    """Update a single file with dark mode classes"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Replace all bg-white that don't have dark: after them
        content = re.sub(r'\bbg-white\b(?!\s+dark:)', 'bg-white dark:bg-surface-primary', content)

        # Replace bg-gray-* without dark:
        content = re.sub(r'\bbg-gray-50\b(?!\s+dark:)', 'bg-gray-50 dark:bg-surface-secondary', content)
        content = re.sub(r'\bbg-gray-100\b(?!\s+dark:)', 'bg-gray-100 dark:bg-surface-secondary', content)
        content = re.sub(r'\bbg-gray-200\b(?!\s+dark:)', 'bg-gray-200 dark:bg-surface-border', content)

        # Replace text-gray-* without dark:
        content = re.sub(r'\btext-gray-900\b(?!\s+dark:)', 'text-gray-900 dark:text-text-primary', content)
        content = re.sub(r'\btext-gray-800\b(?!\s+dark:)', 'text-gray-800 dark:text-text-primary', content)
        content = re.sub(r'\btext-gray-700\b(?!\s+dark:)', 'text-gray-700 dark:text-text-primary', content)
        content = re.sub(r'\btext-gray-600\b(?!\s+dark:)', 'text-gray-600 dark:text-text-secondary', content)
        content = re.sub(r'\btext-gray-500\b(?!\s+dark:)', 'text-gray-500 dark:text-text-secondary', content)
        content = re.sub(r'\btext-gray-400\b(?!\s+dark:)', 'text-gray-400 dark:text-text-tertiary', content)
        content = re.sub(r'\btext-gray-300\b(?!\s+dark:)', 'text-gray-300 dark:text-text-tertiary', content)

        # Replace border-gray-* without dark:
        content = re.sub(r'\bborder-gray-200\b(?!\s+dark:)', 'border-gray-200 dark:border-surface-border', content)
        content = re.sub(r'\bborder-gray-300\b(?!\s+dark:)', 'border-gray-300 dark:border-surface-border', content)

        # Replace divide-gray-* without dark:
        content = re.sub(r'\bdivide-gray-100\b(?!\s+dark:)', 'divide-gray-100 dark:divide-surface-border', content)
        content = re.sub(r'\bdivide-gray-200\b(?!\s+dark:)', 'divide-gray-200 dark:divide-surface-border', content)

        # Replace hover states
        content = re.sub(r'\bhover:bg-gray-50\b(?!\s+dark:)', 'hover:bg-gray-50 dark:hover:bg-surface-secondary', content)
        content = re.sub(r'\bhover:bg-gray-100\b(?!\s+dark:)', 'hover:bg-gray-100 dark:hover:bg-surface-secondary', content)

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Process all JSX files in features directory"""
    features_dir = Path('D:/barkbase-react/frontend/src/features')

    updated = []
    count = 0

    for jsx_file in features_dir.rglob('*.jsx'):
        # Skip test files
        if '__tests__' in str(jsx_file) or '.test.' in str(jsx_file):
            continue

        count += 1
        if update_file(jsx_file):
            rel_path = jsx_file.relative_to(features_dir)
            updated.append(str(rel_path))
            if len(updated) <= 50:  # Only print first 50
                print(f"[OK] {rel_path}")

    if len(updated) > 50:
        print(f"... and {len(updated) - 50} more files")

    print(f"\n{'='*60}")
    print(f"Processed {count} files")
    print(f"Updated {len(updated)} files in features/")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
