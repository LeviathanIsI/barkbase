/**
 * Flow Scheduler
 * Handles scheduled and recurring workflow triggers
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const { listFlows, createRun, TRIGGER_TYPES } = require('../services/handlerFlow.service');
const { shouldEnroll, buildContext } = require('../services/criteriaEvaluator');
const prisma = require('../config/prisma');

// Store active cron jobs
const activeJobs = new Map();

/**
 * Parse schedule trigger config to cron expression
 */
const parseToCronExpression = (scheduleTrigger) => {
  const { type, cron: cronExpr, atTime, daysOfWeek, dayOfMonth, intervalMinutes } = scheduleTrigger;

  switch (type) {
    case 'cron':
      return cronExpr;

    case 'daily': {
      // Daily at specific time (e.g., "14:30" -> "30 14 * * *")
      const [hours, minutes] = (atTime || '09:00').split(':');
      return `${minutes} ${hours} * * *`;
    }

    case 'weekly': {
      // Weekly on specific days at specific time
      const [hours, minutes] = (atTime || '09:00').split(':');
      const days = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek.join(',') : '*';
      return `${minutes} ${hours} * * ${days}`;
    }

    case 'monthly': {
      // Monthly on specific day at specific time
      const [hours, minutes] = (atTime || '09:00').split(':');
      const day = dayOfMonth || 1;
      return `${minutes} ${hours} ${day} * *`;
    }

    case 'interval': {
      // Interval in minutes (special handling - use setTimeout instead)
      return null; // Will be handled separately
    }

    default:
      return null;
  }
};

/**
 * Check if a subject should be re-enrolled based on cooldown
 */
const checkReEnrollmentCooldown = async (flowId, subjectKey, cooldownMinutes) => {
  if (!cooldownMinutes || cooldownMinutes === 0) {
    return true; // No cooldown - allow
  }

  const cutoffTime = new Date(Date.now() - cooldownMinutes * 60_000);

  const recentRun = await prisma.handlerRun.findFirst({
    where: {
      flowId,
      triggerType: TRIGGER_TYPES.SCHEDULE,
      createdAt: { gte: cutoffTime },
      context: {
        path: ['payload', 'subjectKey'],
        equals: subjectKey,
      },
    },
  });

  return !recentRun; // Allow if no recent run found
};

/**
 * Process a scheduled trigger
 */
const processScheduledTrigger = async (flow) => {
  try {
    const { definition } = flow;
    const trigger = definition.trigger;

    if (!trigger || !trigger.scheduleTrigger) {
      return;
    }

    const { reEnrollment, cooldownMinutes } = trigger.scheduleTrigger;

    // Get subjects to enroll (this would come from your data source)
    // For now, we'll create a placeholder - in production, you'd query based on criteria
    const subjects = await getEnrollmentSubjects(flow);

    for (const subject of subjects) {
      const subjectKey = `${subject.type}:${subject.id}`;

      // Check re-enrollment policy
      if (reEnrollment === 'disallow') {
        const existingRun = await prisma.handlerRun.findFirst({
          where: {
            flowId: flow.id,
            triggerType: TRIGGER_TYPES.SCHEDULE,
          },
        });

        if (existingRun) {
          logger.debug({ flowId: flow.id, subjectKey }, 'Skipping re-enrollment (disallow)');
          continue;
        }
      } else if (reEnrollment === 'cooldown') {
        const canEnroll = await checkReEnrollmentCooldown(flow.id, subjectKey, cooldownMinutes);
        if (!canEnroll) {
          logger.debug({ flowId: flow.id, subjectKey }, 'Skipping re-enrollment (cooldown)');
          continue;
        }
      }

      // Build context for enrollment check
      const context = buildContext(subject, {
        triggerType: TRIGGER_TYPES.SCHEDULE,
      });

      // Check enrollment criteria
      if (!shouldEnroll(trigger, context)) {
        logger.debug({ flowId: flow.id, subjectKey }, 'Subject does not meet enrollment criteria');
        continue;
      }

      // Create run
      try {
        const result = await createRun({
          tenantId: flow.tenantId,
          flowId: flow.id,
          payload: subject,
          idempotencyKey: null, // Allow multiple scheduled runs
          triggerType: TRIGGER_TYPES.SCHEDULE,
        });

        logger.info(
          { flowId: flow.id, runId: result.runId, subjectKey, created: result.created },
          'Scheduled run created'
        );
      } catch (error) {
        logger.error({ err: error, flowId: flow.id, subjectKey }, 'Failed to create scheduled run');
      }
    }
  } catch (error) {
    logger.error({ err: error, flowId: flow.id }, 'Error processing scheduled trigger');
  }
};

