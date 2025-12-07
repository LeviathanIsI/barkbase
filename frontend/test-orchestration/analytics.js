/**
 * Test Analytics & Monitoring
 * Tracks test execution metrics, identifies flaky tests, and provides insights
 */

import fs from 'fs/promises';
import path from 'path';

class TestAnalytics {
  constructor(options = {}) {
    this.dataDir = options.dataDir || './test-results/analytics';
    this.historyFile = path.join(this.dataDir, 'test-history.json');
    this.flakyFile = path.join(this.dataDir, 'flaky-tests.json');
    this.metricsFile = path.join(this.dataDir, 'metrics.json');
  }

  /**
   * Initialize analytics storage
   */
  async initialize() {
    await fs.mkdir(this.dataDir, { recursive: true });

    // Initialize history file if doesn't exist
    try {
      await fs.access(this.historyFile);
    } catch {
      await fs.writeFile(this.historyFile, JSON.stringify({ runs: [] }, null, 2));
    }

    // Initialize flaky tests file
    try {
      await fs.access(this.flakyFile);
    } catch {
      await fs.writeFile(this.flakyFile, JSON.stringify({ tests: {} }, null, 2));
    }

    // Initialize metrics file
    try {
      await fs.access(this.metricsFile);
    } catch {
      await fs.writeFile(this.metricsFile, JSON.stringify({
        totalRuns: 0,
        averageDuration: 0,
        passRate: 0,
        lastUpdated: null,
      }, null, 2));
    }
  }

  /**
   * Record test run results
   */
  async recordRun(results) {
    await this.initialize();

    const history = JSON.parse(await fs.readFile(this.historyFile, 'utf-8'));

    const runRecord = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      branch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'local',
      commit: process.env.GITHUB_SHA || 'local',
      strategy: results.strategy,
      duration: results.totalDuration,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      tiers: results.tiers,
      failedTests: results.failedTests || [],
    };

    history.runs.unshift(runRecord);

    // Keep last 100 runs
    if (history.runs.length > 100) {
      history.runs = history.runs.slice(0, 100);
    }

