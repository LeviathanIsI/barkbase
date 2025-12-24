/**
 * Demo Main Entry Point
 * Initializes the BarkBase demo application.
 * No auth, no Sentry, no PWA - just a clean demo experience.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Get the root element
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found. Check index.html for div#root.');
}

// Create root and render
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Log demo mode for debugging
if (import.meta.env.DEV) {
  console.log(
    '%c BarkBase Demo Mode ',
    'background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log('Running in development mode. Mock data will be used.');
}
