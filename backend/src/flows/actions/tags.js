const { forTenant } = require('../../lib/tenantPrisma');

function resolveRecord(object, context) {
  switch (object) {
    case 'owner':
      return { model: 'owner', id: context.owner?.id || context.payload?.owner?.id };
    case 'pet':
      return { model: 'pet', id: context.pet?.id || context.payload?.pet?.id };
    case 'reservation':
    case 'booking':
      return {
        model: 'booking',
        id: context.reservation?.id || context.booking?.id || context.payload?.reservation?.id,
      };
    default:
      throw new Error(`Unknown object type for tagging: ${object}`);
  }
}

async function updateTags({ tenantId, context, config, log }, overrides = {}) {
  const { object } = config;
  const add = overrides.add ?? config.add ?? [];
  const remove = overrides.remove ?? config.remove ?? [];

  const { model, id } = resolveRecord(object, context);

  if (!id) {
    throw new Error(`Record ID not found for object '${object}'`);
  }

  log(`Updating tags on ${model} ${id}`, { add, remove });

  const db = forTenant(tenantId);

  await db.auditLog.create({
    data: {
      action: 'workflow.tags.updated',
      entityType: model,
      entityId: id,
      diff: {
        add,
        remove,
      },
    },
  });

  return {
    result: {
      object,
      recordId: id,
      added: add,
      removed: remove,
    },
  };
}

async function addTag(args) {
  return updateTags(args, { add: args.config.add ?? args.config.tags ?? [] });
}

async function removeTag(args) {
  return updateTags(args, { remove: args.config.remove ?? args.config.tags ?? [] });
}

module.exports = {
  updateTags,
  addTag,
  removeTag,
};
