# Test Orchestration System

Intelligent test automation with optimized execution, resource management, and comprehensive monitoring.

## Quick Start

```bash
# Run with default strategy
npm run test:orchestrate

# Quick feedback (unit tests only)
npm run test:orchestrate:quick

# Full test suite
npm run test:orchestrate:full

# CI pipeline mode
npm run test:orchestrate:ci

# Only tests for changed files
npm run test:orchestrate:changed

# Generate analytics report
npm run test:analytics:report
```

## Architecture

```
test-orchestration/
├── config.js       # Configuration for tiers, strategies, resources
├── orchestrator.js # Main orchestration engine
├── analytics.js    # Monitoring and reporting
└── README.md       # This file
```

## Test Tiers

Tests are classified into tiers based on execution characteristics:

| Tier | Pattern | Timeout | Parallel | Priority |
|------|---------|---------|----------|----------|
| **fast** | `src/lib/**/*.test.js` | 5s | Yes | 1 |
| **standard** | `src/{stores,hooks}/**/*.test.js` | 10s | Yes | 2 |
| **component** | `src/components/**/*.test.jsx` | 15s | Yes | 3 |
| **feature** | `src/features/**/*.test.jsx` | 20s | Yes | 4 |
| **integration** | `src/app/**/*.test.jsx` | 30s | No | 5 |

## Execution Strategies

### quick
Fast feedback for development
- Runs: fast tier only
- Bails on first failure
- Max parallelization

```bash
npm run test:orchestrate:quick
```

### standard
Normal development workflow
- Runs: fast, standard, component tiers
- No bail (runs all)
- 75% parallelization

```bash
npm run test:orchestrate
```

### full
Complete test suite
- Runs: All tiers
- No bail
- 50% parallelization

```bash
npm run test:orchestrate:full
```

### ci
Optimized for CI/CD pipelines
- Runs: All tiers
- Coverage enabled
- 2 workers max

```bash
npm run test:orchestrate:ci
```

### precommit
Pre-commit hook validation
- Runs: fast, standard tiers
- Changed files only
- Bails on failure

```bash
npm run test:orchestrate -- --strategy precommit --changed
```

### prepush
Pre-push validation
- Runs: fast, standard, component tiers
- Bails on failure

```bash
npm run test:orchestrate -- --strategy prepush
```

## CLI Options

```
Usage: node orchestrator.js [options]

Options:
  -s, --strategy <name>  Execution strategy (quick|standard|full|ci|precommit|prepush)
  -v, --verbose          Show detailed output
  --dry-run              Show what would be executed without running
  -c, --changed          Only run tests for changed files
  -h, --help             Show help message
```

## CI/CD Pipeline

The test orchestration pipeline (`.github/workflows/test-orchestration.yml`) runs in stages:

```
Stage 1: Fast Tests    → Stage 2: Component Tests → Stage 3: Feature Tests
                                                            ↓
Stage 6: Visual Tests ← Stage 5: E2E Tests ← Stage 4: Coverage Analysis
```

### Stage Details

| Stage | Tests | Timeout | Condition |
|-------|-------|---------|-----------|
| 1. Fast | lib, stores, hooks | 10min | Always |
| 2. Component | components | 15min | Stage 1 passes |
| 3. Feature | features, app | 20min | Stage 2 passes |
| 4. Coverage | All + coverage | 15min | Stages 1-3 pass |
| 5. E2E | Playwright functional | 30min | main branch or manual |
| 6. Visual | Visual regression | 30min | main branch or manual |

## Analytics & Monitoring

### Generate Reports

```bash
# Full analytics report
npm run test:analytics:report

# Get insights
npm run test:analytics:insights

# List flaky tests
node test-orchestration/analytics.js flaky

# Find slowest tests
node test-orchestration/analytics.js slow
```

### Metrics Tracked

- **Pass Rate**: Overall and per-tier
- **Duration Trends**: Average and recent
- **Flaky Tests**: Automatic detection
- **Tier Performance**: Per-tier statistics
- **Run History**: Last 100 runs

### Flaky Test Detection

Tests that fail intermittently are automatically tracked:
- Failure count
- Last failure timestamp
- Run history
- Quarantine threshold (default: 3 failures)

## Conditional Execution

### Skip Rules

Tests can be skipped based on changed files:

```javascript
skipRules: {
  // Skip E2E if only docs changed
  'e2e/**': {
    skipWhen: ['docs/**', '*.md'],
  },
  // Skip visual tests for logic-only changes
  'e2e/tests/visual/**': {
    skipWhen: ['src/lib/**', 'src/stores/**'],
    runWhen: ['src/components/**'],
  },
}
```

### Always Run Rules

Certain tests always run:

```javascript
alwaysRun: {
  patterns: ['src/lib/**/*.test.js'],
  onBranches: ['main', 'develop'],
}
```

## Resource Management

### Memory Limits

```javascript
resources: {
  memoryPerWorker: 512, // MB
  maxWorkers: {
    local: 4,
    ci: 2,
    ciLarge: 4,
  },
}
```

### Timeout Multipliers

Different environments may need longer timeouts:

```javascript
timeoutMultiplier: {
  local: 1,
  ci: 1.5,
  ciLarge: 1,
}
```

## Git Hooks Integration

### Pre-commit

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run test:orchestrate -- --strategy precommit --changed
```

### Pre-push

Add to `.husky/pre-push`:

```bash
#!/bin/sh
npm run test:orchestrate -- --strategy prepush
```

## Customization

### Adding a New Tier

```javascript
// In config.js
tiers: {
  // ... existing tiers
  newTier: {
    pattern: 'src/new/**/*.test.js',
    timeout: 15000,
    parallel: true,
    priority: 3,
    retries: 1,
  },
}
```

### Creating a Custom Strategy

```javascript
// In config.js
strategies: {
  // ... existing strategies
  custom: {
    tiers: ['fast', 'newTier'],
    bail: true,
    maxWorkers: 2,
    coverage: false,
  },
}
```

## Troubleshooting

### Tests Not Running

1. Check tier patterns match test files
2. Verify strategy includes correct tiers
3. Check changed file detection with `--dry-run`

### Slow Execution

1. Review `npm run test:analytics:insights`
2. Find slow tests with `node test-orchestration/analytics.js slow`
3. Consider parallelization settings

### Flaky Tests

1. Check `node test-orchestration/analytics.js flaky`
2. Review test history for patterns
3. Consider quarantine or refactoring

## Output Files

| File | Description |
|------|-------------|
| `test-results/orchestration-results.json` | Last run results |
| `test-results/analytics/test-history.json` | Run history |
| `test-results/analytics/flaky-tests.json` | Flaky test tracking |
| `test-results/analytics/metrics.json` | Aggregate metrics |
| `test-results/analytics/analytics-report.md` | Human-readable report |
