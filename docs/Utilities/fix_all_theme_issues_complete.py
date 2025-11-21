#!/usr/bin/env python3
"""
Complete theme fix script - ensures EVERY light color has its dark mode pair
"""
import os
import re
from pathlib import Path
from collections import defaultdict

# Mapping of light colors to their dark mode equivalents
THEME_MAPPINGS = {
    # Backgrounds
    r'\bbg-white\b': 'dark:bg-surface-primary',
    r'\bbg-gray-50\b': 'dark:bg-surface-secondary',
    r'\bbg-gray-100\b': 'dark:bg-surface-secondary',
    r'\bbg-gray-200\b': 'dark:bg-surface-border',

    # Colored backgrounds (all shades of 50/100)
    r'\bbg-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-50\b': 'dark:bg-surface-primary',
    r'\bbg-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-100\b': 'dark:bg-surface-secondary',

    # Semantic backgrounds
    r'\bbg-primary-50\b': 'dark:bg-surface-primary',
    r'\bbg-primary-100\b': 'dark:bg-surface-secondary',
    r'\bbg-secondary-50\b': 'dark:bg-surface-primary',
    r'\bbg-secondary-100\b': 'dark:bg-surface-secondary',
    r'\bbg-success-50\b': 'dark:bg-surface-primary',
    r'\bbg-success-100\b': 'dark:bg-surface-secondary',
    r'\bbg-warning-50\b': 'dark:bg-surface-primary',
    r'\bbg-warning-100\b': 'dark:bg-surface-secondary',
    r'\bbg-error-50\b': 'dark:bg-surface-primary',
    r'\bbg-error-100\b': 'dark:bg-surface-secondary',

    # Text colors
    r'\btext-gray-900\b': 'dark:text-text-primary',
    r'\btext-gray-800\b': 'dark:text-text-primary',
    r'\btext-gray-700\b': 'dark:text-text-primary',
    r'\btext-gray-600\b': 'dark:text-text-secondary',
    r'\btext-gray-500\b': 'dark:text-text-secondary',
    r'\btext-gray-400\b': 'dark:text-text-tertiary',
    r'\btext-gray-300\b': 'dark:text-text-tertiary',

    # Borders
    r'\bborder-gray-200\b': 'dark:border-surface-border',
    r'\bborder-gray-300\b': 'dark:border-surface-border',

    # Dividers
    r'\bdivide-gray-100\b': 'dark:divide-surface-border',
    r'\bdivide-gray-200\b': 'dark:divide-surface-border',

    # Hover states
    r'\bhover:bg-gray-50\b': 'dark:hover:bg-surface-secondary',
    r'\bhover:bg-gray-100\b': 'dark:hover:bg-surface-secondary',
    r'\bhover:bg-white\b': 'dark:hover:bg-surface-primary',
}

def process_classname(classname_content):
    """Process a className string and add missing dark mode variants"""

    # Skip if it already has dark: classes for everything
    has_changes = False
    original = classname_content

    for light_pattern, dark_class in THEME_MAPPINGS.items():
        # Check if this light color exists in the className
        if re.search(light_pattern, classname_content):
            # Extract the base pattern to check if dark mode already exists
            # For example, if pattern is r'\bbg-white\b', we check for 'dark:bg-' after it

            # Check if the dark variant is already present
            if dark_class not in classname_content:
                # Find the light color match
                match = re.search(light_pattern, classname_content)
                if match:
                    # Add dark class right after the light class
                    light_class = match.group(0)
                    # Insert dark class after the light class
                    classname_content = classname_content.replace(
                        light_class,
                        f"{light_class} {dark_class}",
                        1  # Only replace first occurrence to be safe
                    )
                    has_changes = True

    return classname_content, has_changes

def update_file(filepath):
    """Update all className attributes in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        # Find all className attributes
        # Pattern matches className="..." or className={`...`} or className={cn(...)}
        classname_pattern = r'className=(?:"([^"]*)"|{`([^`]*)`})'

        def replace_classname(match):
            nonlocal changes_made
            full_match = match.group(0)
            classname_value = match.group(1) or match.group(2)

            if classname_value:
                new_classname, has_changes = process_classname(classname_value)
                if has_changes:
                    changes_made += 1
                    # Reconstruct the className attribute
                    if match.group(1):  # Regular string
                        return f'className="{new_classname}"'
                    else:  # Template literal
                        return f'className={{`{new_classname}`}}'

            return full_match

        content = re.sub(classname_pattern, replace_classname, content)

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes_made

        return 0
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return 0

def main():
    """Process all JSX files in frontend/src"""
    frontend_dir = Path('D:/barkbase-react/frontend/src')

    total_files = 0
    total_changes = 0
    updated_files = []

    print("Scanning and fixing all theme issues...")
    print("=" * 60)

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
    print(f"COMPLETE THEME FIX RESULTS:")
    print(f"Files updated: {total_files}")
    print(f"Total className updates: {total_changes}")
    print(f"{'='*60}")

    if updated_files:
        print("\nAll updated files (sorted by changes):")
        for filepath, changes in sorted(updated_files, key=lambda x: x[1], reverse=True):
            print(f"  {filepath}: {changes} className updates")

    return total_files, total_changes

if __name__ == '__main__':
    main()
