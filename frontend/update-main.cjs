const fs = require('fs');
const path = require('path');

const mainJsx = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@/index.css';
import App from '@/App';
import ErrorBoundary from '@/app/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
`;

const filePath = path.join(__dirname, 'src/main.jsx');
const backupPath = path.join(__dirname, 'src/main.jsx.backup.' + Date.now());

// Backup old file
if (fs.existsSync(filePath)) {
  fs.copyFileSync(filePath, backupPath);
  console.log('✅ Backed up old main.jsx to:', backupPath);
}

// Write new file
fs.writeFileSync(filePath, mainJsx, 'utf8');
console.log('✅ Updated main.jsx with ThemeProvider!');
