# BarkBase Utilities

This folder contains utility scripts used for various maintenance and update tasks in the BarkBase application.

## Scripts Overview

### AWS/Backend Scripts
- **`update-config-service.py`** - Updates configuration service settings in AWS

### Dark Mode & Theme Fix Scripts

The following scripts were created on November 7, 2024, to fix dark mode and theme-related issues in the frontend application. These scripts modify React component files to ensure proper dark mode support throughout the application.

#### Core Update Scripts
- **`update_dark_mode.py`** - Main script for updating dark mode across components
- **`update_all_features.py`** - Updates all feature components with dark mode support

#### Fix Scripts (in order of execution)
1. **`fix_all_dark_mode.py`** - Initial dark mode fixes
2. **`fix_ui_components.py`** - Fixes UI component dark mode issues
3. **`fix_all_features.py`** - Fixes feature component dark mode
4. **`fix_colored_backgrounds.py`** - Fixes colored background issues
5. **`fix_css_hardcoded_colors.py`** - Removes hardcoded colors from CSS
6. **`fix_theme_system_complete.py`** - Complete theme system overhaul
7. **`fix_all_theme_issues_complete.py`** - Comprehensive theme fixes
8. **`fix_theme_line_by_line.py`** - Line-by-line theme corrections
9. **`fix_hover_dark_syntax.py`** - Fixes hover states in dark mode
10. **`fix_gradients_and_special_backgrounds.py`** - Fixes gradients and special backgrounds
11. **`fix_remaining_issues.py`** - Catches remaining theme issues
12. **`fix_all_dark_mode_issues.py`** - Final comprehensive dark mode fixes
13. **`fix_multiline_inputs.py`** - Fixes multiline input dark mode
14. **`fix_all_missing_backgrounds_final.py`** - Final background color fixes

## Usage

These scripts were designed to be run in sequence to progressively fix all dark mode issues in the application. They modify JSX/TSX files to:
- Add proper dark mode class names (e.g., `dark:bg-gray-800`)
- Remove hardcoded colors
- Ensure consistent theming across all components
- Fix hover states and interactive elements
- Handle special cases like gradients and backgrounds

## ⚠️ Warning

These scripts directly modify source files. Always ensure you have:
1. Committed your current changes to git
2. Created a backup of your work
3. Tested changes after running scripts

## Typical Workflow

```bash
# From the root directory
cd Utilities

# Run a specific fix script
python fix_all_dark_mode.py

# Or run multiple in sequence
python update_dark_mode.py
python fix_ui_components.py
# etc...
```

## Notes

- All scripts are executable (chmod +x)
- Created specifically for the BarkBase React application structure
- Target files in `frontend/src/` directory
- Use regex patterns to identify and fix theme issues
- Designed to be idempotent (safe to run multiple times)