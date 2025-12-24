/**
 * Lighthouse CI Configuration
 *
 * Run with: npm run test:lighthouse
 *
 * Note: Currently tests unauthenticated pages only.
 * TODO: Add puppeteer script for authenticated page testing.
 */

module.exports = {
  ci: {
    collect: {
      // Start the dev server before running tests
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,

      // Base URL for the dev server
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/login',
        'http://localhost:5173/signup',
      ],

      // Number of runs per URL (for more stable results)
      numberOfRuns: 3,

      // Lighthouse settings
      settings: {
        // Use desktop preset for more realistic B2B testing
        preset: 'desktop',

        // Skip some audits that don't apply to SPAs
        skipAudits: [
          'uses-http2',  // Dev server doesn't use HTTP/2
        ],
      },
    },

    assert: {
      // Performance budgets
      assertions: {
        // Core Web Vitals
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],

        // Specific metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
    },

    upload: {
      // Store reports locally (no external server)
      target: 'filesystem',
      outputDir: './lighthouse-reports',
    },
  },
};
