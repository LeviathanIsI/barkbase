#!/usr/bin/env python3
"""
Line-by-line theme fixer - ensures EVERY light color has dark mode pair on the same line
Works with ANY className pattern: simple strings, cn(), ternaries, multi-line, etc.
"""
import re
from pathlib import Path

# Comprehensive mapping of ALL light colors to their dark mode equivalents
THEME_PAIRS = [
    # Backgrounds - most common
    (r'\bbg-white\b', 'dark:bg-surface-primary'),
    (r'\bbg-gray-50\b', 'dark:bg-surface-secondary'),
    (r'\bbg-gray-100\b', 'dark:bg-surface-secondary'),
    (r'\bbg-gray-200\b', 'dark:bg-surface-border'),
    (r'\bbg-gray-300\b', 'dark:bg-surface-border'),
    (r'\bbg-gray-400\b', 'dark:bg-surface-secondary'),
    (r'\bbg-gray-500\b', 'dark:bg-surface-secondary'),
    (r'\bbg-gray-600\b', 'dark:bg-surface-border'),

    # Borders
    (r'\bborder-gray-200\b', 'dark:border-surface-border'),
    (r'\bborder-gray-300\b', 'dark:border-surface-border'),
    (r'\bborder-gray-400\b', 'dark:border-surface-border'),

    # Text colors
    (r'\btext-gray-900\b', 'dark:text-text-primary'),
    (r'\btext-gray-800\b', 'dark:text-text-primary'),
    (r'\btext-gray-700\b', 'dark:text-text-primary'),
    (r'\btext-gray-600\b', 'dark:text-text-secondary'),
    (r'\btext-gray-500\b', 'dark:text-text-secondary'),
    (r'\btext-gray-400\b', 'dark:text-text-tertiary'),
    (r'\btext-gray-300\b', 'dark:text-text-tertiary'),

    # Dividers
    (r'\bdivide-gray-100\b', 'dark:divide-surface-border'),
    (r'\bdivide-gray-200\b', 'dark:divide-surface-border'),

    # Hover states
    (r'\bhover:bg-gray-50\b', 'dark:hover:bg-surface-secondary'),
    (r'\bhover:bg-gray-100\b', 'dark:hover:bg-surface-secondary'),
    (r'\bhover:bg-white\b', 'dark:hover:bg-surface-primary'),
    (r'\bhover:text-gray-900\b', 'dark:hover:text-text-primary'),
    (r'\bhover:text-gray-200\b', 'dark:hover:text-text-tertiary'),

    # Focus states
    (r'\bfocus:bg-gray-50\b', 'dark:focus:bg-surface-secondary'),
    (r'\bfocus:border-gray-300\b', 'dark:focus:border-surface-border'),

    # Ring colors
    (r'\bring-gray-200\b', 'dark:ring-surface-border'),
    (r'\bring-gray-300\b', 'dark:ring-surface-border'),

    # Placeholder text
    (r'\bplaceholder:text-gray-600\b', 'dark:placeholder:text-text-secondary'),
    (r'\bplaceholder:text-gray-500\b', 'dark:placeholder:text-text-secondary'),
    (r'\bplaceholder:text-gray-400\b', 'dark:placeholder:text-text-tertiary'),
    (r'\bplaceholder-gray-500\b', 'dark:placeholder-text-text-secondary'),
    (r'\bplaceholder-gray-400\b', 'dark:placeholder-text-text-tertiary'),

    # Colored backgrounds - all color shades 50/100
    (r'\bbg-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-50\b', 'dark:bg-surface-primary'),
    (r'\bbg-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-100\b', 'dark:bg-surface-secondary'),
]

def fix_line(line):
    """Fix a single line by adding missing dark mode variants"""
    original_line = line
    changes_made = False

    for light_pattern, dark_class in THEME_PAIRS:
        # Check if this line contains the light color
        if re.search(light_pattern, line):
            # Check if the dark variant is already on this line
            if dark_class not in line:
                # Find the light class match
                match = re.search(light_pattern, line)
                if match:
                    light_class = match.group(0)
                    # Add dark class immediately after the light class
                    line = line.replace(
                        light_class,
                        f"{light_class} {dark_class}",
                        1  # Only replace first occurrence to be safe
                    )
                    changes_made = True

    return line, changes_made

def fix_file(filepath):
    """Fix all lines in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        new_lines = []
        line_changes = []

        for i, line in enumerate(lines, 1):
            new_line, changed = fix_line(line)
            new_lines.append(new_line)
            if changed:
                line_changes.append(i)

        if line_changes:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return len(line_changes), line_changes

        return 0, []

    except Exception as e:
        print(f"ERROR processing {filepath}: {e}")
        return 0, []

def main():
    """Process all JSX files"""
    frontend_dir = Path('D:/barkbase-react/frontend/src')

    total_files_updated = 0
    total_lines_updated = 0
    all_updates = []

    print("=" * 80)
    print("COMPREHENSIVE THEME FIX - Line-by-Line Processing")
    print("=" * 80)
    print()

    # Process all .jsx files
    jsx_files = list(frontend_dir.rglob('*.jsx'))
    print(f"Found {len(jsx_files)} JSX files to process...")
    print()

    for jsx_file in jsx_files:
        # Skip test files
        if '__tests__' in str(jsx_file) or '.test.' in str(jsx_file):
            continue

        lines_changed, line_numbers = fix_file(jsx_file)

        if lines_changed > 0:
            total_files_updated += 1
            total_lines_updated += lines_changed
            rel_path = jsx_file.relative_to(frontend_dir)
            all_updates.append({
                'path': str(rel_path),
                'lines': lines_changed,
                'line_numbers': line_numbers
            })
            print(f"[OK] {rel_path}: {lines_changed} lines updated")

    print()
    print("=" * 80)
    print("FINAL RESULTS:")
    print("=" * 80)
    print(f"Files updated: {total_files_updated}")
    print(f"Total lines updated: {total_lines_updated}")
    print()

    if all_updates:
        print("All updated files (sorted by number of changes):")
        print("-" * 80)
        for update in sorted(all_updates, key=lambda x: x['lines'], reverse=True):
            print(f"  {update['path']:<60} {update['lines']:>3} lines")

    return total_files_updated, total_lines_updated

if __name__ == '__main__':
    files_updated, lines_updated = main()
    print()
    print("=" * 80)
    print("Script execution complete!")
    print("=" * 80)
