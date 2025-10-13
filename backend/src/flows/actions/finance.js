const { forTenant } = require('../../lib/tenantPrisma');

function resolveBookingId(context) {
  return context.reservation?.id || context.booking?.id || context.payload?.booking?.id;
}

async function applyFeeOrDiscount({ tenantId, context, config, log }) {
  const { mode } = config;
  const { amount, code, reason } = config;
  const bookingId = resolveBookingId(context);

  if (!mode) {
    throw new Error('Fee/discount mode is required');
  }

  if (!bookingId) {
    throw new Error('Booking ID not found for fee/discount action');
  }

  log(`Applying ${mode} of ${amount} to booking ${bookingId}`, { code, reason });

  const db = forTenant(tenantId);

  await db.auditLog.create({
    data: {
      action: `workflow.${mode}.applied`,
      entityType: 'booking',
      entityId: bookingId,
      diff: {
        mode,
        amount,
        code,
        reason,
      },
    },
  });

  return {
    result: {
      bookingId,
      mode,
      amount,
      applied: true,
    },
  };
}

async function addFee(args) {
  const config = { ...args.config };
  if (!config.mode) {
    config.mode = 'fee.add';
  }
  return applyFeeOrDiscount({ ...args, config });
}

async function addDiscount(args) {
  const config = { ...args.config };
  if (!config.mode) {
    config.mode = 'discount.apply';
  }
  return applyFeeOrDiscount({ ...args, config });
}

async function createInvoice({ tenantId, context, config, log }) {
  const { reservationIdSource, terms } = config;
  const db = forTenant(tenantId);

  let bookingId;

  switch (reservationIdSource) {
    case 'context':
      bookingId = context.reservation?.id || context.booking?.id;
      break;
    case 'latest': {
      const ownerId = context.owner?.id;
      if (!ownerId) throw new Error('Owner ID not found');

      const latestBooking = await db.booking.findFirst({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
      });

      bookingId = latestBooking?.id;
      break;
    }
    case 'lookup':
      throw new Error('Lookup mode not implemented');
    default:
      throw new Error(`Unknown reservationIdSource: ${reservationIdSource}`);
  }

  if (!bookingId) {
    throw new Error('Booking not found for invoice creation');
  }

  log(`Creating invoice for booking ${bookingId}`);

  await db.auditLog.create({
    data: {
      action: 'workflow.invoice.created',
      entityType: 'booking',
      entityId: bookingId,
      diff: {
        terms,
        createdBy: 'workflow',
      },
    },
  });

  return {
    result: {
      bookingId,
      invoiceCreated: true,
      terms,
    },
  };
}

module.exports = {
  applyFeeOrDiscount,
  addFee,
  addDiscount,
  createInvoice,
};
