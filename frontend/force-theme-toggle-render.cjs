const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/layout/Header.jsx');
const backupPath = path.join(__dirname, 'src/components/layout/Header.jsx.backup.' + Date.now());

// Read the current file
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove any existing ThemeToggleIconButton instances
content = content.replace(
  /<ThemeToggleIconButton[^>]*\/>/g,
  ''
);

// 2. Find the Online/Offline span and add ThemeToggleIconButton BEFORE it with key prop
const onlineOfflinePattern = `          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted",
              offline && "border-warning/60 bg-warning/10 text-warning"
            )}
          >`;

const withThemeToggle = `          <ThemeToggleIconButton
            key="theme-toggle-header"
            className="text-white hover:bg-white/10 focus:ring-white/50"
          />
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted",
              offline && "border-warning/60 bg-warning/10 text-warning"
            )}
          >`;

if (content.includes(onlineOfflinePattern)) {
  content = content.replace(onlineOfflinePattern, withThemeToggle);
} else {
  console.log('❌ Could not find Online/Offline span pattern');
  process.exit(1);
}

// Verify the import exists
if (!content.includes('import { ThemeToggleIconButton }')) {
  console.log('❌ ThemeToggleIconButton import not found!');
  process.exit(1);
}

// Backup and write
fs.copyFileSync(filePath, backupPath);

fs.writeFileSync(filePath, content, 'utf8');
