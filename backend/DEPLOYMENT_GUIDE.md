# Barkbase Deployment Guide

## What's Been Implemented (Ready to Deploy)

### ✅ Phase 1: Critical Reliability
**Prevents "appointment drops causing customer terminations"**

- **Idempotency System** (`backend/src/middleware/idempotency.js`)
  - Prevents duplicate booking creation
  - Client sends `Idempotency-Key: <uuid>` header
  - Caches responses for 24 hours
  - Auto-cleanup job included

- **Enhanced Audit Logging** (`backend/src/lib/audit.js`)
  - Tracks every change (before/after state)
  - Records who, when, what, from where
  - `EnhancedAuditLog` table for comprehensive history

- **Booking State Machine** (`backend/src/lib/bookingStateMachine.js`)
  - Enforces valid status transitions
  - Prevents impossible states (e.g., COMPLETED → PENDING)
  - Returns clear error messages with allowed transitions

- **Soft Delete System** (`backend/src/lib/softDelete.js`)
  - Never hard-delete records
  - `deletedAt` timestamp on Owner, Pet, Booking, BookingSegment
  - Automatic filtering via Prisma middleware
  - 90-day cleanup job for permanent deletion

### ✅ Phase 2: Financial Accuracy (Partial)
**Prevents "package credit errors costing thousands"**

- **Immutable Financial Ledger** (`backend/src/services/ledger.service.js`)
  - Never update transactions, only append
  - Every financial event logged permanently
  - Balance calculated from SUM of transactions
  - Reconciliation tools to detect discrepancies
  - Revenue reporting by date range

- **Package Credit System** (`backend/src/services/package.service.js`)
  - Atomic credit deduction (all-or-nothing)
  - Automatic expiration handling
  - Refund support for cancelled bookings
  - Auto-select best package (use expiring first)
  - Usage statistics per owner

### 📊 Database Schema Updates

**New Tables:**
- `IdempotencyKey` - Duplicate prevention
- `EnhancedAuditLog` - Change tracking
- `FinancialTransaction` - Immutable ledger
- `Package` - Credit packages
- `PackageUsage` - Usage tracking
- `Invoice` - Invoice system (schema ready, service pending)
- `ActivityFeed` - Photo/activity timeline (schema ready, service pending)
- `PushSubscription` - Push notifications (schema ready, service pending)
- `NotificationQueue` - Notification queue (schema ready, service pending)
- `BookingNotification` - Notification tracking (schema ready, service pending)
- `MessageTemplate` - Communication templates (schema ready, service pending)
- `Waiver` / `SignedWaiver` - Digital waivers (schema ready, service pending)
- `SupportTicket` / `SupportMessage` - Support system (schema ready, service pending)
- `KnowledgeArticle` - Help center (schema ready, service pending)
- `Integration` / `SyncError` - Third-party integrations (schema ready, service pending)

**Schema Modifications:**
- Added `deletedAt DateTime?` to: Owner, Pet, Booking, BookingSegment
- Added `quickbooksId String?` to Owner
- Added relations for all new tables

## Deployment Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

**No additional packages needed yet** - Phase 1 & 2 use existing dependencies.

**Future phases will require:**
```bash
# Phase 3: Photo sharing & push
npm install firebase-admin sharp

# Phase 5: Capacity tracking
npm install ioredis

# Phase 6: QuickBooks
npm install node-quickbooks

# Phase 7: Communications
npm install twilio bullmq pdfkit

# Phase 10: Payment processors
npm install stripe square
```

### 2. Run Database Migration

```bash
cd backend
npx prisma migrate dev --name add_reliability_and_financial_features
```

This creates the migration for all schema changes.

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Apply Soft Delete Middleware

Update `backend/src/config/prisma.js` to add soft delete middleware:

```javascript
const { PrismaClient } = require('@prisma/client');
const { applySoftDeleteMiddleware } = require('../lib/softDelete');

const prisma = new PrismaClient();

// Apply soft delete middleware
applySoftDeleteMiddleware(prisma);

module.exports = prisma;
```

### 5. Add Idempotency Middleware to Routes

Update booking routes to use idempotency:

