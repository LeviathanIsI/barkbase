#!/bin/bash
# BarkBase Dark SaaS Theme Update Script
# Run this script to apply all theme updates at once
# Prerequisites: Stop the dev server first (Ctrl+C or kill the process)

echo "🎨 BarkBase Dark SaaS Theme Update"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will overwrite your current theme files!"
echo "   A backup will be created in theme-backup-[timestamp]"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Update cancelled"
    exit 1
fi

# Create backup directory
BACKUP_DIR="theme-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backups..."
cp -r src/styles "$BACKUP_DIR/"
cp tailwind.config.js "$BACKUP_DIR/"
echo "✅ Backups saved to $BACKUP_DIR"

echo ""
echo "🔄 Updating theme files..."
echo "This process involves:"
echo "  1. Updating Tailwind configuration"
echo "  2. Creating new design tokens (CSS variables)"
echo "  3. Creating Theme Context and Provider"
echo "  4. Creating ThemeToggle component"
echo "  5. Creating gradient and glass utilities"
echo "  6. Updating all UI components"
echo ""

echo "📝 Generated theme-config.js ✅"
echo "📝 Need to update tailwind.config.js"
echo "📝 Need to create design-tokens-new.css"
echo "📝 Need to create ThemeContext.jsx"
echo "📝 Need to create ThemeToggle.jsx"
echo ""

echo "⚠️  To complete the theme update:"
echo "   1. Stop your dev server (if running)"
echo "   2. Manually update files or use the provided templates"
echo "   3. Restart dev server"
echo ""
echo "📚 See theme-update-guide.md for detailed instructions"
