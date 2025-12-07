/**
 * Test Orchestration Configuration
 * Centralized configuration for test execution strategies
 */

export const TestOrchestrationConfig = {
  // Test classification tiers based on execution characteristics
  tiers: {
    // Tier 1: Fast unit tests (< 100ms)
    fast: {
      pattern: 'src/lib/**/*.test.{js,jsx}',
      timeout: 5000,
      parallel: true,
      priority: 1,
      retries: 0,
    },
    // Tier 2: Standard unit tests (100ms - 500ms)
    standard: {
      pattern: 'src/{stores,hooks}/**/*.test.{js,jsx}',
      timeout: 10000,
      parallel: true,
      priority: 2,
      retries: 1,
    },
    // Tier 3: Component tests (500ms - 2s)
    component: {
      pattern: 'src/components/**/*.test.{js,jsx}',
      timeout: 15000,
      parallel: true,
      priority: 3,
      retries: 1,
    },
    // Tier 4: Feature tests (1s - 5s)
    feature: {
      pattern: 'src/features/**/*.test.{js,jsx}',
      timeout: 20000,
      parallel: true,
      priority: 4,
      retries: 2,
    },
    // Tier 5: Integration tests
    integration: {
      pattern: 'src/app/**/*.test.{js,jsx}',
      timeout: 30000,
      parallel: false,
      priority: 5,
      retries: 2,
    },
  },

  // E2E test configuration
  e2e: {
    functional: {
      pattern: 'e2e/tests/*.spec.js',
      timeout: 60000,
      parallel: false,
      workers: 1,
      retries: 2,
    },
    visual: {
      pattern: 'e2e/tests/visual/*.spec.js',
      timeout: 120000,
      parallel: false,
      workers: 1,
      retries: 1,
    },
  },

  // Execution strategies
  strategies: {
    // Quick feedback - run fastest tests first
    quick: {
      tiers: ['fast'],
      bail: true,
      maxWorkers: '100%',
    },
    // Standard development workflow
    standard: {
      tiers: ['fast', 'standard', 'component'],
      bail: false,
      maxWorkers: '75%',
    },
    // Full test suite
    full: {
      tiers: ['fast', 'standard', 'component', 'feature', 'integration'],
      bail: false,
      maxWorkers: '50%',
    },
    // CI pipeline
    ci: {
      tiers: ['fast', 'standard', 'component', 'feature', 'integration'],
      bail: false,
      maxWorkers: 2,
      coverage: true,
    },
    // Pre-commit hook
    precommit: {
      tiers: ['fast', 'standard'],
      bail: true,
      maxWorkers: '50%',
      changedOnly: true,
    },
    // Pre-push validation
    prepush: {
      tiers: ['fast', 'standard', 'component'],
      bail: true,
      maxWorkers: '75%',
    },
  },

  // Resource allocation
  resources: {
    // Memory limits per worker (MB)
    memoryPerWorker: 512,
    // Max concurrent workers based on environment
    maxWorkers: {
      local: 4,
      ci: 2,
      ciLarge: 4,
    },
    // Timeout multipliers for slow environments
    timeoutMultiplier: {
      local: 1,
      ci: 1.5,
      ciLarge: 1,
    },
  },

  // Conditional execution rules
  conditionalExecution: {
    // Skip rules based on file changes
    skipRules: {
      // Skip E2E if only docs changed
      'e2e/**': {
        skipWhen: ['docs/**', '*.md', '.github/**'],
      },
      // Skip visual tests if only logic changed
      'e2e/tests/visual/**': {
        skipWhen: ['src/lib/**', 'src/stores/**', 'src/hooks/**'],
        runWhen: ['src/components/**', 'src/features/**/components/**'],
      },
    },
    // Always run rules
    alwaysRun: {
      patterns: ['src/lib/**/*.test.js'],
      onBranches: ['main', 'develop'],
    },
  },

  // Failure handling
  failureHandling: {
    // Retry configuration
    retryStrategy: {
      maxRetries: 2,
      retryDelay: 1000,
      exponentialBackoff: true,
    },
    // Quarantine flaky tests
    quarantine: {
      enabled: true,
      threshold: 3, // failures before quarantine
      autoDisable: false,
    },
    // Failure notifications
    notifications: {
      slack: process.env.SLACK_WEBHOOK_URL,
      email: process.env.TEST_FAILURE_EMAIL,
    },
  },

  // Reporting configuration
  reporting: {
    // Output formats
    formats: ['json', 'html', 'junit'],
    // Output directory
    outputDir: './test-results',
    // Include in report
    include: {
      coverage: true,
      duration: true,
      screenshots: true,
      traces: true,
    },
    // Artifact retention (days)
    retention: {
      reports: 30,
      screenshots: 7,
      traces: 3,
    },
  },
};

export default TestOrchestrationConfig;
