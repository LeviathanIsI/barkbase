#!/usr/bin/env python3
"""
Script to add dark mode variants to React components systematically.
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

# Priority files to update
PRIORITY_FILES = [
    'features/schedule/routes/Schedule.jsx',
    'features/bookings/routes/Bookings.jsx',
    'features/bookings/routes/BookingsOverview.jsx',
    'features/calendar/routes/CalendarOverview.jsx',
    'features/operations/routes/Operations.jsx',
    'features/owners/routes/Owners.jsx',
    'features/owners/routes/OwnerDetail.jsx',
    'features/pets/routes/Pets.jsx',
    'features/pets/routes/PetDetail.jsx',
    'features/facilities/routes/Facilities.jsx',
    'features/kennels/routes/Kennels.jsx',
    'features/packages/routes/Packages.jsx',
    'features/customers/routes/CustomerDetail.jsx',
    'features/services/routes/Services.jsx',
    'features/staff/routes/Staff.jsx',
    'features/properties/routes/Properties.jsx',
    'features/invoices/routes/Invoices.jsx',
    'features/payments/routes/Payments.jsx',
    'features/reports/routes/Reports.jsx',
    'features/tasks/routes/Tasks.jsx',
    'features/admin/routes/Admin.jsx',
]

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
    """Main function to update all priority files."""
    base_path = Path('D:/barkbase-react/frontend/src')

    results = {}
    total_replacements = 0

    for file_rel_path in PRIORITY_FILES:
        file_path = base_path / file_rel_path
        if file_path.exists():
            count = update_file(file_path)
            if count > 0:
                results[file_rel_path] = count
                total_replacements += count
                print(f"[OK] {file_rel_path}: {count} replacements")
            else:
                print(f"  {file_rel_path}: no changes needed")
        else:
            print(f"[SKIP] {file_rel_path}: file not found")

    print(f"\nTotal: {total_replacements} replacements across {len(results)} files")
    return results

if __name__ == '__main__':
    main()
