const handlerFlowService = require('../services/handlerFlow.service');

const ensurePlanAllowsFlow = (plan, trigger, steps) => {
  const currentPlan = (plan ?? 'FREE').toUpperCase();

  if (currentPlan === 'FREE') {
    if ((trigger?.type ?? 'event') === 'schedule') {
      const err = new Error('Schedule triggers require BarkBase Pro or higher.');
      err.statusCode = 403;
      throw err;
    }

    const invalidAction = steps?.find(
      (step) =>
        step.kind === 'action' &&
        !['record.update', 'note.append'].includes(step.config?.actionType ?? 'record.update'),
    );

    if (invalidAction) {
      const err = new Error(`Action ${invalidAction.config?.actionType} is unavailable on the Free plan.`);
      err.statusCode = 403;
      throw err;
    }

    const hasDelay = steps?.some((step) => step.kind === 'delay');
    if (hasDelay) {
      const err = new Error('Delay steps require BarkBase Pro or higher.');
      err.statusCode = 403;
      throw err;
    }
  } else if (currentPlan === 'PRO') {
    const invalidEnterpriseAction = steps?.find(
      (step) => step.kind === 'action' && step.config?.actionType === 'sms.send',
    );
    if (invalidEnterpriseAction) {
      const err = new Error('SMS automations are only available on BarkBase Enterprise.');
      err.statusCode = 403;
      throw err;
    }
  }
};

const createDraft = async (req, res, next) => {
  try {
    const { name, trigger, steps, definition } = req.body ?? {};
    ensurePlanAllowsFlow(req.tenantPlan, trigger, steps);
    const flow = await handlerFlowService.createDraftFlow({
      tenantId: req.tenantId,
      name,
      trigger,
      steps,
      definition,
      userId: req.user?.id,
    });
    return res.status(201).json(flow);
  } catch (error) {
    return next(error);
  }
};

const publish = async (req, res, next) => {
  try {
    const { flowId } = req.params;
    const flow = await handlerFlowService.publishFlow({
      tenantId: req.tenantId,
      flowId,
      userId: req.user?.id,
    });
    return res.json(flow);
  } catch (error) {
    return next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const flows = await handlerFlowService.listFlows({
      tenantId: req.tenantId,
      status: req.query.status,
    });
    return res.json(flows);
  } catch (error) {
    return next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const flow = await handlerFlowService.getFlowById({
      tenantId: req.tenantId,
      flowId: req.params.flowId,
    });
    return res.json(flow);
  } catch (error) {
    return next(error);
  }
};

const manualRun = async (req, res, next) => {
  try {
    const result = await handlerFlowService.manualRun({
      tenantId: req.tenantId,
      flowId: req.params.flowId,
      payload: req.body?.payload ?? {},
      idempotencyKey: req.body?.idempotencyKey,
    });
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    return next(error);
  }
};

const getRunLogs = async (req, res, next) => {
  try {
    const logs = await handlerFlowService.getRunLogs({
      tenantId: req.tenantId,
      runId: req.params.runId,
    });
    return res.json(logs);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createDraft,
  publish,
  list,
  getById,
  manualRun,
  getRunLogs,
};
