const { forTenant } = require('../lib/tenantPrisma');

/**
 * Financial Ledger Service
 * Immutable financial transaction log - never update, only append
 * Prevents "package credit errors costing thousands" reported by competitors
 */

// Transaction types
const TRANSACTION_TYPES = {
  CHARGE: 'CHARGE',               // Charge for service
  PAYMENT: 'PAYMENT',             // Payment received
  REFUND: 'REFUND',               // Refund issued
  CREDIT: 'CREDIT',               // Credit applied
  PACKAGE_DEDUCTION: 'PACKAGE_DEDUCTION', // Package credit used
  ADJUSTMENT: 'ADJUSTMENT',        // Manual adjustment
};

/**
 * Record a financial transaction (immutable)
 */
const recordTransaction = async (tenantId, data) => {
  const tenantDb = forTenant(tenantId);

  const transaction = await tenantDb.financialTransaction.create({
    data: {
      bookingId: data.bookingId || null,
      ownerId: data.ownerId,
      type: data.type,
      amountCents: data.amountCents,
      currency: data.currency || 'USD',
      description: data.description,
      metadata: data.metadata || {},
    },
  });

  return transaction;
};

/**
 * Record a charge
 */
const recordCharge = async (tenantId, { bookingId, ownerId, amountCents, description, metadata = {} }) => {
  return recordTransaction(tenantId, {
    bookingId,
    ownerId,
    type: TRANSACTION_TYPES.CHARGE,
    amountCents,
    description,
    metadata,
  });
};

/**
 * Record a payment
 */
const recordPayment = async (tenantId, { bookingId, ownerId, amountCents, description, metadata = {} }) => {
  return recordTransaction(tenantId, {
    bookingId,
    ownerId,
    type: TRANSACTION_TYPES.PAYMENT,
    amountCents: -amountCents, // Negative because it reduces balance
    description,
    metadata,
  });
};

/**
 * Record a refund
 */
const recordRefund = async (tenantId, { bookingId, ownerId, amountCents, description, metadata = {} }) => {
  return recordTransaction(tenantId, {
    bookingId,
    ownerId,
    type: TRANSACTION_TYPES.REFUND,
    amountCents: -amountCents, // Negative because it reduces balance
    description,
    metadata,
  });
};

/**
 * Record package credit usage
 */
const recordPackageDeduction = async (tenantId, { bookingId, ownerId, amountCents, packageId, description, metadata = {} }) => {
  return recordTransaction(tenantId, {
    bookingId,
    ownerId,
    type: TRANSACTION_TYPES.PACKAGE_DEDUCTION,
    amountCents: -amountCents, // Negative because it reduces balance
    description,
    metadata: { ...metadata, packageId },
  });
};

/**
 * Calculate booking balance from ledger
 * This is the source of truth - NOT the booking.balanceDueCents field
 */
const calculateBookingBalance = async (tenantId, bookingId) => {
  const tenantDb = forTenant(tenantId);

  const result = await tenantDb.financialTransaction.aggregate({
    where: { bookingId },
    _sum: { amountCents: true },
  });

  const balanceCents = result._sum.amountCents || 0;

  return {
    balanceCents,
    balanceDollars: balanceCents / 100,
  };
};

/**
 * Calculate owner account balance across all bookings
 */
const calculateOwnerBalance = async (tenantId, ownerId) => {
  const tenantDb = forTenant(tenantId);

  const result = await tenantDb.financialTransaction.aggregate({
    where: { ownerId },
    _sum: { amountCents: true },
  });

  const balanceCents = result._sum.amountCents || 0;

  return {
    balanceCents,
    balanceDollars: balanceCents / 100,
  };
};

/**
 * Get transaction history for a booking
 */
const getBookingTransactions = async (tenantId, bookingId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { limit = 100, offset = 0 } = options;

  const transactions = await tenantDb.financialTransaction.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return transactions;
};

/**
 * Get transaction history for an owner
 */
const getOwnerTransactions = async (tenantId, ownerId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { limit = 100, offset = 0, type = null } = options;

  const where = { ownerId };
  if (type) {
    where.type = type;
  }

  const transactions = await tenantDb.financialTransaction.findMany({
    where,
    include: {
      booking: {
        select: {
          recordId: true,
          checkIn: true,
          checkOut: true,
          pet: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return transactions;
};

/**
 * Reconcile booking - compare ledger balance with booking.balanceDueCents
 * Returns discrepancy if any
 */
const reconcileBooking = async (tenantId, bookingId) => {
  const tenantDb = forTenant(tenantId);

  const booking = await tenantDb.booking.findFirst({
    where: { recordId: bookingId },
    select: { balanceDueCents: true },
  });

  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  const { balanceCents: ledgerBalance } = await calculateBookingBalance(tenantId, bookingId);

  const discrepancyCents = Math.abs(booking.balanceDueCents - ledgerBalance);

  return {
    bookingBalance: booking.balanceDueCents,
    ledgerBalance,
    discrepancyCents,
    hasDiscrepancy: discrepancyCents > 0,
    reconciled: discrepancyCents === 0,
  };
};

/**
 * Sync booking balance from ledger (run after migration or to fix discrepancies)
 */
const syncBookingBalance = async (tenantId, bookingId) => {
  const tenantDb = forTenant(tenantId);

  const { balanceCents } = await calculateBookingBalance(tenantId, bookingId);

  const updated = await tenantDb.booking.update({
    where: { recordId: bookingId },
    data: { balanceDueCents: balanceCents },
  });

  return updated;
};

/**
 * Get revenue summary for date range
 */
const getRevenueSummary = async (tenantId, { startDate, endDate }) => {
  const tenantDb = forTenant(tenantId);

  const transactions = await tenantDb.financialTransaction.findMany({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  const summary = {
    totalChargesCents: 0,
    totalPaymentsCents: 0,
    totalRefundsCents: 0,
    totalPackageDeductionsCents: 0,
    netRevenueCents: 0,
    transactionCount: transactions.length,
  };

  transactions.forEach((tx) => {
    switch (tx.type) {
      case TRANSACTION_TYPES.CHARGE:
        summary.totalChargesCents += tx.amountCents;
        break;
      case TRANSACTION_TYPES.PAYMENT:
        summary.totalPaymentsCents += Math.abs(tx.amountCents);
        break;
      case TRANSACTION_TYPES.REFUND:
        summary.totalRefundsCents += Math.abs(tx.amountCents);
        break;
      case TRANSACTION_TYPES.PACKAGE_DEDUCTION:
        summary.totalPackageDeductionsCents += Math.abs(tx.amountCents);
        break;
    }
  });

  summary.netRevenueCents = summary.totalPaymentsCents - summary.totalRefundsCents;

  // Convert to dollars
  Object.keys(summary).forEach((key) => {
    if (key.endsWith('Cents')) {
      const dollarKey = key.replace('Cents', 'Dollars');
      summary[dollarKey] = summary[key] / 100;
    }
  });

  return summary;
};

module.exports = {
  TRANSACTION_TYPES,
  recordTransaction,
  recordCharge,
  recordPayment,
  recordRefund,
  recordPackageDeduction,
  calculateBookingBalance,
  calculateOwnerBalance,
  getBookingTransactions,
  getOwnerTransactions,
  reconcileBooking,
  syncBookingBalance,
  getRevenueSummary,
};