/**
 * Get subjects for enrollment (placeholder)
 * In production, this would query your database based on the flow's criteria
 */
const getEnrollmentSubjects = async (flow) => {
  // This is a placeholder - you would implement logic to find subjects
  // based on the flow's trigger criteria

  // For example, for a "New Owner" flow, you'd query recent owners
  // For a "Booking Reminder" flow, you'd query upcoming bookings

  // Example:
  // const owners = await prisma.owner.findMany({
  //   where: { createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } },
  //   take: 100
  // });
  // return owners.map(o => ({ type: 'owner', id: o.id, ...o }));

  return []; // Return empty for now
};

/**
 * Schedule a flow
 */
const scheduleFlow = (flow) => {
  const { id, tenantId, definition } = flow;
  const trigger = definition?.trigger?.scheduleTrigger;

  if (!trigger) {
    return;
  }

  // Stop existing job if any
  if (activeJobs.has(id)) {
    activeJobs.get(id).stop();
    activeJobs.delete(id);
  }

  const cronExpression = parseToCronExpression(trigger);

  if (trigger.type === 'interval' && trigger.intervalMinutes) {
    // Handle interval-based scheduling with setInterval
    const intervalMs = trigger.intervalMinutes * 60_000;

    const intervalId = setInterval(() => {
      processScheduledTrigger(flow);
    }, intervalMs);

    // Store as a pseudo-job
    activeJobs.set(id, {
      stop: () => clearInterval(intervalId),
      type: 'interval',
    });

    logger.info({ flowId: id, intervalMinutes: trigger.intervalMinutes }, 'Scheduled interval trigger');
  } else if (cronExpression && cron.validate(cronExpression)) {
    // Schedule with cron
    const job = cron.schedule(cronExpression, () => {
      processScheduledTrigger(flow);
    });

    activeJobs.set(id, job);

    logger.info({ flowId: id, cron: cronExpression }, 'Scheduled cron trigger');
  } else {
    logger.warn({ flowId: id, trigger }, 'Invalid schedule trigger configuration');
  }
};

/**
 * Unschedule a flow
 */
const unscheduleFlow = (flowId) => {
  if (activeJobs.has(flowId)) {
    const job = activeJobs.get(flowId);
    if (typeof job.stop === 'function') {
      job.stop();
    }
    activeJobs.delete(flowId);
    logger.info({ flowId }, 'Unscheduled flow');
  }
};

/**
 * Load and schedule all active flows with schedule triggers
 */
const loadScheduledFlows = async () => {
  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true },
    });

    for (const tenant of tenants) {
      const flows = await listFlows({ tenantId: tenant.id, status: 'on' });

      for (const flow of flows) {
        const fullFlow = await prisma.handlerFlow.findUnique({
          where: { id: flow.id },
        });

        if (fullFlow?.definition?.trigger?.scheduleTrigger) {
          scheduleFlow(fullFlow);
        }
      }
    }

    logger.info({ scheduledCount: activeJobs.size }, 'Scheduled flows loaded');
  } catch (error) {
    logger.error({ err: error }, 'Failed to load scheduled flows');
  }
};

/**
 * Start the scheduler
 */
const startScheduler = async () => {
  logger.info('Starting flow scheduler');
  await loadScheduledFlows();

  // Reload schedules every hour to pick up changes
  setInterval(loadScheduledFlows, 60 * 60 * 1000);
};

/**
 * Stop the scheduler
 */
const stopScheduler = () => {
  logger.info('Stopping flow scheduler');
  activeJobs.forEach((job, flowId) => {
    unscheduleFlow(flowId);
  });
};

module.exports = {
  startScheduler,
  stopScheduler,
  scheduleFlow,
  unscheduleFlow,
  loadScheduledFlows,
};
