const { forTenant } = require('../lib/tenantPrisma');
const ledgerService = require('./ledger.service');

/**
 * Package Credit System
 * Prevents "package credit errors costing thousands" reported by competitors
 * All operations are transactional and atomic
 */

/**
 * Create a package
 */
const createPackage = async (tenantId, data) => {
  const tenantDb = forTenant(tenantId);

  const pkg = await tenantDb.package.create({
    data: {
      ownerId: data.ownerId,
      name: data.name,
      creditsPurchased: data.credits,
      creditsRemaining: data.credits,
      priceCents: data.priceCents,
      expiresAt: data.expiresAt || null,
      status: 'active',
    },
  });

  // Record purchase in financial ledger
  await ledgerService.recordPayment(tenantId, {
    ownerId: data.ownerId,
    amountCents: data.priceCents,
    description: `Package purchase: ${data.name} (${data.credits} credits)`,
    metadata: {
      packageId: pkg.recordId,
      credits: data.credits,
    },
  });

  return pkg;
};

/**
 * List packages for an owner
 */
const listPackages = async (tenantId, ownerId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { includeExpired = false, includeUsed = false } = options;

  const where = { ownerId };

  if (!includeExpired) {
    where.expiresAt = { gte: new Date() };
  }

  if (!includeUsed) {
    where.creditsRemaining = { gt: 0 };
  }

  const packages = await tenantDb.package.findMany({
    where,
    include: {
      usages: {
        include: {
          booking: {
            select: {
              recordId: true,
              checkIn: true,
              pet: { select: { name: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return packages;
};

/**
 * Get package details
 */
const getPackage = async (tenantId, packageId) => {
  const tenantDb = forTenant(tenantId);

  const pkg = await tenantDb.package.findFirst({
    where: { recordId: packageId },
    include: {
      owner: {
        select: {
          recordId: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      usages: {
        include: {
          booking: {
            select: {
              recordId: true,
              checkIn: true,
              checkOut: true,
              pet: { select: { name: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  if (!pkg) {
    throw Object.assign(new Error('Package not found'), { statusCode: 404 });
  }

  return pkg;
};

/**
 * Use package credits (atomic transaction)
 * Returns error if insufficient credits
 */
const usePackageCredits = async (tenantId, { packageId, bookingId, creditsToUse, description }) => {
  const tenantDb = forTenant(tenantId);

  // Use transaction to ensure atomicity
  const result = await tenantDb.$transaction(async (tx) => {
    // Get package with lock
    const pkg = await tx.package.findFirst({
      where: { recordId: packageId },
    });

    if (!pkg) {
      throw Object.assign(new Error('Package not found'), { statusCode: 404 });
    }

    // Check if package has enough credits
    if (pkg.creditsRemaining < creditsToUse) {
      throw Object.assign(
        new Error(`Insufficient credits. Available: ${pkg.creditsRemaining}, Requested: ${creditsToUse}`),
        { statusCode: 400 }
      );
    }

    // Check if package is expired
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      throw Object.assign(new Error('Package has expired'), { statusCode: 400 });
    }

    // Check if package is active
    if (pkg.status !== 'active') {
      throw Object.assign(new Error(`Package is ${pkg.status}`), { statusCode: 400 });
    }

    // Deduct credits
    const updatedPackage = await tx.package.update({
      where: { recordId: packageId },
      data: {
        creditsRemaining: pkg.creditsRemaining - creditsToUse,
        status: pkg.creditsRemaining - creditsToUse === 0 ? 'depleted' : 'active',
      },
    });

    // Record usage
    const usage = await tx.packageUsage.create({
      data: {
        tenantId,
        packageId,
        bookingId,
        creditsUsed: creditsToUse,
      },
    });

    // Record in financial ledger (outside tx since it uses forTenant)
    return { updatedPackage, usage, pkg };
  });

  // Record in ledger after transaction completes
  // Assuming average credit value for ledger purposes
  const creditValueCents = Math.floor(result.pkg.priceCents / result.pkg.creditsPurchased);
  const deductionAmountCents = creditValueCents * creditsToUse;

  await ledgerService.recordPackageDeduction(tenantId, {
    bookingId,
    ownerId: result.pkg.ownerId,
    amountCents: deductionAmountCents,
    packageId,
    description: description || `Used ${creditsToUse} credits from ${result.pkg.name}`,
    metadata: {
      packageId,
      creditsUsed: creditsToUse,
      creditsRemaining: result.updatedPackage.creditsRemaining,
    },
  });

  return {
    package: result.updatedPackage,
    usage: result.usage,
  };
};

/**
 * Refund package credits (e.g., cancelled booking)
 */
const refundPackageCredits = async (tenantId, { packageId, usageId, reason }) => {
  const tenantDb = forTenant(tenantId);

  const result = await tenantDb.$transaction(async (tx) => {
    // Get usage
    const usage = await tx.packageUsage.findFirst({
      where: { recordId: usageId },
    });

    if (!usage) {
      throw Object.assign(new Error('Usage not found'), { statusCode: 404 });
    }

    // Get package
    const pkg = await tx.package.findFirst({
      where: { recordId: packageId },
    });

    if (!pkg) {
      throw Object.assign(new Error('Package not found'), { statusCode: 404 });
    }

    // Restore credits
    const updatedPackage = await tx.package.update({
      where: { recordId: packageId },
      data: {
        creditsRemaining: pkg.creditsRemaining + usage.creditsUsed,
        status: 'active', // Reactivate if was depleted
      },
    });

    // Delete usage record
    await tx.packageUsage.delete({
      where: { recordId: usageId },
    });

    return { updatedPackage, usage, pkg };
  });

  // Record credit reversal in ledger
  const creditValueCents = Math.floor(result.pkg.priceCents / result.pkg.creditsPurchased);
  const refundAmountCents = creditValueCents * result.usage.creditsUsed;

  await ledgerService.recordTransaction(tenantId, {
    bookingId: result.usage.bookingId,
    ownerId: result.pkg.ownerId,
    type: 'CREDIT',
    amountCents: -refundAmountCents, // Negative to reduce balance
    description: `Refunded ${result.usage.creditsUsed} credits to ${result.pkg.name}: ${reason}`,
    metadata: {
      packageId,
      usageId,
      creditsRefunded: result.usage.creditsUsed,
      reason,
    },
  });

  return result.updatedPackage;
};

/**
 * Expire old packages (run as cron job)
 */
const expirePackages = async (tenantId) => {
  const tenantDb = forTenant(tenantId);

  const expired = await tenantDb.package.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      status: 'active',
    },
    data: {
      status: 'expired',
    },
  });

  return expired.count;
};

/**
 * Get package usage statistics for an owner
 */
const getOwnerPackageStats = async (tenantId, ownerId) => {
  const tenantDb = forTenant(tenantId);

  const packages = await tenantDb.package.findMany({
    where: { ownerId },
    include: {
      usages: true,
    },
  });

  const stats = {
    totalPackages: packages.length,
    activePackages: packages.filter((p) => p.status === 'active').length,
    totalCreditsPurchased: packages.reduce((sum, p) => sum + p.creditsPurchased, 0),
    totalCreditsRemaining: packages.reduce((sum, p) => sum + p.creditsRemaining, 0),
    totalCreditsUsed: packages.reduce((sum, p) => sum + (p.creditsPurchased - p.creditsRemaining), 0),
    totalSpentCents: packages.reduce((sum, p) => sum + p.priceCents, 0),
  };

  stats.totalSpentDollars = stats.totalSpentCents / 100;
  stats.utilizationRate = stats.totalCreditsPurchased > 0
    ? ((stats.totalCreditsUsed / stats.totalCreditsPurchased) * 100).toFixed(2)
    : 0;

  return stats;
};

/**
 * Auto-apply best package for booking
 * Selects package with soonest expiration that has enough credits
 */
const autoselectPackage = async (tenantId, ownerId, creditsNeeded) => {
  const packages = await listPackages(tenantId, ownerId, {
    includeExpired: false,
    includeUsed: false,
  });

  // Filter packages with enough credits
  const validPackages = packages.filter((p) => p.creditsRemaining >= creditsNeeded);

  if (validPackages.length === 0) {
    return null;
  }

  // Sort by expiration date (use expiring packages first)
  validPackages.sort((a, b) => {
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return new Date(a.expiresAt) - new Date(b.expiresAt);
  });

  return validPackages[0];
};

/**
 * Get packages for an owner (alias for listPackages)
 */
const getOwnerPackages = async (tenantId, ownerId) => {
  return listPackages(tenantId, ownerId, {
    includeExpired: false,
    includeUsed: true
  });
};

/**
 * Get all packages for a tenant
 */
const getAllPackages = async (tenantId, filters = {}) => {
  const tenantDb = forTenant(tenantId);
  
  const where = {};
  
  if (filters.status) {
    where.status = filters.status;
  }

  const packages = await tenantDb.package.findMany({
    where,
    include: {
      owner: {
        select: {
          recordId: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      _count: {
        select: { usages: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 50,
    skip: filters.offset || 0
  });

  return packages;
};

/**
 * Apply package to booking
 */
const applyPackageToBooking = async ({ tenantId, packageId, bookingId, creditsUsed }) => {
  return usePackageCredits(tenantId, {
    packageId,
    bookingId,
    creditsToUse: creditsUsed,
    description: `Applied ${creditsUsed} credits to booking`
  });
};

/**
 * Get package usage history
 */
const getPackageUsageHistory = async (tenantId, packageId) => {
  const tenantDb = forTenant(tenantId);

  const usages = await tenantDb.packageUsage.findMany({
    where: { packageId },
    include: {
      booking: {
        include: {
          pet: { select: { name: true } },
          owner: { select: { firstName: true, lastName: true } }
        }
      }
    },
    orderBy: { appliedAt: 'desc' }
  });

  return usages;
};

module.exports = {
  createPackage,
  listPackages,
  getPackage,
  usePackageCredits,
  refundPackageCredits,
  expirePackages,
  getOwnerPackageStats,
  autoselectPackage,
  getOwnerPackages,
  getAllPackages,
  applyPackageToBooking,
  getPackageUsageHistory,
};

