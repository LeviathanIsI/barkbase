/**
 * Scheduler Utility
 *
 * Handles scheduling of delayed workflow step executions.
 * Uses AWS EventBridge Scheduler or a database-based fallback.
 */

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// SQS client for queuing
let sqsClient;
function getSqsClient() {
  if (!sqsClient) {
    sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return sqsClient;
}

const WORKFLOW_STEP_QUEUE_URL = process.env.WORKFLOW_STEP_QUEUE_URL;

/**
 * Schedule a workflow step to resume at a future time
 * @param {Object} params
 * @param {string} params.executionId - The execution ID
 * @param {string} params.workflowId - The workflow ID
 * @param {string} params.tenantId - The tenant ID
 * @param {string} params.stepId - The step ID to resume
 * @param {Date} params.resumeAt - When to resume
 */
async function scheduleStepResume({ executionId, workflowId, tenantId, stepId, resumeAt }) {
  const delaySeconds = Math.floor((resumeAt.getTime() - Date.now()) / 1000);

  // If delay is small enough, use SQS delay (max 15 minutes)
  if (delaySeconds > 0 && delaySeconds <= 900) {
    return await scheduleSqsDelay({
      executionId,
      workflowId,
      tenantId,
      stepId,
      delaySeconds,
    });
  }

  // For longer delays, use EventBridge Scheduler
  if (process.env.USE_EVENTBRIDGE_SCHEDULER === 'true') {
    return await scheduleEventBridge({
      executionId,
      workflowId,
      tenantId,
      stepId,
      resumeAt,
    });
  }

  // Fallback: Store in database and rely on a polling worker
  return await scheduleDatabase({
    executionId,
    workflowId,
    tenantId,
    stepId,
    resumeAt,
  });
}

/**
 * Schedule using SQS message delay
 */
async function scheduleSqsDelay({ executionId, workflowId, tenantId, stepId, delaySeconds }) {
  if (!WORKFLOW_STEP_QUEUE_URL) {
    console.log('[Scheduler] SQS queue not configured, using database fallback');
    return await scheduleDatabase({
      executionId,
      workflowId,
      tenantId,
      stepId,
      resumeAt: new Date(Date.now() + delaySeconds * 1000),
    });
  }

  const client = getSqsClient();

  const command = new SendMessageCommand({
    QueueUrl: WORKFLOW_STEP_QUEUE_URL,
    MessageBody: JSON.stringify({
      executionId,
      workflowId,
      tenantId,
      stepId,
      type: 'resume',
    }),
    DelaySeconds: delaySeconds,
    MessageGroupId: executionId, // For FIFO queues
    MessageDeduplicationId: `${executionId}-${stepId}-${Date.now()}`,
  });

  await client.send(command);

  console.log(`[Scheduler] Scheduled SQS resume for ${executionId} in ${delaySeconds}s`);

  return { scheduled: true, method: 'sqs', delaySeconds };
}

/**
 * Schedule using AWS EventBridge Scheduler
 */
async function scheduleEventBridge({ executionId, workflowId, tenantId, stepId, resumeAt }) {
  const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');

  const client = new SchedulerClient({ region: process.env.AWS_REGION || 'us-east-1' });

  const scheduleName = `workflow-resume-${executionId}-${stepId}`.replace(/[^a-zA-Z0-9-_]/g, '-');

  const command = new CreateScheduleCommand({
    Name: scheduleName,
    ScheduleExpression: `at(${resumeAt.toISOString().replace('.000Z', '')})`,
    FlexibleTimeWindow: { Mode: 'OFF' },
    Target: {
      Arn: process.env.WORKFLOW_STEP_LAMBDA_ARN,
      RoleArn: process.env.SCHEDULER_EXECUTION_ROLE_ARN,
      Input: JSON.stringify({
        executionId,
        workflowId,
        tenantId,
        stepId,
        type: 'resume',
      }),
    },
    State: 'ENABLED',
    ActionAfterCompletion: 'DELETE',
  });

  await client.send(command);

  console.log(`[Scheduler] Scheduled EventBridge resume for ${executionId} at ${resumeAt.toISOString()}`);

  return { scheduled: true, method: 'eventbridge', scheduleName, resumeAt: resumeAt.toISOString() };
}

/**
 * Store schedule in database for polling worker
 */
async function scheduleDatabase({ executionId, workflowId, tenantId, stepId, resumeAt }) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await prisma.scheduledJob.create({
      data: {
        job_type: 'workflow_resume',
        tenant_id: tenantId,
        scheduled_for: resumeAt,
        status: 'pending',
        payload: {
          executionId,
          workflowId,
          stepId,
        },
      },
    });

    console.log(`[Scheduler] Stored database schedule for ${executionId} at ${resumeAt.toISOString()}`);

    return { scheduled: true, method: 'database', resumeAt: resumeAt.toISOString() };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Process due scheduled jobs (called by a polling worker)
 */
async function processDueScheduledJobs() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const now = new Date();

    // Find due jobs
    const dueJobs = await prisma.scheduledJob.findMany({
      where: {
        job_type: 'workflow_resume',
        status: 'pending',
        scheduled_for: { lte: now },
      },
      take: 100, // Process in batches
    });

    console.log(`[Scheduler] Found ${dueJobs.length} due scheduled jobs`);

    for (const job of dueJobs) {
      try {
        // Mark as processing
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: { status: 'processing' },
        });

        // Queue the step for processing
        const { queueStepExecution } = require('../api/workflows');
        await queueStepExecution(
          job.payload.executionId,
          job.payload.workflowId,
          job.tenant_id,
          job.payload.stepId
        );

        // Mark as completed
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completed_at: new Date(),
          },
        });
      } catch (error) {
        console.error(`[Scheduler] Error processing job ${job.id}:`, error);

        // Mark as failed
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: error.message,
          },
        });
      }
    }

    return { processed: dueJobs.length };
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  scheduleStepResume,
  processDueScheduledJobs,
};
