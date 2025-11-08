#!/usr/bin/env python3
import re
from pathlib import Path

def fix_index_css():
    """Fix hardcoded colors in index.css"""
    filepath = Path('D:/barkbase-react/frontend/src/index.css')

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace hardcoded input colors
    content = re.sub(
        r'color: #111827; /\* gray-900 - dark text for readability \*/',
        'color: var(--text-primary);',
        content
    )

    content = re.sub(
        r'color: #4B5563; /\* gray-600 - darker placeholder for visibility \*/',
        'color: var(--text-tertiary);',
        content
    )

    content = re.sub(
        r'color: #6B7280; /\* gray-500 - darker for better contrast \*/',
        'color: var(--text-tertiary);',
        content
    )

    # Fix border-color and box-shadow for focus states
    content = re.sub(
        r'border-color: var\(--border-focus\);',
        'border-color: var(--primary-500);',
        content
    )

    content = re.sub(
        r'box-shadow: var\(--focus-ring\);',
        'box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[OK] Fixed index.css")

if __name__ == '__main__':
    fix_index_css()
    print("\nCSS files fixed!")