    await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));

    // Update flaky test tracking
    await this.updateFlakyTests(runRecord);

    // Update metrics
    await this.updateMetrics(history);

    return runRecord;
  }

  /**
   * Update flaky test tracking
   */
  async updateFlakyTests(runRecord) {
    const flakyData = JSON.parse(await fs.readFile(this.flakyFile, 'utf-8'));

    for (const testName of runRecord.failedTests) {
      if (!flakyData.tests[testName]) {
        flakyData.tests[testName] = {
          failures: 0,
          lastFailure: null,
          history: [],
        };
      }

      flakyData.tests[testName].failures++;
      flakyData.tests[testName].lastFailure = runRecord.timestamp;
      flakyData.tests[testName].history.push({
        runId: runRecord.id,
        timestamp: runRecord.timestamp,
        commit: runRecord.commit,
      });

      // Keep last 20 entries
      if (flakyData.tests[testName].history.length > 20) {
        flakyData.tests[testName].history = flakyData.tests[testName].history.slice(-20);
      }
    }

    await fs.writeFile(this.flakyFile, JSON.stringify(flakyData, null, 2));
  }

  /**
   * Update aggregate metrics
   */
  async updateMetrics(history) {
    const runs = history.runs;

    if (runs.length === 0) return;

    const totalRuns = runs.length;
    const totalDuration = runs.reduce((sum, r) => sum + (r.duration || 0), 0);
    const totalPassed = runs.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = runs.reduce((sum, r) => sum + r.failed, 0);

    const metrics = {
      totalRuns,
      averageDuration: Math.round(totalDuration / totalRuns),
      passRate: totalPassed + totalFailed > 0
        ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)
        : 0,
      recentTrend: this.calculateTrend(runs.slice(0, 10)),
      tierPerformance: this.calculateTierPerformance(runs),
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));
  }

  /**
   * Calculate recent trend
   */
  calculateTrend(recentRuns) {
    if (recentRuns.length < 2) return 'stable';

    const recentPassRate = recentRuns.slice(0, 5).reduce((sum, r) =>
      sum + (r.passed / (r.passed + r.failed + 0.01)), 0) / Math.min(5, recentRuns.length);

    const previousPassRate = recentRuns.slice(5, 10).reduce((sum, r) =>
      sum + (r.passed / (r.passed + r.failed + 0.01)), 0) / Math.min(5, recentRuns.length - 5);

    if (recentPassRate > previousPassRate + 0.05) return 'improving';
    if (recentPassRate < previousPassRate - 0.05) return 'declining';
    return 'stable';
  }

  /**
   * Calculate tier performance
   */
  calculateTierPerformance(runs) {
    const tierStats = {};

    for (const run of runs) {
      if (!run.tiers) continue;

      for (const [tier, stats] of Object.entries(run.tiers)) {
        if (!tierStats[tier]) {
          tierStats[tier] = {
            runs: 0,
            totalPassed: 0,
            totalFailed: 0,
            totalDuration: 0,
          };
        }

        tierStats[tier].runs++;
        tierStats[tier].totalPassed += stats.passed || 0;
        tierStats[tier].totalFailed += stats.failed || 0;
        tierStats[tier].totalDuration += stats.duration || 0;
      }
    }

    // Calculate averages
    for (const tier of Object.keys(tierStats)) {
      const stats = tierStats[tier];
      stats.avgDuration = Math.round(stats.totalDuration / stats.runs);
      stats.passRate = stats.totalPassed + stats.totalFailed > 0
        ? ((stats.totalPassed / (stats.totalPassed + stats.totalFailed)) * 100).toFixed(2)
        : 100;
    }

    return tierStats;
  }

  /**
   * Get flaky tests report
   */
  async getFlakyTests(threshold = 3) {
    try {
      const flakyData = JSON.parse(await fs.readFile(this.flakyFile, 'utf-8'));

      return Object.entries(flakyData.tests)
        .filter(([, data]) => data.failures >= threshold)
        .map(([name, data]) => ({
          name,
          failures: data.failures,
          lastFailure: data.lastFailure,
          recentHistory: data.history.slice(-5),
        }))
        .sort((a, b) => b.failures - a.failures);
    } catch {
      return [];
    }
  }

  /**
   * Get performance insights
   */
  async getInsights() {
    const metrics = JSON.parse(await fs.readFile(this.metricsFile, 'utf-8'));
    const flakyTests = await this.getFlakyTests();
    const history = JSON.parse(await fs.readFile(this.historyFile, 'utf-8'));

    const insights = [];

    // Pass rate insight
    if (parseFloat(metrics.passRate) < 95) {
      insights.push({
        type: 'warning',
        category: 'reliability',
        message: `Pass rate is ${metrics.passRate}% (target: 95%)`,
        recommendation: 'Investigate failing tests and improve test stability',
      });
    }

    // Flaky tests insight
    if (flakyTests.length > 0) {
      insights.push({
        type: 'warning',
        category: 'flakiness',
        message: `${flakyTests.length} flaky test(s) detected`,
        recommendation: `Review: ${flakyTests.slice(0, 3).map(t => t.name).join(', ')}`,
      });
    }

    // Duration trend insight
    if (history.runs.length >= 5) {
      const recentAvg = history.runs.slice(0, 5).reduce((s, r) => s + r.duration, 0) / 5;
      const previousAvg = history.runs.slice(5, 10).reduce((s, r) => s + r.duration, 0) /
        Math.min(5, history.runs.length - 5);

      if (recentAvg > previousAvg * 1.2) {
        insights.push({
          type: 'info',
          category: 'performance',
          message: 'Test execution time has increased by >20%',
          recommendation: 'Review new tests for performance issues',
        });
      }
    }

    // Tier performance insights
    for (const [tier, stats] of Object.entries(metrics.tierPerformance || {})) {
      if (parseFloat(stats.passRate) < 90) {
        insights.push({
          type: 'warning',
          category: 'tier-reliability',
          message: `${tier} tier has ${stats.passRate}% pass rate`,
          recommendation: `Focus on fixing tests in ${tier} tier`,
        });
      }
    }

    return {
      metrics,
      flakyTests,
      insights,
      trend: metrics.recentTrend,
    };
  }

  /**
   * Generate analytics report
   */
  async generateReport() {
    const insights = await this.getInsights();
    const history = JSON.parse(await fs.readFile(this.historyFile, 'utf-8'));

    const report = `# Test Analytics Report

Generated: ${new Date().toISOString()}

## Overview

| Metric | Value |
|--------|-------|
| Total Runs | ${insights.metrics.totalRuns} |
| Average Duration | ${(insights.metrics.averageDuration / 1000).toFixed(2)}s |
| Pass Rate | ${insights.metrics.passRate}% |
| Trend | ${insights.trend} |

## Tier Performance

| Tier | Pass Rate | Avg Duration | Runs |
|------|-----------|--------------|------|
${Object.entries(insights.metrics.tierPerformance || {})
  .map(([tier, stats]) => `| ${tier} | ${stats.passRate}% | ${(stats.avgDuration / 1000).toFixed(2)}s | ${stats.runs} |`)
  .join('\n')}

## Flaky Tests

${insights.flakyTests.length > 0
  ? insights.flakyTests.map(t => `- **${t.name}**: ${t.failures} failures`).join('\n')
  : 'No flaky tests detected'}

## Insights

${insights.insights.map(i => `- **[${i.type.toUpperCase()}]** ${i.message}\n  - ${i.recommendation}`).join('\n\n')}

## Recent Runs

| Date | Strategy | Passed | Failed | Duration |
|------|----------|--------|--------|----------|
${history.runs.slice(0, 10).map(r =>
  `| ${new Date(r.timestamp).toLocaleDateString()} | ${r.strategy} | ${r.passed} | ${r.failed} | ${(r.duration / 1000).toFixed(2)}s |`
).join('\n')}
`;

    const reportPath = path.join(this.dataDir, 'analytics-report.md');
    await fs.writeFile(reportPath, report);

    return reportPath;
  }
}

