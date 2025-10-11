const crypto = require('crypto');
const { sendMail } = require('../lib/mailer');
const logger = require('../utils/logger');
const {
  claimNextJob,
  getRunWithFlow,
  appendRunLog,
  updateRun,
  deleteJob,
  createJob,
  getTenantPlan,
  rescheduleJob,
} = require('../services/handlerFlow.service');
const { resolvePlanFeatures } = require('../lib/features');
const jsonLogic = require('json-logic-js');

const WORKER_ID = process.env.HANDLER_WORKER_ID || `handler-${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.HANDLER_WORKER_INTERVAL_MS ?? 2000);
const STEP_TIMEOUT_MS = Number(process.env.HANDLER_WORKER_STEP_TIMEOUT_MS ?? 15000);

const RETRY_SCHEDULE = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseDuration = (iso) => {
  if (!iso || typeof iso !== 'string') {
    throw new Error('Delay step missing duration');
  }
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match) {
    throw new Error(`Unsupported duration format: ${iso}`);
  }
  const [, days, hours, minutes, seconds] = match.map((value) => Number(value ?? 0));
  const totalSeconds = days * 86_400 + hours * 3_600 + minutes * 60 + seconds;
  if (totalSeconds <= 0) {
    throw new Error(`Delay must be greater than zero: ${iso}`);
  }
  return totalSeconds * 1000;
};

const allowedActionsByPlan = {
  FREE: new Set(['record.update', 'note.append']),
  PRO: new Set(['record.update', 'note.append', 'email.send', 'delay', 'task.create', 'webhook.post']),
  ENTERPRISE: new Set([
    'record.update',
    'note.append',
    'email.send',
    'delay',
    'task.create',
    'webhook.post',
    'sms.send',
  ]),
};

const jitter = (ms) => {
  const variance = Math.floor(ms * 0.1);
  return ms + Math.floor(Math.random() * variance);
};

const isActionAllowed = (plan, actionType) => {
  const allowance = allowedActionsByPlan[plan] ?? allowedActionsByPlan.FREE;
  if (actionType === 'delay') {
    return allowance.has('delay');
  }
  return allowance.has(actionType);
};

const evaluateExpression = (expression, context) => {
  if (!expression) return true;
  if (!/^[0-9a-zA-Z_\.\s><=!&|()+'",\-/*%]+$/.test(expression)) {
    throw new Error('Unsupported characters in condition expression');
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function('context', `return (${expression});`);
  return Boolean(fn(context));
};

const evaluateCondition = (step, context) => {
  const { config = {} } = step;
  if (config.logic) {
    return Boolean(jsonLogic.apply(config.logic, context));
  }
  if (config.expression) {
    return evaluateExpression(config.expression, context);
  }
  if (typeof config.path === 'string') {
    const value = config.path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), context);
    if (config.equals !== undefined) {
      return value === config.equals;
    }
    return Boolean(value);
  }
  return true;
};

const applyContextMutation = (context, mutation = {}) => {
  if (!mutation || typeof mutation !== 'object') {
    return context;
  }
  return {
    ...context,
    ...mutation,
  };
};

const executeEmail = async ({ tenantId, step, context }) => {
  const { config = {} } = step;
  const to = config.to ?? context?.payload?.owner?.email;
  if (!to) {
    throw new Error('email.send missing recipient');
  }
  const subject = config.subject ?? 'Notification';
  const html = config.html ?? null;
  const text = config.text ?? (html ? null : config.body ?? 'Automated notification from BarkBase');

  await sendMail({
    to,
    subject,
    text,
    html: html ?? undefined,
  });

  return { to, subject };
};

const executeRecordUpdate = async ({ config = {}, context }) => {
  const nextContext = config.assign ? applyContextMutation(context, config.assign) : context;
  return { context: nextContext, summary: 'record.update executed (no-op placeholder)' };
};

const executeNoteAppend = async ({ config = {} }) => ({
  note: config.note ?? 'Appended note',
});

const executeAction = async ({ plan, tenantId, step, context }) => {
  const { config = {} } = step;
  const actionType = config.actionType ?? 'record.update';
  if (!isActionAllowed(plan, actionType)) {
    const error = new Error(`Action ${actionType} not allowed for plan ${plan}`);
    error.code = 'PLAN_LIMIT';
    throw error;
  }

  switch (actionType) {
    case 'email.send':
      return {
        output: await executeEmail({ tenantId, step, context }),
        context,
      };
    case 'record.update':
      return {
        output: await executeRecordUpdate({ config, context }),
        context: config.assign ? applyContextMutation(context, config.assign) : context,
      };
    case 'note.append':
      return {
        output: await executeNoteAppend({ config }),
        context,
      };
    case 'task.create':
    case 'webhook.post':
    case 'sms.send':
      return {
        output: { summary: `${actionType} stubbed` },
        context,
      };
    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
};

const stepMapFromFlow = (flow) => {
  const steps = flow?.handler_steps ?? [];
  const map = new Map();
  steps.forEach((step) => {
    map.set(step.id, step);
  });
  return map;
};

const determineNextStep = (step, conditionResult) => {
  if (step.kind === 'condition' || step.kind === 'branch') {
    return conditionResult ? step.next_id : step.alt_next_id;
  }
  return step.next_id;
};

const logAndFailRun = async ({ tenantId, runId, stepId, error, jobId }) => {
  await appendRunLog({
    tenantId,
    runId,
    stepId,
    level: 'error',
    message: error.message ?? 'Handler step failed',
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
  });

  await updateRun({
    tenantId,
    runId,
    patch: {
      status: 'failed',
      finished_at: new Date().toISOString(),
    },
  });

  if (jobId) {
    await deleteJob(jobId);
  }
};

const executeStepChain = async ({ job, run, flow, planInfo }) => {
  const tenantId = job.tenant_id;
  const runId = job.run_id;
  const stepMap = stepMapFromFlow(flow);
  const entryStepId =
    job.payload?.stepId ??
    run.current_step_id ??
    flow.definition?.entryStepId ??
    flow.handler_steps?.[0]?.id;
  if (!entryStepId) {
    throw new Error('Flow definition missing entry step');
  }

  let currentContext = run.context ?? { triggerType: run.trigger_type, payload: {} };
  let currentStepId = entryStepId;
  let iterations = 0;

  await updateRun({
    tenantId,
    runId,
    patch: {
      status: 'running',
      started_at: run.started_at ?? new Date().toISOString(),
      current_step_id: currentStepId,
    },
  });

  while (currentStepId) {
    iterations += 1;
    if (iterations > 200) {
      throw new Error('Handler execution exceeded maximum step depth');
    }

    const step = stepMap.get(currentStepId);
    if (!step) {
      throw new Error(`Step ${currentStepId} missing from flow definition`);
    }

    const startedAt = Date.now();

    try {
      switch (step.kind) {
        case 'condition': {
          const result = evaluateCondition(step, currentContext);
          await appendRunLog({
            tenantId,
            runId,
            stepId: step.id,
            level: 'info',
            message: `Condition evaluated to ${result}`,
            input: { context: currentContext },
            output: { result },
          });
          currentStepId = determineNextStep(step, result);
          await updateRun({
            tenantId,
            runId,
            patch: {
              current_step_id: currentStepId,
              context: currentContext,
            },
          });
          break;
        }
        case 'delay': {
          if (!isActionAllowed(planInfo.plan, 'delay')) {
            throw Object.assign(new Error('Delay action not allowed for current plan'), { code: 'PLAN_LIMIT' });
          }
          const durationMs = parseDuration(step.config?.duration ?? 'PT1M');
          const dueAt = new Date(Date.now() + durationMs).toISOString();
          await createJob({
            tenantId,
            runId,
            stepId: step.next_id,
            dueAt,
            payload: {
              stepId: step.next_id,
            },
          });
          await appendRunLog({
            tenantId,
            runId,
            stepId: step.id,
            level: 'info',
            message: `Delay scheduled for ${step.config?.duration ?? 'PT1M'}`,
            output: { dueAt },
          });
          await updateRun({
            tenantId,
            runId,
            patch: {
              status: 'queued',
              current_step_id: step.next_id,
              context: currentContext,
            },
          });
          await deleteJob(job.id);
          return;
        }
        case 'action': {
          const actionResult = await executeAction({
            plan: planInfo.plan,
            tenantId,
            step,
            context: currentContext,
          });
          currentContext = actionResult.context ?? currentContext;
          await appendRunLog({
            tenantId,
            runId,
            stepId: step.id,
            level: 'info',
            message: `Action ${step.config?.actionType ?? 'record.update'} executed`,
            input: { context: run.context },
            output: actionResult.output,
          });
          currentStepId = step.next_id;
          await updateRun({
            tenantId,
            runId,
            patch: {
              current_step_id: currentStepId,
              context: currentContext,
            },
          });
          break;
        }
        case 'branch': {
          const result = evaluateCondition(step, currentContext);
          await appendRunLog({
            tenantId,
            runId,
            stepId: step.id,
            level: 'info',
            message: `Branch evaluated to ${result}`,
            input: { context: currentContext },
            output: { result },
          });
          currentStepId = determineNextStep(step, result);
          await updateRun({
            tenantId,
            runId,
            patch: {
              current_step_id: currentStepId,
              context: currentContext,
            },
          });
          break;
        }
        default:
          throw new Error(`Unsupported step kind ${step.kind}`);
      }
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed > STEP_TIMEOUT_MS) {
        logger.warn(
          { runId, stepId: step.id, elapsed },
          'Handler step exceeded soft timeout threshold',
        );
      }
    }
  }

  await appendRunLog({
    tenantId,
    runId,
    level: 'info',
    message: 'Run completed successfully',
  });
  await updateRun({
    tenantId,
    runId,
    patch: {
      status: 'succeeded',
      finished_at: new Date().toISOString(),
    },
  });
  await deleteJob(job.id);
};

const computeBackoffDelay = (attempts) => {
  const index = Math.min(attempts, RETRY_SCHEDULE.length - 1);
  return jitter(RETRY_SCHEDULE[index]);
};

const processJob = async () => {
  const job = await claimNextJob({ workerId: WORKER_ID });
  if (!job) {
    return false;
  }

  try {
    const run = await getRunWithFlow({ tenantId: job.tenant_id, runId: job.run_id });
    const flow = Array.isArray(run.handler_flows) ? run.handler_flows[0] : run.handler_flows;
    if (!flow) {
      throw new Error('Associated flow not found for run');
    }

    const planInfo = await getTenantPlan(job.tenant_id);

    await executeStepChain({
      job,
      run,
      flow,
      planInfo,
    });
    return true;
  } catch (error) {
    logger.error(
      { err: error, jobId: job.id, runId: job.run_id },
      'Handler worker encountered error',
    );

    if (error.code === 'PLAN_LIMIT') {
      await logAndFailRun({
        tenantId: job.tenant_id,
        runId: job.run_id,
        stepId: job.payload?.stepId ?? null,
        error,
        jobId: job.id,
      });
      return false;
    }

    if (job.attempts >= job.max_attempts) {
      await logAndFailRun({
        tenantId: job.tenant_id,
        runId: job.run_id,
        stepId: job.payload?.stepId ?? null,
        error,
        jobId: job.id,
      });
      return false;
    }

    const delayMs = computeBackoffDelay(job.attempts);
    await appendRunLog({
      tenantId: job.tenant_id,
      runId: job.run_id,
      stepId: job.payload?.stepId ?? null,
      level: 'warn',
      message: `Retry scheduled in ${Math.round(delayMs / 1000)}s`,
      error: {
        message: error.message,
        code: error.code,
      },
    });

    await rescheduleJob({
      jobId: job.id,
      delayMs,
    });
    return false;
  }
};

const runLoop = async () => {
  logger.info({ workerId: WORKER_ID }, 'Handler worker booted');

  while (true) {
    try {
      const processed = await processJob();
      if (!processed) {
        await wait(POLL_INTERVAL_MS);
      }
    } catch (error) {
      logger.error({ err: error }, 'Handler worker loop failure');
      await wait(POLL_INTERVAL_MS);
    }
  }
};

if (require.main === module) {
  runLoop();
}

module.exports = {
  runLoop,
  processJob,
  parseDuration,
};
