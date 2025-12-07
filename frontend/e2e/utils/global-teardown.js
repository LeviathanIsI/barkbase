/**
 * Global Teardown for E2E Tests
 * Runs once after all tests complete
 */

import fs from 'fs';
import path from 'path';

async function globalTeardown(config) {
  console.log('\n--- Global E2E Test Teardown ---\n');

  // Generate summary report
  const resultsPath = path.join(process.cwd(), 'e2e/reports/results.json');

  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

      const summary = {
        totalTests: results.suites?.reduce((acc, suite) => acc + (suite.specs?.length || 0), 0) || 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString(),
      };

      // Count test results
      const countResults = (suites) => {
        for (const suite of suites || []) {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              const status = test.results?.[0]?.status;
              if (status === 'passed') summary.passed++;
              else if (status === 'failed') summary.failed++;
              else if (status === 'skipped') summary.skipped++;
            }
          }
          if (suite.suites) countResults(suite.suites);
        }
      };

      countResults(results.suites);

      // Write summary
      const summaryPath = path.join(process.cwd(), 'e2e/reports/summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      console.log('Test Summary:');
      console.log(`  Total: ${summary.totalTests}`);
      console.log(`  Passed: ${summary.passed}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Skipped: ${summary.skipped}`);
      console.log(`  Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    } catch (error) {
      console.warn('Could not generate summary:', error.message);
    }
  }

  // Clean up temporary files if needed
  const tempDir = path.join(process.cwd(), 'e2e/.temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('\n--- Teardown Complete ---\n');
}

export default globalTeardown;
