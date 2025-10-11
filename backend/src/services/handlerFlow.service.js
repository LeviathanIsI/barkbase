const crypto = require('crypto');
const { resolvePlanFeatures } = require('../lib/features');
const { getClientOrThrow, mapError } = require('../lib/supabaseAdmin');

const STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

const RUN_STATUS = {
  QUEUED: 'queued',
};

const TRIGGER_TYPES = {
  EVENT: 'event',
  SCHEDULE: 'schedule',
  MANUAL: 'manual',
};

const STEP_KINDS = ['condition', 'action', 'delay', 'branch'];

const sanitizeSteps = (steps = [], flowId, tenantId) =>
  steps.map((step) => ({
    id: step.id || crypto.randomUUID(),
    tenant_id: tenantId,
    flow_id: flowId,
    kind: STEP_KINDS.includes(step.kind) ? step.kind : 'action',
    name: step.name || 'Step',
    config: step.config ?? {},
    next_id: step.nextId ?? null,
    alt_next_id: step.altNextId ?? null,
  }));

const hashPayload = (payload) =>
  crypto.createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');

const buildRunKey = (flowId, flowVersion, idempotencyKey) =>
  `${flowId}:${flowVersion}:${idempotencyKey}`;

const ensureEntryStep = (definition) => {
  if (!definition || !definition.entryStepId) {
    throw Object.assign(new Error('definition.entryStepId is required'), { statusCode: 400 });
  }
};

const createDraftFlow = async ({ tenantId, name, trigger, steps = [], definition = {}, userId }) => {
  const supabase = getClientOrThrow();

  ensureEntryStep(definition);

  const flowInsert = {
    tenant_id: tenantId,
    name,
    status: STATUS.DRAFT,
    definition,
    version: definition.version ?? 1,
    created_by: userId ?? null,
    updated_by: userId ?? null,
  };

  const { data: flowData, error: flowError } = await supabase
    .from('handler_flows')
    .insert(flowInsert)
    .select()
    .single();
  if (flowError) throw mapError(flowError);

  const triggerInsert = {
    tenant_id: tenantId,
    flow_id: flowData.id,
    type: trigger?.type ?? TRIGGER_TYPES.EVENT,
    config: trigger?.config ?? {},
  };

  const { error: triggerError } = await supabase.from('handler_triggers').insert(triggerInsert);
  if (triggerError) throw mapError(triggerError);

  if (Array.isArray(steps) && steps.length > 0) {
    const stepInsert = sanitizeSteps(steps, flowData.id, tenantId);
    const { error: stepError } = await supabase.from('handler_steps').insert(stepInsert);
    if (stepError) throw mapError(stepError);
  }

  return flowData;
};

