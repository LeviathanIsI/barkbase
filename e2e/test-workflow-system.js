#!/usr/bin/env node
/**
 * =============================================================================
 * BarkBase Workflow System End-to-End Test
 * =============================================================================
 *
 * Tests the complete workflow automation system:
 * 1. Creates a test workflow with event trigger
 * 2. Activates the workflow
 * 3. Triggers the workflow by creating a pet
 * 4. Verifies execution and task creation
 * 5. Cleans up test data
 *
 * Usage:
 *   node scripts/test-workflow-system.js --api-url=https://api.example.com --token=xxx
 *
 * Options:
 *   --api-url    Base URL of the API (required)
 *   --token      JWT token for authentication (required)
 *   --tenant-id  Tenant ID (optional, extracted from token if not provided)
 *   --skip-cleanup  Don't delete test data after test
 *   --verbose    Show detailed API responses
 *
 * =============================================================================
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// =============================================================================
// Configuration
// =============================================================================

const args = parseArgs(process.argv.slice(2));

if (!args['api-url'] || !args['token']) {
  console.error('Usage: node scripts/test-workflow-system.js --api-url=<url> --token=<jwt>');
  console.error('');
  console.error('Options:');
  console.error('  --api-url       Base URL of the API (required)');
  console.error('  --token         JWT token for authentication (required)');
  console.error('  --tenant-id     Tenant ID (optional)');
  console.error('  --skip-cleanup  Do not delete test data after test');
  console.error('  --verbose       Show detailed API responses');
  process.exit(1);
}

const API_URL = args['api-url'].replace(/\/$/, '');
const TOKEN = args['token'];
const VERBOSE = args['verbose'] === 'true' || args['verbose'] === '';
const SKIP_CLEANUP = args['skip-cleanup'] === 'true' || args['skip-cleanup'] === '';

// Test data tracking for cleanup
const testData = {
  workflowId: null,
  petId: null,
  ownerId: null,
  taskId: null,
  executionId: null,
};

// =============================================================================
// Utility Functions
// =============================================================================

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value !== undefined ? value : 'true';
    }
  }
  return args;
}

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data && VERBOSE) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message) {
  console.log(`\x1b[32m✓ ${message}\x1b[0m`);
}

function logError(message) {
  console.log(`\x1b[31m✗ ${message}\x1b[0m`);
}

function logStep(step, message) {
  console.log(`\n\x1b[36m[${'='.repeat(60)}]\x1b[0m`);
  console.log(`\x1b[36m[STEP ${step}] ${message}\x1b[0m`);
  console.log(`\x1b[36m[${'='.repeat(60)}]\x1b[0m\n`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    if (VERBOSE) {
      log(`${method} ${url.href}`);
    }

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            const error = new Error(`API Error: ${res.statusCode}`);
            error.status = res.statusCode;
            error.response = parsed;
            reject(error);
          } else {
            resolve({ status: res.statusCode, data: parsed });
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// =============================================================================
// Test Steps
// =============================================================================

async function step1_createTestOwner() {
  logStep(1, 'Creating test owner for pet association');

  const ownerData = {
    firstName: 'Workflow',
    lastName: 'TestOwner',
    email: `workflow-test-${Date.now()}@test.local`,
    phone: '555-TEST-001',
  };

  log('Creating owner...', ownerData);

  try {
    const response = await apiRequest('POST', '/api/v1/owners', ownerData);
    testData.ownerId = response.data.id || response.data.owner?.id;

    if (!testData.ownerId) {
      throw new Error('Owner ID not returned in response');
    }

    logSuccess(`Created test owner: ${testData.ownerId}`);
    return true;
  } catch (error) {
    logError(`Failed to create owner: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function step2_createWorkflow() {
  logStep(2, 'Creating test workflow');

  const workflowData = {
    name: `[TEST] Workflow System Test - ${Date.now()}`,
    description: 'Automated test workflow for system verification',
    objectType: 'pet',
    entryCondition: {
      triggerType: 'event',
      eventType: 'pet.created',
    },
    steps: [
      {
        id: 'step-1',
        type: 'action',
        config: {
          actionType: 'create_task',
          title: 'Welcome {{record.name}} to BarkBase!',
          description: 'New pet onboarding task created by workflow test',
          priority: 'medium',
          dueInDays: 7,
        },
        nextStepId: null,
      },
    ],
    settings: {
      allowReenrollment: false,
      timezone: 'America/New_York',
    },
  };

  log('Creating workflow...', workflowData);

  try {
    const response = await apiRequest('POST', '/api/v1/workflows', workflowData);
    testData.workflowId = response.data.id || response.data.workflow?.id;

    if (!testData.workflowId) {
      throw new Error('Workflow ID not returned in response');
    }

    logSuccess(`Created workflow: ${testData.workflowId}`);
    if (VERBOSE) {
      log('Workflow response:', response.data);
    }
    return true;
  } catch (error) {
    logError(`Failed to create workflow: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function step3_activateWorkflow() {
  logStep(3, 'Activating workflow');

  log(`Activating workflow ${testData.workflowId}...`);

  try {
    const response = await apiRequest(
      'POST',
      `/api/v1/workflows/${testData.workflowId}/activate`
    );

    const status = response.data.status || response.data.workflow?.status;

    if (status !== 'active') {
      throw new Error(`Workflow status is "${status}", expected "active"`);
    }

    logSuccess(`Workflow activated successfully`);
    return true;
  } catch (error) {
    logError(`Failed to activate workflow: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function step4_createTestPet() {
  logStep(4, 'Creating test pet to trigger workflow');

  const petName = `TestDog-${Date.now()}`;
  const petData = {
    name: petName,
    species: 'dog',
    breed: 'Golden Retriever',
    ownerId: testData.ownerId,
    dateOfBirth: '2022-01-15',
    gender: 'male',
    weight: 65,
    color: 'Golden',
  };

  log('Creating pet...', petData);

  try {
    const response = await apiRequest('POST', '/api/v1/pets', petData);
    testData.petId = response.data.id || response.data.pet?.id;
    testData.petName = petName;

    if (!testData.petId) {
      throw new Error('Pet ID not returned in response');
    }

    logSuccess(`Created pet: ${testData.petId} (${petName})`);
    log('This should trigger the workflow via pet.created event');
    return true;
  } catch (error) {
    logError(`Failed to create pet: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function step5_waitForProcessing() {
  logStep(5, 'Waiting for workflow processing');

  const waitTime = 30;
  log(`Waiting ${waitTime} seconds for SQS processing and workflow execution...`);

  for (let i = waitTime; i > 0; i--) {
    process.stdout.write(`\r  Time remaining: ${i} seconds   `);
    await sleep(1000);
  }
  process.stdout.write('\r  Processing time complete.       \n');

  logSuccess('Wait complete');
  return true;
}

async function step6_verifyExecution() {
  logStep(6, 'Verifying workflow execution');

  log('Checking for workflow execution record...');

  try {
    // Check workflow executions for this pet
    const executionsResponse = await apiRequest(
      'GET',
      `/api/v1/workflows/${testData.workflowId}/executions?recordId=${testData.petId}`
    );

    const executions = executionsResponse.data.executions || executionsResponse.data || [];

    if (VERBOSE) {
      log('Executions response:', executionsResponse.data);
    }

    if (!Array.isArray(executions) || executions.length === 0) {
      logError('No workflow execution found for the test pet');
      log('This could mean:');
      log('  1. The SQS trigger event was not published');
      log('  2. The workflow-trigger-processor did not process the event');
      log('  3. The workflow matching criteria failed');
      return false;
    }

    const execution = executions[0];
    testData.executionId = execution.id;

    log(`Found execution: ${execution.id}`);
    log(`  Status: ${execution.status}`);
    log(`  Started: ${execution.started_at || execution.startedAt}`);

    if (execution.status === 'completed') {
      logSuccess('Workflow execution completed successfully!');
    } else if (execution.status === 'active' || execution.status === 'in_progress') {
      log('Workflow execution is still in progress');
    } else if (execution.status === 'failed') {
      logError('Workflow execution failed');
      return false;
    }

    return true;
  } catch (error) {
    logError(`Failed to verify execution: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function step7_verifyExecutionLogs() {
  logStep(7, 'Checking workflow execution logs');

  if (!testData.executionId) {
    log('No execution ID available, skipping log check');
    return true;
  }

  try {
    const logsResponse = await apiRequest(
      'GET',
      `/api/v1/workflows/executions/${testData.executionId}/logs`
    );

    const logs = logsResponse.data.logs || logsResponse.data || [];

    if (VERBOSE) {
      log('Execution logs:', logs);
    }

    log(`Found ${logs.length} log entries`);

    for (const logEntry of logs) {
      const status = logEntry.status || logEntry.result;
      const stepId = logEntry.step_id || logEntry.stepId;
      log(`  Step ${stepId}: ${status}`);
    }

    const completedSteps = logs.filter(l =>
      (l.status === 'completed' || l.result === 'success')
    );

    if (completedSteps.length > 0) {
      logSuccess(`${completedSteps.length} step(s) completed successfully`);
    }

    return true;
  } catch (error) {
    logError(`Failed to get execution logs: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function step8_verifyTaskCreated() {
  logStep(8, 'Verifying task was created with interpolated pet name');

  const expectedTitle = `Welcome ${testData.petName} to BarkBase!`;
  log(`Looking for task with title: "${expectedTitle}"`);

  try {
    // Search for tasks that might have been created
    const tasksResponse = await apiRequest(
      'GET',
      `/api/v1/tasks?search=${encodeURIComponent(testData.petName)}&limit=10`
    );

    const tasks = tasksResponse.data.tasks || tasksResponse.data || [];

    if (VERBOSE) {
      log('Tasks response:', tasksResponse.data);
    }

    // Find the task with our expected title
    const matchingTask = tasks.find(t =>
      t.title && t.title.includes(testData.petName)
    );

    if (matchingTask) {
      testData.taskId = matchingTask.id;
      logSuccess(`Found task: ${matchingTask.id}`);
      log(`  Title: ${matchingTask.title}`);
      log(`  Status: ${matchingTask.status}`);
      log(`  Priority: ${matchingTask.priority}`);

      if (matchingTask.title === expectedTitle) {
        logSuccess('Task title matches expected interpolated value!');
      } else {
        log(`Note: Title "${matchingTask.title}" differs slightly from expected`);
      }

      return true;
    } else {
      logError('No matching task found');
      log('This could mean:');
      log('  1. The create_task action did not execute');
      log('  2. Template interpolation failed');
      log('  3. The task was created but search did not find it');

      // Try to list recent tasks for debugging
      log('\nListing recent tasks for debugging...');
      const recentTasks = await apiRequest('GET', '/api/v1/tasks?limit=5&sort=-createdAt');
      if (recentTasks.data.tasks) {
        for (const task of recentTasks.data.tasks) {
          log(`  - ${task.id}: ${task.title}`);
        }
      }

      return false;
    }
  } catch (error) {
    logError(`Failed to verify task: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function step9_cleanup() {
  logStep(9, 'Cleaning up test data');

  if (SKIP_CLEANUP) {
    log('Cleanup skipped (--skip-cleanup flag set)');
    log('Test data IDs for manual cleanup:');
    log(`  Workflow: ${testData.workflowId}`);
    log(`  Pet: ${testData.petId}`);
    log(`  Owner: ${testData.ownerId}`);
    log(`  Task: ${testData.taskId}`);
    log(`  Execution: ${testData.executionId}`);
    return true;
  }

  const cleanupItems = [
    { name: 'Task', id: testData.taskId, endpoint: '/api/v1/tasks' },
    { name: 'Pet', id: testData.petId, endpoint: '/api/v1/pets' },
    { name: 'Workflow', id: testData.workflowId, endpoint: '/api/v1/workflows' },
    { name: 'Owner', id: testData.ownerId, endpoint: '/api/v1/owners' },
  ];

  for (const item of cleanupItems) {
    if (item.id) {
      try {
        await apiRequest('DELETE', `${item.endpoint}/${item.id}`);
        log(`Deleted ${item.name}: ${item.id}`);
      } catch (error) {
        log(`Failed to delete ${item.name} ${item.id}: ${error.message}`);
      }
    }
  }

  logSuccess('Cleanup complete');
  return true;
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║         BarkBase Workflow System End-to-End Test                  ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_URL.padEnd(54)} ║`);
  console.log(`║  Verbose: ${String(VERBOSE).padEnd(54)} ║`);
  console.log(`║  Skip Cleanup: ${String(SKIP_CLEANUP).padEnd(49)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const results = {
    step1_createOwner: false,
    step2_createWorkflow: false,
    step3_activateWorkflow: false,
    step4_createPet: false,
    step5_wait: false,
    step6_verifyExecution: false,
    step7_verifyLogs: false,
    step8_verifyTask: false,
    step9_cleanup: false,
  };

  try {
    // Run test steps
    results.step1_createOwner = await step1_createTestOwner();
    if (!results.step1_createOwner) throw new Error('Step 1 failed');

    results.step2_createWorkflow = await step2_createWorkflow();
    if (!results.step2_createWorkflow) throw new Error('Step 2 failed');

    results.step3_activateWorkflow = await step3_activateWorkflow();
    if (!results.step3_activateWorkflow) throw new Error('Step 3 failed');

    results.step4_createPet = await step4_createTestPet();
    if (!results.step4_createPet) throw new Error('Step 4 failed');

    results.step5_wait = await step5_waitForProcessing();

    results.step6_verifyExecution = await step6_verifyExecution();
    results.step7_verifyLogs = await step7_verifyExecutionLogs();
    results.step8_verifyTask = await step8_verifyTaskCreated();

  } catch (error) {
    logError(`Test aborted: ${error.message}`);
  } finally {
    // Always try to clean up
    results.step9_cleanup = await step9_cleanup();
  }

  // Print summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                         TEST RESULTS                              ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');

  const stepNames = {
    step1_createOwner: 'Create Test Owner',
    step2_createWorkflow: 'Create Workflow',
    step3_activateWorkflow: 'Activate Workflow',
    step4_createPet: 'Create Test Pet (Trigger)',
    step5_wait: 'Wait for Processing',
    step6_verifyExecution: 'Verify Execution Record',
    step7_verifyLogs: 'Verify Execution Logs',
    step8_verifyTask: 'Verify Task Created',
    step9_cleanup: 'Cleanup Test Data',
  };

  let passed = 0;
  let failed = 0;

  for (const [key, result] of Object.entries(results)) {
    const name = stepNames[key] || key;
    const status = result ? '\x1b[32m✓ PASS\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m';
    console.log(`║  ${name.padEnd(40)} ${status}        ║`);
    if (result) passed++; else failed++;
  }

  console.log('╠═══════════════════════════════════════════════════════════════════╣');

  const overallResult = failed === 0 ?
    '\x1b[32m ALL TESTS PASSED \x1b[0m' :
    `\x1b[31m ${failed} TEST(S) FAILED \x1b[0m`;

  console.log(`║  Total: ${passed}/${passed + failed} passed                      ${overallResult}   ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// =============================================================================
// Run
// =============================================================================

runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
