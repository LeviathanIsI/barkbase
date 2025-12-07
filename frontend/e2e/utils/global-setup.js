/**
 * Global Setup for E2E Tests
 * Runs once before all tests
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

async function globalSetup(config) {
  console.log('\n--- Global E2E Test Setup ---\n');

  // Load environment variables from .env file
  dotenv.config();

  // Verify E2E credentials are loaded
  if (process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD) {
    console.log('✓ E2E credentials loaded successfully');
  } else {
    console.warn('⚠ E2E credentials not found in .env file');
  }

  // Create auth directory if it doesn't exist
  const authDir = path.join(process.cwd(), 'e2e/.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'e2e/reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Clean up old test results
  const testResultsDir = path.join(process.cwd(), 'e2e/test-results');
  if (fs.existsSync(testResultsDir)) {
    fs.rmSync(testResultsDir, { recursive: true, force: true });
  }

  // Set up environment variables
  process.env.TEST_ENV = process.env.TEST_ENV || 'development';

  console.log(`Test Environment: ${process.env.TEST_ENV}`);
  console.log(`Base URL: ${config.projects[0]?.use?.baseURL || 'http://localhost:5173'}`);
  console.log('\n--- Setup Complete ---\n');
}

export default globalSetup;