const publishFlow = async ({ tenantId, flowId, userId }) => {
  const supabase = getClientOrThrow();

  const { data: flow, error: flowError } = await supabase
    .from('handler_flows')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('id', flowId)
    .single();
  if (flowError) throw mapError(flowError);

  if (flow.status === STATUS.PUBLISHED) {
    return flow;
  }

  const { data: updated, error: updateError } = await supabase
    .from('handler_flows')
    .update({
      status: STATUS.PUBLISHED,
      updated_by: userId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', flowId)
    .select()
    .single();
  if (updateError) throw mapError(updateError);

  return updated;
};

const listFlows = async ({ tenantId, status }) => {
  const supabase = getClientOrThrow();
  let query = supabase
    .from('handler_flows')
    .select('*, handler_triggers(*), handler_steps(*)')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw mapError(error);
  return data ?? [];
};

const getFlowById = async ({ tenantId, flowId }) => {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('handler_flows')
    .select('*, handler_triggers(*), handler_steps(*)')
    .eq('tenant_id', tenantId)
    .eq('id', flowId)
    .maybeSingle();
  if (error) throw mapError(error);
  if (!data) {
    const err = new Error('Flow not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
};

const getPublishedFlowsByEvent = async ({ tenantId, eventType }) => {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('handler_flows')
    .select('id, definition, version, handler_triggers!inner(type, config)')
    .eq('tenant_id', tenantId)
    .eq('status', STATUS.PUBLISHED)
    .eq('handler_triggers.type', TRIGGER_TYPES.EVENT)
    .contains('handler_triggers.config', { event: eventType });
  if (error) throw mapError(error);
  return data ?? [];
};

const createRunIfAbsent = async ({
  tenantId,
  flow,
  payload,
  idempotencyKey,
  triggerType,
}) => {
  const supabase = getClientOrThrow();
  const flowVersion = flow.version ?? 1;
  const hashed = idempotencyKey || hashPayload(payload);
  const runKey = buildRunKey(flow.id, flowVersion, hashed);

  const { data: existing, error: existingError } = await supabase
    .from('handler_runs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', runKey)
    .maybeSingle();
  if (existingError) throw mapError(existingError);
  if (existing) {
    return { created: false, runId: existing.id };
  }

  ensureEntryStep(flow.definition);

  const context = {
    triggerType,
    payload,
  };

  const insertPayload = {
    tenant_id: tenantId,
    flow_id: flow.id,
    flow_version: flowVersion,
    status: RUN_STATUS.QUEUED,
    current_step_id: flow.definition.entryStepId,
    idempotency_key: runKey,
    context,
    started_at: null,
    finished_at: null,
    attempt: 0,
  };

  const { data: runData, error: runError } = await supabase
    .from('handler_runs')
    .insert(insertPayload)
    .select()
    .single();
  if (runError) throw mapError(runError);

  const jobPayload = {
    tenant_id: tenantId,
    run_id: runData.id,
    due_at: new Date().toISOString(),
    payload: {
      stepId: flow.definition.entryStepId,
    },
  };

  const { error: jobError } = await supabase.from('handler_jobs').insert(jobPayload);
  if (jobError) throw mapError(jobError);

  return { created: true, runId: runData.id };
};

const handleEvent = async ({ tenantId, eventType, payload, idempotencyKey }) => {
  const flows = await getPublishedFlowsByEvent({ tenantId, eventType });
  if (flows.length === 0) {
    return { createdRuns: 0 };
  }

  let createdRuns = 0;
  for (const flow of flows) {
    const { created } = await createRunIfAbsent({
      tenantId,
      flow,
      payload,
      idempotencyKey,
      triggerType: TRIGGER_TYPES.EVENT,
    });
    if (created) createdRuns += 1;
  }
  return { createdRuns };
};

const manualRun = async ({ tenantId, flowId, payload, idempotencyKey }) => {
  const flow = await getFlowById({ tenantId, flowId });
  if (flow.status !== STATUS.PUBLISHED) {
    const err = new Error('Flow must be published before execution');
    err.statusCode = 400;
    throw err;
  }
  return createRunIfAbsent({
    tenantId,
    flow,
    payload,
    idempotencyKey,
    triggerType: TRIGGER_TYPES.MANUAL,
  });
};

const getRunLogs = async ({ tenantId, runId }) => {
  const supabase = getClientOrThrow();

  const { data: run, error: runError } = await supabase
    .from('handler_runs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', runId)
    .single();
  if (runError) throw mapError(runError);
  if (!run) {
    const err = new Error('Run not found');
    err.statusCode = 404;
    throw err;
  }

  const { data, error } = await supabase
    .from('handler_run_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('run_id', runId)
    .order('ts', { ascending: true });
  if (error) throw mapError(error);
  return data ?? [];
};

const getTenantPlan = async (tenantId) => {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase.rpc('get_tenant_plan', { p_tenant: tenantId });
  if (error) throw mapError(error);
  if (!data || !data[0]) {
    const err = new Error('Tenant plan not found');
    err.statusCode = 404;
    throw err;
  }
  const row = data[0];
  const features = resolvePlanFeatures(row.plan?.toUpperCase() ?? 'FREE', row.feature_flags ?? {});
  return { plan: row.plan?.toUpperCase() ?? 'FREE', features };
};

const getRunWithFlow = async ({ tenantId, runId }) => {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('handler_runs')
    .select('*, handler_flows!inner(*, handler_steps(*))')
    .eq('tenant_id', tenantId)
    .eq('id', runId)
    .maybeSingle();
  if (error) throw mapError(error);
  if (!data) {
    const err = new Error('Run not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
};

const appendRunLog = async ({ tenantId, runId, stepId, level, message, input, output, error }) => {
  const supabase = getClientOrThrow();
  const payload = {
    tenant_id: tenantId,
    run_id: runId,
    step_id: stepId ?? null,
    level,
    message,
    input: input ?? null,
    output: output ?? null,
    error: error ?? null,
  };
  const { error: insertError } = await supabase.from('handler_run_logs').insert(payload);
  if (insertError) throw mapError(insertError);
};

const updateRun = async ({ runId, tenantId, patch }) => {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('handler_runs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', runId)
    .select()
    .single();
  if (error) throw mapError(error);
  return data;
};

const deleteJob = async (jobId) => {
  const supabase = getClientOrThrow();
  const { error } = await supabase.from('handler_jobs').delete().eq('id', jobId);
  if (error) throw mapError(error);
};

const rescheduleJob = async ({ jobId, delayMs, maxAttempts }) => {
  const supabase = getClientOrThrow();
  const dueAt = new Date(Date.now() + delayMs).toISOString();
  const patch = {
    due_at: dueAt,
    locked_by: null,
    locked_at: null,
  };
  if (maxAttempts != null) {
    patch.max_attempts = maxAttempts;
  }
  const { error } = await supabase.from('handler_jobs').update(patch).eq('id', jobId);
  if (error) throw mapError(error);
};

const claimNextJob = async ({ workerId }) => {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase.rpc('claim_next_handler_job', {
    worker_id: workerId,
  });
  if (error) throw mapError(error);
  return data;
};

const createJob = async ({ tenantId, runId, stepId, dueAt, payload }) => {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase.rpc('enqueue_handler_job', {
    p_tenant: tenantId,
    p_run: runId,
    p_step: stepId,
    p_due: dueAt ?? new Date().toISOString(),
    p_payload: payload ?? {},
  });
  if (error) throw mapError(error);
  return data;
};

module.exports = {
  createDraftFlow,
  publishFlow,
  listFlows,
  getFlowById,
  handleEvent,
  manualRun,
  getRunLogs,
  getRunWithFlow,
  appendRunLog,
  updateRun,
  deleteJob,
  rescheduleJob,
  getTenantPlan,
  claimNextJob,
  createJob,
};

module.exports = {
  createDraftFlow,
  publishFlow,
  listFlows,
  getFlowById,
  handleEvent,
  manualRun,
  getRunLogs,
};