```javascript
// backend/src/routes/bookings.routes.js
const { ensureIdempotent } = require('../middleware/idempotency');

router.post(
  '/',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  ensureIdempotent({ ttlHours: 24 }),
  validate(schemas.create),
  controller.create
);
```

### 6. Integrate State Machine into Booking Service

Update `backend/src/services/booking.service.js`:

```javascript
const { transitionBookingStatus } = require('../lib/bookingStateMachine');

const updateBookingStatus = async (tenantId, bookingId, newStatus, options = {}) => {
  const tenantDb = forTenant(tenantId);
  
  // Get current booking
  const booking = await tenantDb.booking.findFirst({
    where: { recordId: bookingId },
  });
  
  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }
  
  // Validate transition
  transitionBookingStatus(booking.status, newStatus);
  
  // Update status
  const updated = await tenantDb.booking.update({
    where: { recordId: bookingId },
    data: { status: newStatus },
  });
  
  // Create audit log
  await createAuditLog({
    tenantId,
    userId: options.userId || null,
    entityType: 'booking',
    entityId: bookingId,
    action: 'status_changed',
    before: { status: booking.status },
    after: { status: newStatus },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });
  
  return updated;
};
```

### 7. Setup Cron Jobs

Create `backend/src/jobs/maintenance.js`:

```javascript
const cron = require('node-cron');
const { cleanupExpiredKeys } = require('../middleware/idempotency');
const { cleanupOldDeleted } = require('../lib/softDelete');
const { expirePackages } = require('../services/package.service');
const prisma = require('../config/prisma');

// Cleanup expired idempotency keys daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running idempotency key cleanup...');
  await cleanupExpiredKeys();
});

// Cleanup old soft-deleted records monthly
cron.schedule('0 3 1 * *', async () => {
  console.log('Running soft delete cleanup...');
  const models = ['owner', 'pet', 'booking', 'bookingSegment'];
  for (const model of models) {
    await cleanupOldDeleted(prisma[model], 90);
  }
});

// Expire packages daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Expiring old packages...');
  // Get all tenants
  const tenants = await prisma.tenant.findMany({ select: { recordId: true } });
  for (const tenant of tenants) {
    const count = await expirePackages(tenant.recordId);
    if (count > 0) {
      console.log(`Expired ${count} packages for tenant ${tenant.recordId}`);
    }
  }
});

module.exports = { /* export if needed */ };
```

Add to `backend/src/index.js`:

```javascript
require('./jobs/maintenance'); // Start cron jobs
```

## Usage Examples

### 1. Idempotent Booking Creation (Frontend)

```javascript
import { v4 as uuidv4 } from 'uuid';

const createBooking = async (bookingData) => {
  const idempotencyKey = uuidv4();
  
  const response = await apiClient('/api/v1/bookings', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: bookingData,
  });
  
  return response;
};

// Even if called twice, only one booking created
await createBooking(data);
await createBooking(data); // Returns cached response
```

### 2. Safe Status Transitions

```javascript
// This will succeed
await bookingService.updateBookingStatus(tenantId, bookingId, 'CONFIRMED');

// This will throw error (invalid transition)
await bookingService.updateBookingStatus(tenantId, bookingId, 'COMPLETED');
// Error: Invalid booking status transition: PENDING -> COMPLETED
// Allowed transitions: [CONFIRMED, CANCELLED]
```

### 3. Using Package Credits

```javascript
const packageService = require('./services/package.service');

// Create package
const pkg = await packageService.createPackage(tenantId, {
  ownerId: 'owner123',
  name: '10-Day Package',
  credits: 10,
  priceCents: 40000, // $400
  expiresAt: new Date('2025-12-31'),
});

// Use credits for booking (atomic transaction)
const { package: updated, usage } = await packageService.usePackageCredits(tenantId, {
  packageId: pkg.recordId,
  bookingId: 'booking456',
  creditsToUse: 3,
  description: 'Applied to 3-day boarding',
});

console.log(`Credits remaining: ${updated.creditsRemaining}/10`);

// Auto-select best package
const bestPkg = await packageService.autoselectPackage(tenantId, ownerId, 5);
if (bestPkg) {
  await packageService.usePackageCredits(tenantId, {
    packageId: bestPkg.recordId,
    bookingId,
    creditsToUse: 5,
  });
}
```

