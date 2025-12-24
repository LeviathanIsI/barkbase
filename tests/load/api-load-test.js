/**
 * BarkBase API Load Test
 *
 * Tests the main API endpoints under load:
 * - GET /entity/owners
 * - GET /entity/pets
 * - GET /operations/bookings
 *
 * Run with: k6 run api-load-test.js
 *
 * Environment variables:
 * - API_TOKEN: Bearer token for authentication (required)
 * - API_BASE_URL: API base URL (optional, defaults to production)
 * - TENANT_ID: Tenant ID (optional, defaults to test tenant)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const ownersLatency = new Trend('owners_latency');
const petsLatency = new Trend('pets_latency');
const bookingsLatency = new Trend('bookings_latency');

// Configuration
const API_BASE_URL = __ENV.API_BASE_URL || 'https://gvrsq1bmy6.execute-api.us-east-2.amazonaws.com/api/v1';
const TENANT_ID = __ENV.TENANT_ID || '76815987-237f-4433-aad5-b904371d0918';
const API_TOKEN = __ENV.API_TOKEN;

// Validate token is provided
if (!API_TOKEN) {
  console.error('ERROR: API_TOKEN environment variable is required');
  console.error('Get a token by logging into the app and copying from browser DevTools:');
  console.error('  localStorage.getItem("barkbase-auth") -> parse JSON -> accessToken');
  throw new Error('API_TOKEN is required');
}

// Test configuration: 10 virtual users for 30 seconds
export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    errors: ['rate<0.1'],              // Error rate under 10%
  },
};

// Common headers for all requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
  'X-Tenant-Id': TENANT_ID,
};

// Helper to make GET request and track metrics
function apiGet(endpoint, latencyMetric) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = http.get(url, { headers });

  // Track latency
  latencyMetric.add(response.timings.duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null;
      } catch {
        return false;
      }
    },
  });

  // Track errors
  errorRate.add(!success);

  if (!success) {
    console.log(`FAILED: ${endpoint} - Status: ${response.status}`);
    if (response.status === 401) {
      console.log('Auth failed - token may be expired');
    }
  }

  return response;
}

// Main test scenario
export default function () {
  // Test GET /entity/owners
  apiGet('/entity/owners', ownersLatency);
  sleep(0.5);

  // Test GET /entity/pets
  apiGet('/entity/pets', petsLatency);
  sleep(0.5);

  // Test GET /operations/bookings
  apiGet('/operations/bookings', bookingsLatency);
  sleep(0.5);
}

// Setup function - runs once before the test
export function setup() {
  console.log('='.repeat(60));
  console.log('BarkBase API Load Test');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Virtual Users: ${options.vus}`);
  console.log(`Duration: ${options.duration}`);
  console.log('='.repeat(60));

  // Verify API is reachable with a health check
  const healthResponse = http.get(`${API_BASE_URL}/entity/owners?limit=1`, { headers });

  if (healthResponse.status !== 200) {
    console.error(`Setup failed: API returned ${healthResponse.status}`);
    if (healthResponse.status === 401) {
      console.error('Authentication failed - check your API_TOKEN');
    }
    throw new Error('API not reachable or auth failed');
  }

  console.log('Setup complete - API is reachable');
  return {};
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log('='.repeat(60));
  console.log('Load test complete!');
  console.log('='.repeat(60));
}
