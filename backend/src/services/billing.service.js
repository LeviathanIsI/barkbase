const { forTenant } = require('../lib/tenantPrisma');

/**
 * Get billing overview for a tenant
 */
async function getBillingOverview(tenantId) {
  const tenantDb = forTenant(tenantId);

  // Get current month boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Fetch tenant info
  const { prisma } = require('../lib/prisma');
  const tenant = await prisma.tenant.findUnique({
    where: { recordId: tenantId },
    select: {
      plan: true,
      name: true,
      slug: true
    }
  });

  // Calculate this month's payment metrics
  const payments = await tenantDb.payment.findMany({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      status: { in: ['CAPTURED', 'AUTHORIZED'] }
    }
  });

  const processedCents = payments
    .filter(p => p.status === 'CAPTURED')
    .reduce((sum, p) => sum + (p.amountCents || 0), 0);

  const bookingCount = await tenantDb.booking.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  });

  // Estimate transaction fees (2.9% + 30¢ per transaction for Stripe)
  const transactionFeesCents = payments.reduce((sum, p) => {
    return sum + Math.round(p.amountCents * 0.029) + 30;
  }, 0);

  return {
    currentPlan: tenant.plan,
    monthlyAmount: 0, // Subscription amount (0 for FREE)
    nextBilling: null, // Next billing date
    daysUntilBilling: null,
    paymentMethod: null, // Stripe payment method
    thisMonth: {
      processed: processedCents,
      bookings: bookingCount,
      transactionFees: transactionFeesCents
    }
  };
}

module.exports = {
  getBillingOverview
};