/**
 * Slowest tests analyzer
 */
class SlowTestAnalyzer {
  constructor(resultsDir = './test-results') {
    this.resultsDir = resultsDir;
  }

  /**
   * Find slowest tests from results
   */
  async findSlowestTests(limit = 10) {
    const tests = [];

    // Read test results files
    const files = await fs.readdir(this.resultsDir).catch(() => []);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await fs.readFile(path.join(this.resultsDir, file), 'utf-8');
        const data = JSON.parse(content);

        if (data.testResults) {
          for (const suite of data.testResults) {
            for (const test of suite.assertionResults || []) {
              tests.push({
                name: `${suite.name} > ${test.title}`,
                duration: test.duration || 0,
                status: test.status,
              });
            }
          }
        }
      } catch {
        // Skip invalid files
      }
    }

    return tests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations() {
    const slowTests = await this.findSlowestTests(20);
    const recommendations = [];

    for (const test of slowTests) {
      if (test.duration > 5000) {
        recommendations.push({
          test: test.name,
          duration: test.duration,
          suggestion: 'Consider breaking into smaller tests or using mocks',
          priority: 'high',
        });
      } else if (test.duration > 2000) {
        recommendations.push({
          test: test.name,
          duration: test.duration,
          suggestion: 'Review for unnecessary async waits or complex setup',
          priority: 'medium',
        });
      } else if (test.duration > 1000) {
        recommendations.push({
          test: test.name,
          duration: test.duration,
          suggestion: 'Consider if all assertions are necessary',
          priority: 'low',
        });
      }
    }

    return recommendations;
  }
}

export { TestAnalytics, SlowTestAnalyzer };

// CLI entry point
async function main() {
  const analytics = new TestAnalytics();
  await analytics.initialize();

  const command = process.argv[2];

  switch (command) {
    case 'report':
      const reportPath = await analytics.generateReport();
      console.log(`Report generated: ${reportPath}`);
      break;

    case 'insights':
      const insights = await analytics.getInsights();
      console.log(JSON.stringify(insights, null, 2));
      break;

    case 'flaky':
      const flakyTests = await analytics.getFlakyTests();
      console.log('Flaky Tests:');
      flakyTests.forEach(t => console.log(`  - ${t.name}: ${t.failures} failures`));
      break;

    case 'slow':
      const slowAnalyzer = new SlowTestAnalyzer();
      const slowTests = await slowAnalyzer.findSlowestTests();
      console.log('Slowest Tests:');
      slowTests.forEach(t => console.log(`  - ${t.name}: ${t.duration}ms`));
      break;

    default:
      console.log(`
Test Analytics CLI

Usage: node analytics.js <command>

Commands:
  report    Generate analytics report
  insights  Get performance insights
  flaky     List flaky tests
  slow      Find slowest tests
`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
