#!/usr/bin/env node
/**
 * Test Orchestrator
 * Intelligent test execution with optimization and resource management
 */

import { spawn } from 'child_process';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TestOrchestrationConfig as config } from './config.js';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestOrchestrator {
  constructor(options = {}) {
    this.options = {
      strategy: options.strategy || 'standard',
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      changedFiles: options.changedFiles || [],
      ...options,
    };

    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tiers: {},
      failedTests: [],
    };

    this.startTime = Date.now();
  }

  /**
   * Main entry point - alias for execute()
   */
  async run() {
    return this.execute();
  }

  /**
   * Discover and classify tests
   */
  async discoverTests() {
    const strategy = config.strategies[this.options.strategy];
    if (!strategy) {
      throw new Error(`Unknown strategy: ${this.options.strategy}`);
    }

    const tests = {
      unit: [],
      e2e: [],
      visual: [],
    };

    this.log(`\nDiscovering tests for strategy: ${this.options.strategy}`);
    this.log(`Tiers to run: ${strategy.tiers.join(', ')}`);

    // Discover unit tests by tier
    for (const tierName of strategy.tiers) {
      const tier = config.tiers[tierName];
      if (tier) {
        this.log(`  Scanning tier '${tierName}': ${tier.pattern}`);
        const files = await glob(tier.pattern, {
          cwd: path.resolve(__dirname, '..'),
          ignore: ['**/node_modules/**'],
        });

        this.log(`    Found ${files.length} test files`);

        tests.unit.push(...files.map(f => ({
          file: f,
          tier: tierName,
          priority: tier.priority,
          timeout: tier.timeout,
          parallel: tier.parallel,
        })));
      }
    }

    // Sort by priority
    tests.unit.sort((a, b) => a.priority - b.priority);

    this.log(`\nTotal discovered: ${tests.unit.length} unit tests`);
    return tests;
  }

  /**
   * Filter tests based on changed files
   */
  filterByChangedFiles(tests) {
    if (!this.options.changedFiles || this.options.changedFiles.length === 0) {
      return tests;
    }

    const changedFiles = this.options.changedFiles;
    this.log(`\nFiltering tests for ${changedFiles.length} changed files`);

    // Map changed files to related test files
    const relatedTests = new Set();

    for (const changedFile of changedFiles) {
      // Direct test file
      if (changedFile.includes('.test.')) {
        relatedTests.add(changedFile);
        continue;
      }

      // Find corresponding test file
      const baseName = path.basename(changedFile, path.extname(changedFile));
      const dir = path.dirname(changedFile);

      // Check for __tests__ directory
      const testPatterns = [
        path.join(dir, '__tests__', `${baseName}.test.js`),
        path.join(dir, '__tests__', `${baseName}.test.jsx`),
        path.join(dir, `${baseName}.test.js`),
        path.join(dir, `${baseName}.test.jsx`),
      ];

      for (const pattern of testPatterns) {
        if (tests.unit.some(t => t.file === pattern)) {
          relatedTests.add(pattern);
        }
      }

      // Always run fast tier tests
      tests.unit
        .filter(t => t.tier === 'fast')
        .forEach(t => relatedTests.add(t.file));
    }

    return {
      ...tests,
      unit: tests.unit.filter(t => relatedTests.has(t.file)),
    };
  }

  /**
   * Apply conditional execution rules
   */
  applyConditionalRules(tests) {
    const rules = config.conditionalExecution;

    if (!this.options.changedFiles || this.options.changedFiles.length === 0) {
      return tests;
    }

    // Check skip rules
    for (const [testPattern, rule] of Object.entries(rules.skipRules)) {
      if (rule.skipWhen) {
        const shouldSkip = this.options.changedFiles.every(f =>
          rule.skipWhen.some(pattern => this.matchPattern(f, pattern))
        );

        if (shouldSkip) {
          tests.unit = tests.unit.filter(t => !this.matchPattern(t.file, testPattern));
          this.log(`Skipping tests matching ${testPattern} - only non-related files changed`);
        }
      }
    }

    return tests;
  }

  /**
   * Simple pattern matching
   */
  matchPattern(file, pattern) {
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.')
    );
    return regex.test(file);
  }

  /**
   * Execute tests by tier
   */
  async executeTierTests(tests, tierName) {
    const tierTests = tests.filter(t => t.tier === tierName);
    if (tierTests.length === 0) {
      this.log(`  No tests in tier '${tierName}'`);
      return { passed: 0, failed: 0, skipped: 0, duration: 0 };
    }

    const tier = config.tiers[tierName];
    const strategy = config.strategies[this.options.strategy];

    this.log(`\n${'='.repeat(50)}`);
    this.log(`Running ${tierName} tier (${tierTests.length} test files)`);
    this.log(`${'='.repeat(50)}`);

    // Build vitest command arguments
    const args = [
      'vitest',
      'run',
      '--reporter=verbose',
    ];

    // Add test files
    tierTests.forEach(t => args.push(t.file));

    // Add timeout
    if (tier.timeout) {
      args.push(`--testTimeout=${tier.timeout}`);
    }

    // Add parallelization settings
    if (tier.parallel && strategy.maxWorkers) {
      args.push('--pool=threads');
      if (typeof strategy.maxWorkers === 'number') {
        args.push(`--poolOptions.threads.maxThreads=${strategy.maxWorkers}`);
      }
    } else if (!tier.parallel) {
      args.push('--pool=forks');
      args.push('--poolOptions.forks.maxForks=1');
    }

    // Add coverage for CI
    if (strategy.coverage) {
      args.push('--coverage');
    }

    // Add bail option
    if (strategy.bail) {
      args.push('--bail=1');
    }

    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would execute: npx ${args.join(' ')}`);
      return { passed: tierTests.length, failed: 0, skipped: 0, duration: 0 };
    }

    this.log(`Executing: npx ${args.join(' ')}\n`);
    return this.runCommand('npx', args);
  }

  /**
   * Run a command and capture results
   */
  runCommand(cmd, args) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      // Use shell on Windows
      const isWindows = process.platform === 'win32';
      const proc = spawn(cmd, args, {
        cwd: path.resolve(__dirname, '..'),
        shell: isWindows,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        // Always show output for visibility
        process.stdout.write(text);
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text);
      });

      proc.on('error', (err) => {
        this.log(`\nError spawning process: ${err.message}`);
        resolve({
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: Date.now() - startTime,
          exitCode: 1,
          error: err.message,
        });
      });

      proc.on('close', (code) => {
        const duration = Date.now() - startTime;

        // Parse results from output
        const passedMatch = stdout.match(/(\d+)\s+pass(?:ed|ing)?/i);
        const failedMatch = stdout.match(/(\d+)\s+fail(?:ed|ing)?/i);
        const skippedMatch = stdout.match(/(\d+)\s+skip(?:ped)?/i);

        // Extract failed test names
        const failedTestMatches = stdout.matchAll(/FAIL\s+(.+\.test\.[jt]sx?)/g);
        const failedTests = [...failedTestMatches].map(m => m[1]);

        const result = {
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : (code !== 0 ? 1 : 0),
          skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
          duration,
          exitCode: code,
          failedTests,
        };

        this.log(`\nTier completed in ${(duration / 1000).toFixed(2)}s`);
        this.log(`  Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`);

        resolve(result);
      });
    });
  }

  /**
   * Execute all tests according to strategy
   */
  async execute() {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST ORCHESTRATOR');
    console.log('='.repeat(60));
    console.log(`Strategy: ${this.options.strategy}`);
    console.log(`Verbose: ${this.options.verbose}`);
    console.log(`Dry Run: ${this.options.dryRun}`);
    if (this.options.changedFiles?.length > 0) {
      console.log(`Changed Files: ${this.options.changedFiles.length}`);
    }
    console.log('='.repeat(60));

    try {
      // Discover tests
      let tests = await this.discoverTests();

      // Filter by changed files if needed
      if (this.options.changedFiles?.length > 0) {
        tests = this.filterByChangedFiles(tests);
      }

      // Apply conditional rules
      tests = this.applyConditionalRules(tests);

      if (tests.unit.length === 0) {
        console.log('\n No tests to run');
        this.results.totalDuration = Date.now() - this.startTime;
        return this.results;
      }

      // Group tests by tier
      const tierGroups = {};
      for (const test of tests.unit) {
        if (!tierGroups[test.tier]) {
          tierGroups[test.tier] = [];
        }
        tierGroups[test.tier].push(test);
      }

      // Execute by tier in priority order
      const strategy = config.strategies[this.options.strategy];
      for (const tierName of strategy.tiers) {
        if (tierGroups[tierName]) {
          const tierResult = await this.executeTierTests(tierGroups[tierName], tierName);

          this.results.tiers[tierName] = tierResult;
          this.results.passed += tierResult.passed;
          this.results.failed += tierResult.failed;
          this.results.skipped += tierResult.skipped;
          this.results.duration += tierResult.duration || 0;

          if (tierResult.failedTests) {
            this.results.failedTests.push(...tierResult.failedTests);
          }

          // Bail on failure if configured
          if (strategy.bail && tierResult.failed > 0) {
            console.log(`\n Bailing after ${tierName} tier failure`);
            break;
          }
        }
      }

      this.results.totalDuration = Date.now() - this.startTime;
      this.results.strategy = this.options.strategy;

      // Print summary
      this.printSummary();

      return this.results;

    } catch (error) {
      console.error('\n Error during test execution:', error.message);
      this.results.error = error.message;
      this.results.totalDuration = Date.now() - this.startTime;
      return this.results;
    }
  }

  /**
   * Print execution summary
   */
  printSummary() {
    const { passed, failed, skipped, totalDuration } = this.results;

    console.log('\n' + '='.repeat(60));
    console.log('  TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Passed:   ${passed}`);
    console.log(`  Failed:   ${failed}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('');

    // Tier breakdown
    console.log('Tier Breakdown:');
    for (const [tier, result] of Object.entries(this.results.tiers)) {
      const status = result.failed > 0 ? 'FAIL' : 'PASS';
      console.log(`  [${status}] ${tier}: ${result.passed} passed, ${result.failed} failed`);
    }

    // Failed tests list
    if (this.results.failedTests.length > 0) {
      console.log('\nFailed Tests:');
      this.results.failedTests.forEach(t => console.log(`  - ${t}`));
    }

    // Final status
    console.log('\n' + '='.repeat(60));
    if (failed > 0) {
      console.log('  RESULT: TESTS FAILED');
    } else {
      console.log('  RESULT: ALL TESTS PASSED');
    }
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Log message (respects verbose flag for some messages)
   */
  log(message) {
    if (this.options.verbose || !message.startsWith('  ')) {
      console.log(message);
    }
  }

  /**
   * Save results to file
   */
  async saveResults() {
    const outputDir = path.resolve(__dirname, '..', config.reporting.outputDir);
    await fs.mkdir(outputDir, { recursive: true });

    const resultsFile = path.join(outputDir, 'orchestration-results.json');
    await fs.writeFile(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      strategy: this.options.strategy,
      results: this.results,
    }, null, 2));

    console.log(`Results saved to ${resultsFile}`);
  }
}

/**
 * Get changed files from git
 */
async function getChangedFiles(base = 'HEAD~1') {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const proc = spawn('git', ['diff', '--name-only', base], {
      cwd: path.resolve(__dirname, '..'),
      shell: isWindows,
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('error', () => {
      resolve([]);
    });

    proc.on('close', () => {
      resolve(output.split('\n').filter(Boolean));
    });
  });
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    strategy: 'standard',
    verbose: false,
    dryRun: false,
    changedOnly: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--strategy':
      case '-s':
        options.strategy = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--changed':
      case '-c':
        options.changedOnly = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Test Orchestrator - Intelligent Test Execution

Usage: node orchestrator.js [options]

Options:
  -s, --strategy <name>  Execution strategy (quick|standard|full|ci|precommit|prepush)
  -v, --verbose          Show detailed output
  --dry-run              Show what would be executed without running
  -c, --changed          Only run tests for changed files
  -h, --help             Show this help message

Strategies:
  quick      - Fast feedback, unit tests only (fast tier)
  standard   - Normal development workflow (fast, standard, component)
  full       - Complete test suite (all tiers)
  ci         - CI/CD pipeline execution (all tiers + coverage)
  precommit  - Pre-commit hook validation (fast, standard + bail)
  prepush    - Pre-push validation (fast, standard, component + bail)

Examples:
  node orchestrator.js --strategy quick
  node orchestrator.js --strategy full --verbose
  node orchestrator.js --strategy ci
  node orchestrator.js --changed --strategy precommit
`);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('Starting Test Orchestrator...');

  // Get changed files if needed
  if (options.changedOnly) {
    options.changedFiles = await getChangedFiles();
    console.log(`Found ${options.changedFiles.length} changed files`);
  }

  // Create and run orchestrator
  const orchestrator = new TestOrchestrator(options);

  try {
    const results = await orchestrator.run();
    await orchestrator.saveResults();

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Orchestrator failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { TestOrchestrator, getChangedFiles };

// ============================================================
// CLI ENTRY POINT - Always run when executed directly
// ============================================================
// This runs immediately when the file is executed via `node orchestrator.js`
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
