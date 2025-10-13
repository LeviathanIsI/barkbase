const jsonLogic = require('json-logic-js');
const { logger } = require('../../lib/logger');

function getProp(context, object, property) {
  if (!context || !object || !property) {
    return undefined;
  }

  const target = context[object] || context.payload?.[object];
  if (!target) {
    return undefined;
  }

  const keys = (property.key || property)
    .toString()
    .split('.')
    .map((key) => key.trim())
    .filter(Boolean);

  return keys.reduce((value, key) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    return value[key];
  }, target);
}

function parseDate(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function evaluatePropertyCondition(condition, context) {
  if (!condition) {
    return false;
  }

  const { object, property, operator, value } = condition;
  const actualValue = getProp(context, object, property);

  switch (operator) {
    case 'eq':
      return actualValue === value;
    case 'neq':
      return actualValue !== value;
    case 'gt':
      return typeof actualValue === 'number' && actualValue > value;
    case 'gte':
      return typeof actualValue === 'number' && actualValue >= value;
    case 'lt':
      return typeof actualValue === 'number' && actualValue < value;
    case 'lte':
      return typeof actualValue === 'number' && actualValue <= value;
    case 'contains':
      return typeof actualValue === 'string' && actualValue.includes(value);
    case 'not_contains':
      return typeof actualValue === 'string' && !actualValue.includes(value);
    case 'starts_with':
      return typeof actualValue === 'string' && actualValue.startsWith(value);
    case 'ends_with':
      return typeof actualValue === 'string' && actualValue.endsWith(value);
    case 'in':
      return Array.isArray(value) && value.includes(actualValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(actualValue);
    case 'is_true':
      return actualValue === true;
    case 'is_false':
      return actualValue === false;
    case 'is_known':
      return actualValue !== null && actualValue !== undefined && actualValue !== '';
    case 'is_unknown':
      return actualValue === null || actualValue === undefined || actualValue === '';
    case 'before': {
      const actualDate = parseDate(actualValue);
      const compareDate = parseDate(value);
      return Boolean(actualDate && compareDate && actualDate < compareDate);
    }
    case 'after': {
      const actualDate = parseDate(actualValue);
      const compareDate = parseDate(value);
      return Boolean(actualDate && compareDate && actualDate > compareDate);
    }
    case 'on': {
      const actualDate = parseDate(actualValue);
      const compareDate = parseDate(value);
      return Boolean(
        actualDate &&
          compareDate &&
          actualDate.toDateString() === compareDate.toDateString(),
      );
    }
    case 'between': {
      if (!Array.isArray(value) || value.length !== 2) {
        return false;
      }
      const actualDate = parseDate(actualValue);
      const startDate = parseDate(value[0]);
      const endDate = parseDate(value[1]);
      return Boolean(
        actualDate && startDate && endDate && actualDate >= startDate && actualDate <= endDate,
      );
    }
    default:
      logger.warn({ operator }, 'Unknown property operator');
      return false;
  }
}

function evaluateEventCondition(criterion, context) {
  const eventName = criterion.eventName;
  if (eventName && eventName !== context.eventName) {
    return false;
  }

  const eventTriggered = context.triggerType === 'criteria' || context.triggerType === 'schedule';
  if (!eventTriggered) {
    return false;
  }

  if (!criterion.within) {
    return true;
  }

  const match = /^(\d+)([mhd])$/.exec(criterion.within);
  if (!match) {
    return false;
  }

  const [, amount, unit] = match;
  const msPerUnit = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  const maxAgeMs = Number(amount) * msPerUnit[unit];

  const now = new Date(context.now || new Date());
  const eventTime = new Date(
    context.payload?.eventTime || context.payload?.timestamp || now,
  );

  if (Number.isNaN(eventTime.getTime())) {
    return false;
  }

  return now - eventTime <= maxAgeMs;
}

function parseLogicExpression(expression) {
  if (!expression) {
    return null;
  }

  if (typeof expression === 'object') {
    return expression;
  }

  if (typeof expression === 'string') {
    try {
      return JSON.parse(expression);
    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to parse custom expression');
      return null;
    }
  }

  return null;
}

function evaluateCustomCriterion(criterion, context) {
  const logic = parseLogicExpression(criterion.logic || criterion.js);
  if (!logic) {
    return false;
  }

  try {
    return Boolean(jsonLogic.apply(logic, context));
  } catch (error) {
    logger.warn({ error: error.message }, 'Custom criterion evaluation failed');
    return false;
  }
}

function evaluateCriterion(criterion, context) {
  if (!criterion || !criterion.type) {
    return false;
  }

  switch (criterion.type) {
    case 'property-condition':
      return evaluatePropertyCondition(criterion.condition, context);
    case 'event-condition':
      return evaluateEventCondition(criterion, context);
    case 'custom':
      return evaluateCustomCriterion(criterion, context);
    default:
      logger.warn({ type: criterion.type }, 'Unknown criterion type');
      return false;
  }
}

function evaluateCriteriaGroup(group, context) {
  if (!group || !Array.isArray(group.criteria) || group.criteria.length === 0) {
    return true;
  }

  return group.criteria.every((criterion) => evaluateCriterion(criterion, context));
}

function evaluateCriteriaGroups(groups, context) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return true;
  }

  return groups.some((group) => evaluateCriteriaGroup(group, context));
}

