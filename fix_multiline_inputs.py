#!/usr/bin/env python3
"""
Fix input/select/textarea elements without backgrounds - handles multi-line elements
"""
import re
from pathlib import Path

def fix_file_content(content):
    """Fix input/select/textarea without backgrounds"""
    original = content

    # Match input/select/textarea with className that has border but no bg-
    # This regex works across newlines
    for tag in ['input', 'select', 'textarea']:
        # Pattern: <tag ... className="..." where className has border but no bg-
        pattern = rf'(<{tag}\b[^>]*?className=")((?:(?!bg-)[^"])*border[^"]*?)(")'

        def add_bg(match):
            opening = match.group(1)  # <input className="
            classes = match.group(2)   # the className content
            closing = match.group(3)   # "

            # Skip if already has bg-
            if 'bg-' in classes:
                return match.group(0)

            # Add bg-white dark:bg-surface-primary at the start of className
            return opening + 'bg-white dark:bg-surface-primary ' + classes + closing

        content = re.sub(pattern, add_bg, content, flags=re.DOTALL)

    return content

def fix_file(filepath):
    """Fix a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        content = fix_file_content(content)

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
    print("FIXING MULTI-LINE INPUT/SELECT/TEXTAREA ELEMENTS")
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