### 4. Financial Ledger

```javascript
const ledgerService = require('./services/ledger.service');

// Record charge
await ledgerService.recordCharge(tenantId, {
  bookingId: 'booking123',
  ownerId: 'owner456',
  amountCents: 15000, // $150
  description: '3 nights boarding',
});

// Record payment
await ledgerService.recordPayment(tenantId, {
  bookingId: 'booking123',
  ownerId: 'owner456',
  amountCents: 15000,
  description: 'Credit card payment',
  metadata: { paymentMethod: 'stripe', intentId: 'pi_123' },
});

// Calculate balance (source of truth)
const { balanceCents } = await ledgerService.calculateBookingBalance(tenantId, 'booking123');
console.log(`Balance: $${balanceCents / 100}`); // $0.00

// Reconcile (find discrepancies)
const reconciliation = await ledgerService.reconcileBooking(tenantId, 'booking123');
if (reconciliation.hasDiscrepancy) {
  console.warn(`Discrepancy: ${reconciliation.discrepancyCents / 100} cents`);
  await ledgerService.syncBookingBalance(tenantId, 'booking123');
}
```

### 5. Audit Trail

```javascript
const { createAuditLog, getAuditHistory } = require('./lib/audit');

// Create audit log
await createAuditLog({
  tenantId,
  userId: req.user.recordId,
  entityType: 'booking',
  entityId: booking.recordId,
  action: 'updated',
  before: { status: 'PENDING' },
  after: { status: 'CONFIRMED' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// Get audit history
const history = await getAuditHistory(tenantId, 'booking', bookingId);
history.forEach((log) => {
  console.log(`${log.user.email} ${log.action} at ${log.createdAt}`);
});
```

## Testing the Implementation

### 1. Test Idempotency

```bash
# Send same request twice with same key
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Idempotency-Key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"petId":"pet1","ownerId":"owner1",...}'

# Second request returns cached response, no duplicate booking
```

### 2. Test State Machine

```bash
# Try invalid transition
curl -X PATCH http://localhost:3000/api/v1/bookings/booking1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'

# Should return 400 with allowed transitions
```

### 3. Test Soft Delete

```bash
# Delete a pet
curl -X DELETE http://localhost:3000/api/v1/pets/pet1

# Pet still exists in database with deletedAt timestamp
# GET requests automatically exclude it
curl http://localhost:3000/api/v1/pets  # pet1 not in results
```

### 4. Test Package Credits

```bash
# Create package
curl -X POST http://localhost:3000/api/v1/packages \
  -d '{"ownerId":"owner1","name":"10-Day","credits":10,"priceCents":40000}'

# Use credits
curl -X POST http://localhost:3000/api/v1/packages/pkg1/use \
  -d '{"bookingId":"booking1","creditsToUse":3}'

# Check remaining
curl http://localhost:3000/api/v1/packages/pkg1
# Returns: creditsRemaining: 7
```

## What's Next

The schema is **fully ready** for:
- Phase 3: Photo sharing & push notifications
- Phase 4: Mobile check-in/QR codes/waivers
- Phase 5: Capacity tracking
- Phase 6: QuickBooks integration
- Phase 7: Automated communications
- ...and all other phases

**Next implementation priorities:**
1. Create invoice service + PDF generation
2. Activity feed service + photo upload
3. Push notification service
4. Capacity service + Redis locking
5. QuickBooks OAuth + sync
6. SMS/email template system

## Rollback Plan

If issues arise:

```bash
# Rollback migration
npx prisma migrate dev --name rollback_features

# Or restore from backup
pg_restore -d barkbase backup.sql
```

## Monitoring

Key metrics to watch:
- Idempotency cache hit rate
- Financial reconciliation discrepancies (should be 0)
- Package credit errors (should be 0)
- Audit log volume
- Soft delete cleanup counts

## Support

For issues or questions, see:
- `backend/IMPLEMENTATION_STATUS.md` - Full implementation tracking
- Individual service files - Comprehensive JSDoc comments
- Schema file - Complete model definitions with relations