function buildContext(payload, options = {}) {
  const context = {
    triggerType: options.triggerType || 'manual',
    payload: payload || {},
    now: options.now || new Date().toISOString(),
    actions: options.actions || [],
  };

  if (payload.owner) context.owner = payload.owner;
  if (payload.pet) context.pet = payload.pet;
  if (payload.reservation) context.reservation = payload.reservation;
  if (payload.booking) context.booking = payload.booking;
  if (payload.invoice) context.invoice = payload.invoice;
  if (payload.tenant) context.tenant = payload.tenant;

  return context;
}

function shouldEnroll(trigger, context) {
  if (!trigger) {
    return true;
  }

  const criteriaPass = evaluateCriteriaGroups(trigger.criteriaGroups || [], context);
  if (!criteriaPass) {
    return false;
  }

  const filtersPass = evaluateCriteriaGroups(trigger.enrollmentFilters || [], context);
  if (!filtersPass) {
    return false;
  }

  return true;
}

async function runCustomAction({ context, config, log = () => {}, setContext = () => {} }) {
  const expression = config.logic || config.js;
  const logic = parseLogicExpression(expression);

  if (!logic) {
    throw new Error('Custom action requires a structured logic expression');
  }

  let output;
  try {
    output = jsonLogic.apply(logic, context);
  } catch (error) {
    logger.warn({ error: error.message }, 'Custom action evaluation failed');
    throw new Error(`Custom action failed: ${error.message}`);
  }

  if (config.setContext && typeof config.setContext === 'object') {
    setContext(config.setContext);
  }

  if (Array.isArray(config.assignments)) {
    config.assignments.forEach(({ path, value }) => {
      if (!path) {
        return;
      }
      const segments = path.split('.').map((seg) => seg.trim()).filter(Boolean);
      if (segments.length === 0) {
        return;
      }
      const [root, ...rest] = segments;
      const target = (context[root] = context[root] ?? {});
      let cursor = target;
      for (let i = 0; i < rest.length - 1; i += 1) {
        const key = rest[i];
        cursor[key] = cursor[key] ?? {};
        cursor = cursor[key];
      }
      cursor[rest[rest.length - 1] || root] = value;
    });
  }

  log('Custom action evaluated', { output });

  return {
    result: {
      executed: true,
      output,
    },
  };
}

module.exports = {
  getProp,
  evaluatePropertyCondition,
  evaluateCriterion,
  evaluateCriteriaGroup,
  evaluateCriteriaGroups,
  shouldEnroll,
  buildContext,
  runCustomAction,
};
