const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/layout/Header.jsx');
const backupPath = path.join(__dirname, 'src/components/layout/Header.jsx.backup.' + Date.now());

// Read the current file
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add the import for ThemeToggle
const importLine = "import { ThemeToggleIconButton } from '@/components/ui/ThemeToggle';";
const modalImportLine = "import Modal from '@/components/ui/Modal';";

if (!content.includes(importLine)) {
  content = content.replace(
    modalImportLine,
    `${modalImportLine}\n${importLine}`
  );
  console.log('✅ Added ThemeToggle import');
} else {
  console.log('ℹ️  ThemeToggle import already exists');
}

// 2. Add the ThemeToggleIconButton next to the Bell icon
const bellButtonPattern = `          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>`;

const bellWithThemeToggle = `          <ThemeToggleIconButton className="text-white hover:bg-white/10" />
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>`;

if (!content.includes('<ThemeToggleIconButton')) {
  content = content.replace(bellButtonPattern, bellWithThemeToggle);
  console.log('✅ Added ThemeToggleIconButton to Header');
} else {
  console.log('ℹ️  ThemeToggleIconButton already exists in Header');
}

// Backup and write
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backed up Header.jsx to:', backupPath);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated Header.jsx with ThemeToggle!');
console.log('\n📍 Location: Header right side, before the notification bell icon');
