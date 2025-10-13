const { forTenant } = require('../../lib/tenantPrisma');
const { sendEmail, sendSms } = require('./email');
const { addTag, removeTag, updateTags } = require('./tags');
const { addFee, addDiscount, createInvoice, applyFeeOrDiscount } = require('./finance');
const { sendWebhook } = require('./http');
const { runCustomAction } = require('../../services/criteria/evaluator');

async function handleNoteTask({ tenantId, context, config, log }) {
  const { kind, title, body, dueInHours, assigneeUserId } = config;
  const db = forTenant(tenantId);

  const entityId = context.owner?.id || context.pet?.id || null;

  if (kind === 'note') {
    log(`Creating note: ${title}`);

    await db.auditLog.create({
      data: {
        action: 'workflow.note.created',
        entityType: 'note',
        entityId,
        diff: {
          title,
          body,
          createdBy: 'workflow',
        },
      },
    });

    return {
      result: {
        kind: 'note',
        title,
        created: true,
      },
    };
  }

  if (kind === 'task') {
    const dueAt = dueInHours ? new Date(Date.now() + dueInHours * 3_600_000) : null;

    log(`Creating task: ${title}`);

    await db.auditLog.create({
      data: {
        action: 'workflow.task.created',
        entityType: 'task',
        entityId,
        diff: {
          title,
          body,
          dueAt,
          assigneeUserId,
          status: 'pending',
          createdBy: 'workflow',
        },
      },
    });

    return {
      result: {
        kind: 'task',
        title,
        dueAt,
        created: true,
      },
    };
  }

  throw new Error(`Unknown note/task kind: ${kind}`);
}

const handleStub = (actionType) => async ({ log, config }) => {
  log(`[STUB] ${actionType} executed`, { config });
  return { result: { ok: true, actionType, stub: true } };
};

const registry = {
  'email.send': sendEmail,
  'sms.send': sendSms,
  'task.create': handleNoteTask,
  'note.create': handleNoteTask,
  'print.document': handleStub('print.document'),
  'http.webhook': sendWebhook,
  'field.set': handleStub('field.set'),
  'field.increment': handleStub('field.increment'),
  'segment.add': addTag,
  'segment.remove': removeTag,
  'fee.add': addFee,
  'discount.apply': addDiscount,
  'invoice.create': createInvoice,
  'status.update': handleStub('status.update'),
  'vaccination.remind': handleStub('vaccination.remind'),
  'reservation.create': handleStub('reservation.create'),
  'reservation.cancel': handleStub('reservation.cancel'),
  'review.request': handleStub('review.request'),
  'owner.notify': sendEmail,
  'team.notify': handleStub('team.notify'),
  'file.generate': handleStub('file.generate'),
  'pdf.generate': handleStub('pdf.generate'),
  'queue.enqueue': handleStub('queue.enqueue'),
  'custom.js': runCustomAction,
  email: sendEmail,
  sms: sendSms,
  'note-task': handleNoteTask,
  'tag-record': updateTags,
  'fee-discount': applyFeeOrDiscount,
  'create-invoice': createInvoice,
  webhook: sendWebhook,
  custom: runCustomAction,
};

module.exports = registry;
module.exports.registry = registry;
