/**
 * Workflow Worker
 *
 * Local worker for processing workflow queues during development.
 * In production, this is replaced by Lambda functions triggered by SQS.
 *
 * Usage:
 *   node src/workers/workflow-worker.js
 */

const { PrismaClient } = require('@prisma/client');
const { processStepMessage } = require('../services/workflow-step-processor');
const { processScheduledTriggers } = require('../services/workflow-trigger-evaluator');
const { processDueScheduledJobs } = require('../lib/scheduler');

const prisma = new PrismaClient();

// Worker configuration
const POLL_INTERVAL = 5000; // 5 seconds
const BATCH_SIZE = 10;

let isRunning = false;

/**
 * Start the workflow worker
 */
async function startWorker() {
  console.log('[WorkflowWorker] Starting workflow worker...');

  isRunning = true;

  // Process loop
  while (isRunning) {
    try {
      // Process pending step executions from database queue
      await processStepQueue();

      // Process scheduled triggers
      await processScheduledTriggers();

      // Process due scheduled jobs (waits/delays)
      await processDueScheduledJobs();
    } catch (error) {
      console.error('[WorkflowWorker] Error in worker loop:', error);
    }

    // Wait before next poll
    await sleep(POLL_INTERVAL);
  }

  console.log('[WorkflowWorker] Worker stopped');
}

/**
 * Process pending step executions from database
 */
async function processStepQueue() {
  // Find executions that need processing
  const executions = await prisma.workflowExecution.findMany({
    where: {
      status: 'running',
      // Has a current step to process
      current_step_id: { not: null },
      // Not recently processed (prevent tight loop)
      OR: [
        { last_processed_at: null },
        { last_processed_at: { lt: new Date(Date.now() - 1000) } },
      ],
    },
    take: BATCH_SIZE,
    orderBy: { created_at: 'asc' },
  });

  if (executions.length > 0) {
    console.log(`[WorkflowWorker] Processing ${executions.length} step executions`);
  }

  for (const execution of executions) {
    try {
      // Mark as being processed
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { last_processed_at: new Date() },
      });

      // Process the step
      await processStepMessage({
        executionId: execution.id,
        workflowId: execution.workflow_id,
        tenantId: execution.tenant_id,
        stepId: execution.current_step_id,
      });
    } catch (error) {
      console.error(`[WorkflowWorker] Error processing execution ${execution.id}:`, error);
    }
  }

  // Process waiting executions that are ready to resume
  const waitingExecutions = await prisma.workflowExecution.findMany({
    where: {
      status: 'waiting',
      scheduled_at: { lte: new Date() },
    },
    take: BATCH_SIZE,
  });

  if (waitingExecutions.length > 0) {
    console.log(`[WorkflowWorker] Resuming ${waitingExecutions.length} waiting executions`);
  }

  for (const execution of waitingExecutions) {
    try {
      // Update status to running
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'running' },
      });

      // Process the current step
      await processStepMessage({
        executionId: execution.id,
        workflowId: execution.workflow_id,
        tenantId: execution.tenant_id,
        stepId: execution.current_step_id,
      });
    } catch (error) {
      console.error(`[WorkflowWorker] Error resuming execution ${execution.id}:`, error);
    }
  }
}

/**
 * Stop the worker gracefully
 */
function stopWorker() {
  console.log('[WorkflowWorker] Stopping worker...');
  isRunning = false;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle shutdown signals
process.on('SIGINT', () => {
  stopWorker();
});

process.on('SIGTERM', () => {
  stopWorker();
});

// Start the worker if run directly
if (require.main === module) {
  startWorker().catch(error => {
    console.error('[WorkflowWorker] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  startWorker,
  stopWorker,
  processStepQueue,
};
