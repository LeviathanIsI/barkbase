/**
 * =============================================================================
 * BarkBase Financial Service Lambda
 * =============================================================================
 *
 * Handles financial endpoints:
 * - GET/POST /api/v1/financial/invoices - Invoice management
 * - GET/POST /api/v1/financial/payments - Payment management
 * - GET/POST /api/v1/financial/pricing - Pricing management
 * - GET /api/v1/financial/billing/* - Billing info
 * - POST /api/v1/financial/stripe/* - Stripe payment processing
 *
 * =============================================================================
 */

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { getPoolAsync, query, softDelete, softDeleteBatch } = dbLayer;
const {
  authenticateRequest,
  createResponse,
  parseBody,
} = sharedLayer;

// =============================================================================
// STRIPE INITIALIZATION
// =============================================================================

let stripe = null;

/**
 * Get Stripe instance (lazy initialization)
 * Uses STRIPE_SECRET_KEY environment variable
 */
function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn('[FINANCIAL-SERVICE] STRIPE_SECRET_KEY not configured');
      return null;
    }
    const Stripe = require('stripe');
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'BarkBase',
        version: '1.0.0',
      },
    });
  }
  return stripe;
}

/**
 * Resolve tenant ID with fallback precedence:
 * 1. X-Tenant-Id header (case-insensitive)
 * 2. Database lookup by user cognito_sub
 */
function resolveTenantIdFromHeader(event) {
  const headers = event.headers || {};
  const tenantFromHeader =
    headers['x-tenant-id'] ||
    headers['X-Tenant-Id'] ||
    headers['x-Tenant-Id'] ||
    headers['X-TENANT-ID'];

  if (tenantFromHeader) {
    console.log('[FINANCIAL-SERVICE] Resolved tenantId from header:', tenantFromHeader);
    return tenantFromHeader;
  }
  return null;
}

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[FINANCIAL-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  // Handle Stripe webhook BEFORE authentication (Stripe sends directly, no JWT)
  // Accept both CDK route (/api/v1/webhooks/stripe) and legacy routes
  if ((path === '/api/v1/webhooks/stripe' ||
       path === '/api/v1/financial/stripe/webhook' ||
       path === '/financial/stripe/webhook') && method === 'POST') {
    return handleStripeWebhook(event);
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    const user = authResult.user;

    // Prefer X-Tenant-Id header, fallback to database lookup
    let tenantId = resolveTenantIdFromHeader(event);
    if (!tenantId) {
      tenantId = await getTenantIdForUser(user.id);
    }

    if (!tenantId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Missing tenant context: X-Tenant-Id header is required',
      });
    }

    console.log('[FINANCIAL-SERVICE] Resolved tenantId:', tenantId);

    const queryParams = event.queryStringParameters || {};

    // Invoices routes
    if (path === '/api/v1/financial/invoices' || path === '/financial/invoices') {
      if (method === 'GET') {
        return handleGetInvoices(tenantId, queryParams);
      }
      if (method === 'POST') {
        return handleCreateInvoice(tenantId, parseBody(event));
      }
    }

    // Generate invoice from booking route
    const generateMatch = path.match(/\/api\/v1\/financial\/invoices\/generate\/([a-f0-9-]+)$/i);
    if (generateMatch && method === 'POST') {
      const bookingId = generateMatch[1];
      return handleGenerateInvoiceFromBooking(tenantId, bookingId);
    }

    // Invoice by ID routes
    const invoiceMatch = path.match(/\/api\/v1\/financial\/invoices\/([a-f0-9-]+)(\/.*)?$/i);
    if (invoiceMatch) {
      const invoiceId = invoiceMatch[1];
      const subPath = invoiceMatch[2] || '';

      if (subPath === '/send' && method === 'POST') {
        return handleSendInvoice(tenantId, invoiceId);
      }
      if (subPath === '/void' && method === 'POST') {
        return handleVoidInvoice(tenantId, invoiceId);
      }
      if (subPath === '/pdf' && method === 'GET') {
        return handleGetInvoicePdf(tenantId, invoiceId);
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetInvoice(tenantId, invoiceId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateInvoice(tenantId, invoiceId, parseBody(event));
        }
      }
    }

    // Payments routes
    if (path === '/api/v1/financial/payments' || path === '/financial/payments') {
      if (method === 'GET') {
        return handleGetPayments(tenantId, queryParams);
      }
      if (method === 'POST') {
        return handleCreatePayment(tenantId, parseBody(event));
      }
    }

    // Payment by ID routes
    const paymentMatch = path.match(/\/api\/v1\/financial\/payments\/([a-f0-9-]+)(\/.*)?$/i);
    if (paymentMatch) {
      const paymentId = paymentMatch[1];
      const subPath = paymentMatch[2] || '';

      if (subPath === '/refund' && method === 'POST') {
        return handleRefundPayment(tenantId, paymentId, parseBody(event));
      }
      if (subPath === '/capture' && method === 'POST') {
        return handleCapturePayment(tenantId, paymentId);
      }
      if (subPath === '/receipt' && method === 'POST') {
        return handleSendReceipt(tenantId, paymentId, parseBody(event));
      }
      if (subPath === '/receipt' && method === 'GET') {
        return handleGetReceipt(tenantId, paymentId);
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetPayment(tenantId, paymentId);
        }
      }
    }

    // ==========================================================================
    // STRIPE ROUTES - Payment processing with Stripe
    // ==========================================================================

    // Create payment intent (for card payments via Stripe Elements)
    if ((path === '/api/v1/financial/stripe/payment-intent' || path === '/financial/stripe/payment-intent') && method === 'POST') {
      return handleCreatePaymentIntent(tenantId, parseBody(event));
    }

    // Confirm payment (after frontend confirms with Stripe.js)
    if ((path === '/api/v1/financial/stripe/confirm' || path === '/financial/stripe/confirm') && method === 'POST') {
      return handleConfirmPayment(tenantId, parseBody(event));
    }

    // Create Stripe customer for card-on-file
    if ((path === '/api/v1/financial/stripe/customers' || path === '/financial/stripe/customers') && method === 'POST') {
      return handleCreateStripeCustomer(tenantId, parseBody(event));
    }

    // Stripe customer by owner ID
    const stripeCustomerMatch = path.match(/\/api\/v1\/financial\/stripe\/customers\/([a-f0-9-]+)$/i);
    if (stripeCustomerMatch && method === 'GET') {
      return handleGetStripeCustomer(tenantId, stripeCustomerMatch[1]);
    }

    // Attach payment method to customer
    if ((path === '/api/v1/financial/stripe/payment-methods' || path === '/financial/stripe/payment-methods') && method === 'POST') {
      return handleAttachPaymentMethod(tenantId, parseBody(event));
    }

    // List saved payment methods for a customer
    const stripePmListMatch = path.match(/\/api\/v1\/financial\/stripe\/payment-methods\/owner\/([a-f0-9-]+)$/i);
    if (stripePmListMatch && method === 'GET') {
      return handleListStripePaymentMethods(tenantId, stripePmListMatch[1]);
    }

    // Delete a saved payment method
    const stripePmDeleteMatch = path.match(/\/api\/v1\/financial\/stripe\/payment-methods\/([a-zA-Z0-9_]+)$/i);
    if (stripePmDeleteMatch && method === 'DELETE') {
      return handleDetachPaymentMethod(tenantId, stripePmDeleteMatch[1]);
    }

    // Create setup intent (for saving cards without immediate payment)
    if ((path === '/api/v1/financial/stripe/setup-intent' || path === '/financial/stripe/setup-intent') && method === 'POST') {
      return handleCreateSetupIntent(tenantId, parseBody(event));
    }

    // ==========================================================================
    // STRIPE WEBHOOK ROUTE - Unauthenticated (verified via signature)
    // Note: This check is redundant as webhooks are handled before auth
    // ==========================================================================
    if ((path === '/api/v1/webhooks/stripe' ||
         path === '/api/v1/financial/stripe/webhook' ||
         path === '/financial/stripe/webhook') && method === 'POST') {
      return handleStripeWebhook(event);
    }

    // Payment methods routes
    if (path === '/api/v1/financial/payment-methods' || path === '/financial/payment-methods') {
      if (method === 'GET') {
        return handleGetPaymentMethods(tenantId);
      }
      if (method === 'POST') {
        return handleAddPaymentMethod(tenantId, parseBody(event));
      }
    }

    // Payment method by ID routes
    const pmMatch = path.match(/\/api\/v1\/financial\/payment-methods\/([a-f0-9-]+)(\/.*)?$/i);
    if (pmMatch) {
      const pmId = pmMatch[1];
      const subPath = pmMatch[2] || '';

      if (subPath === '/default' && method === 'POST') {
        return handleSetDefaultPaymentMethod(tenantId, pmId);
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetPaymentMethod(tenantId, pmId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdatePaymentMethod(tenantId, pmId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeletePaymentMethod(tenantId, pmId);
        }
      }
    }

    // Pricing routes
    if (path === '/api/v1/financial/pricing' || path === '/financial/pricing') {
      if (method === 'GET') {
        return handleGetPricing(tenantId);
      }
      if (method === 'POST') {
        return handleCreatePriceItem(tenantId, parseBody(event));
      }
    }

    if (path === '/api/v1/financial/pricing/calculate' || path === '/financial/pricing/calculate') {
      return handleCalculatePrice(tenantId, queryParams);
    }

    // Pricing by ID routes
    const pricingMatch = path.match(/\/api\/v1\/financial\/pricing\/([a-f0-9-]+)$/i);
    if (pricingMatch) {
      const priceId = pricingMatch[1];
      if (method === 'GET') {
        return handleGetPriceItem(tenantId, priceId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePriceItem(tenantId, priceId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeletePriceItem(tenantId, priceId);
      }
    }

    // Billing routes
    if (path === '/api/v1/financial/billing/summary' || path === '/financial/billing/summary') {
      return handleGetBillingSummary(tenantId);
    }
    if (path === '/api/v1/financial/billing/history' || path === '/financial/billing/history') {
      return handleGetBillingHistory(tenantId, queryParams);
    }
    if (path === '/api/v1/financial/billing/upcoming' || path === '/financial/billing/upcoming') {
      return handleGetUpcomingCharges(tenantId);
    }
    if (path === '/api/v1/financial/billing/charge' || path === '/financial/billing/charge') {
      if (method === 'POST') {
        return handleCreateCharge(tenantId, parseBody(event));
      }
    }
    if (path === '/api/v1/financial/billing/usage' || path === '/financial/billing/usage') {
      return handleGetBillingUsage(tenantId);
    }
    if (path === '/api/v1/financial/billing/upgrade' || path === '/financial/billing/upgrade') {
      if (method === 'POST') {
        return handleUpgradePlan(tenantId, parseBody(event));
      }
    }

    // Subscriptions routes
    if (path === '/api/v1/financial/subscriptions' || path === '/financial/subscriptions') {
      if (method === 'GET') {
        return handleGetSubscriptions(tenantId);
      }
      if (method === 'POST') {
        return handleCreateSubscription(tenantId, parseBody(event));
      }
    }

    // Subscription by ID routes
    const subMatch = path.match(/\/api\/v1\/financial\/subscriptions\/([a-f0-9-]+)(\/.*)?$/i);
    if (subMatch) {
      const subId = subMatch[1];
      const subPath = subMatch[2] || '';

      if (subPath === '/cancel' && method === 'POST') {
        return handleCancelSubscription(tenantId, subId);
      }
      if (subPath === '/pause' && method === 'POST') {
        return handlePauseSubscription(tenantId, subId);
      }
      if (subPath === '/resume' && method === 'POST') {
        return handleResumeSubscription(tenantId, subId);
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetSubscription(tenantId, subId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateSubscription(tenantId, subId, parseBody(event));
        }
      }
    }

    // ==========================================================================
    // PACKAGE/CREDIT ROUTES
    // ==========================================================================
    
    // List packages for owner
    if (path === '/api/v1/financial/packages' || path === '/financial/packages') {
      if (method === 'GET') {
        return handleGetPackages(tenantId, queryParams);
      }
      if (method === 'POST') {
        return handleCreatePackage(tenantId, parseBody(event));
      }
    }

    // Package by ID routes
    const packageMatch = path.match(/\/api\/v1\/financial\/packages\/([a-f0-9-]+)(\/.*)?$/i);
    if (packageMatch) {
      const packageId = packageMatch[1];
      const subPath = packageMatch[2] || '';

      if (subPath === '/use' && method === 'POST') {
        return handleUsePackageCredits(tenantId, packageId, parseBody(event));
      }
      if (subPath === '/usage' && method === 'GET') {
        return handleGetPackageUsage(tenantId, packageId);
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetPackage(tenantId, packageId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdatePackage(tenantId, packageId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeletePackage(tenantId, packageId);
        }
      }
    }

    // ==========================================================================
    // COMMISSION TRACKING ROUTES
    // ==========================================================================

    // Commission rates management
    if (path === '/api/v1/financial/commissions/rates' || path === '/financial/commissions/rates') {
      if (method === 'GET') {
        return handleGetCommissionRates(tenantId, queryParams);
      }
      if (method === 'POST') {
        return handleCreateCommissionRate(tenantId, parseBody(event));
      }
    }

    // Commission rate by ID
    const rateMatch = path.match(/\/api\/v1\/financial\/commissions\/rates\/([a-f0-9-]+)$/i);
    if (rateMatch) {
      const rateId = rateMatch[1];
      if (method === 'GET') {
        return handleGetCommissionRate(tenantId, rateId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateCommissionRate(tenantId, rateId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteCommissionRate(tenantId, rateId);
      }
    }

    // Commission ledger/records
    if (path === '/api/v1/financial/commissions' || path === '/financial/commissions') {
      if (method === 'GET') {
        return handleGetCommissions(tenantId, queryParams);
      }
    }

    // Commission by ID
    const commissionMatch = path.match(/\/api\/v1\/financial\/commissions\/([a-f0-9-]+)$/i);
    if (commissionMatch && !path.includes('/rates/')) {
      const commissionId = commissionMatch[1];
      if (method === 'GET') {
        return handleGetCommission(tenantId, commissionId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateCommission(tenantId, commissionId, parseBody(event));
      }
    }

    // Approve commission
    const approveMatch = path.match(/\/api\/v1\/financial\/commissions\/([a-f0-9-]+)\/approve$/i);
    if (approveMatch && method === 'POST') {
      return handleApproveCommission(tenantId, approveMatch[1], user);
    }

    // Mark commission as paid
    const paidMatch = path.match(/\/api\/v1\/financial\/commissions\/([a-f0-9-]+)\/paid$/i);
    if (paidMatch && method === 'POST') {
      return handleMarkCommissionPaid(tenantId, paidMatch[1], parseBody(event));
    }

    // Staff commission summary
    const staffCommissionMatch = path.match(/\/api\/v1\/financial\/commissions\/staff\/([a-f0-9-]+)$/i);
    if (staffCommissionMatch && method === 'GET') {
      return handleGetStaffCommissionSummary(tenantId, staffCommissionMatch[1], queryParams);
    }

    // Calculate commission for a booking
    if (path === '/api/v1/financial/commissions/calculate' || path === '/financial/commissions/calculate') {
      if (method === 'POST') {
        return handleCalculateCommission(tenantId, parseBody(event));
      }
    }

    // Default response for unmatched routes
    return createResponse(404, {
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Unhandled error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    });
  }
};

/**
 * Helper: Get tenant ID for user from database
 */
async function getTenantIdForUser(cognitoSub) {
  try {
    await getPoolAsync();
    const result = await query(
      `SELECT tenant_id FROM "User" WHERE cognito_sub = $1`,
      [cognitoSub]
    );
    return result.rows[0]?.tenant_id || null;
  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to get tenant ID:', error.message);
    return null;
  }
}

// =============================================================================
// INVOICES HANDLERS
// =============================================================================

/**
 * Get all invoices for tenant
 *
 * Schema (Invoice table):
 *   id, tenant_id, booking_id, owner_id, invoice_number, status,
 *   subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents,
 *   due_date, issued_at, sent_at, paid_at, notes, line_items, created_at, updated_at
 */
async function handleGetInvoices(tenantId, queryParams) {
  const { status, customerId, limit = 50, offset = 0 } = queryParams;

  console.log('[Invoices][list] tenantId:', tenantId);
  console.log('[Invoices][list] query:', JSON.stringify(queryParams || {}));
  console.log('[Invoices][list] env DB_NAME:', process.env.DB_NAME || process.env.DB_DATABASE);

  try {
    await getPoolAsync();

    // Diagnostic: count for THIS tenant only (tenant-scoped for security)
    try {
      const diagCount = await query(
        `SELECT COUNT(*) as cnt FROM "Invoice" WHERE tenant_id = $1 `,
        [tenantId]
      );
      console.log('[Invoices][diag] count for tenant', tenantId, ':', diagCount.rows[0]?.cnt || 0);
    } catch (diagErr) {
      console.warn('[Invoices][diag] count query failed:', diagErr.message);
    }

    let whereClause = 'i.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex++}`;
      params.push(status.toUpperCase());
    }

    if (customerId) {
      whereClause += ` AND i.owner_id = $${paramIndex++}`;
      params.push(customerId);
    }

    // Schema: id, tenant_id, booking_id, owner_id, invoice_number, status,
    //         subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents,
    //         due_date, issued_at, sent_at, paid_at, notes, line_items
    const result = await query(
      `SELECT
         i.id,
         i.invoice_number,
         i.status,
         i.subtotal_cents,
         i.tax_cents,
         i.discount_cents,
         i.total_cents,
         i.paid_cents,
         i.due_date,
         i.issued_at,
         i.sent_at,
         i.paid_at,
         i.notes,
         i.line_items,
         i.booking_id,
         i.owner_id,
         i.created_at,
         i.updated_at,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email
       FROM "Invoice" i
       LEFT JOIN "Owner" o ON i.owner_id = o.id
       WHERE ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    console.log('[Invoices][diag] count:', result.rows.length);

    const invoices = result.rows.map(row => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      status: row.status,
      amount: row.total_cents ? row.total_cents / 100 : 0,  // Convert cents to dollars for frontend
      subtotalCents: row.subtotal_cents,
      taxCents: row.tax_cents,
      discountCents: row.discount_cents,
      totalCents: row.total_cents,
      paidCents: row.paid_cents,
      dueDate: row.due_date,
      issuedAt: row.issued_at,
      sentAt: row.sent_at,
      paidAt: row.paid_at,
      notes: row.notes,
      lineItems: row.line_items,
      bookingId: row.booking_id,
      ownerId: row.owner_id,
      customer: row.owner_first_name ? {
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
        email: row.owner_email,
      } : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: { invoices },
      invoices: invoices, // Compatibility
      total: invoices.length,
      message: 'Invoices retrieved successfully',
    });

  } catch (error) {
    // Handle missing table gracefully (table doesn't exist yet)
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[FINANCIAL-SERVICE] Invoice table not found, returning empty list');
      return createResponse(200, {
        data: { invoices: [] },
        invoices: [],
        total: 0,
        message: 'No invoices (table not initialized)',
      });
    }
    console.error('[FINANCIAL-SERVICE] Failed to get invoices:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve invoices',
    });
  }
}

async function handleGetInvoice(tenantId, invoiceId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT i.*, o.first_name, o.last_name, o.email
       FROM "Invoice" i
       LEFT JOIN "Owner" o ON i.owner_id = o.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [invoiceId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Invoice not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      invoiceNumber: row.invoice_number,
      status: row.status,
      // Use _cents columns per schema
      amount: row.total_cents ? row.total_cents / 100 : 0,  // Convert cents to dollars for frontend
      subtotalCents: row.subtotal_cents,
      taxCents: row.tax_cents,
      discountCents: row.discount_cents,
      totalCents: row.total_cents,
      paidCents: row.paid_cents,
      dueDate: row.due_date,
      issuedAt: row.issued_at,
      sentAt: row.sent_at,
      paidAt: row.paid_at,
      notes: row.notes,
      lineItems: row.line_items,
      bookingId: row.booking_id,
      ownerId: row.owner_id,
      customer: row.first_name ? {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      } : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      message: 'Invoice retrieved successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to get invoice:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve invoice',
    });
  }
}

async function handleCreateInvoice(tenantId, body) {
  const { ownerId, amount, amountCents, totalCents, subtotalCents, taxCents, discountCents, dueDate, notes, lineItems, bookingId } = body;

  // Support both dollar amount and cents - schema uses _cents columns (BIGINT)
  const totalInCents = totalCents || amountCents || (amount ? Math.round(amount * 100) : null);
  const subtotalInCents = subtotalCents || totalInCents || 0;
  const taxInCents = taxCents || 0;
  const discountInCents = discountCents || 0;

  if (!ownerId || !totalInCents) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Owner ID and amount (or totalCents) are required',
    });
  }

  try {
    await getPoolAsync();

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Schema: subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents (NOT amount)
    const result = await query(
      `INSERT INTO "Invoice" (
        tenant_id, owner_id, booking_id, invoice_number,
        subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents,
        due_date, notes, line_items, status, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, 'DRAFT', NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        ownerId,
        bookingId || null,
        invoiceNumber,
        subtotalInCents,
        taxInCents,
        discountInCents,
        totalInCents,
        dueDate || null,
        notes || null,
        lineItems ? JSON.stringify(lineItems) : null
      ]
    );

    const invoice = result.rows[0];

    return createResponse(201, {
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        // Provide both cents and dollars for frontend compatibility
        amount: invoice.total_cents / 100,
        subtotalCents: invoice.subtotal_cents,
        taxCents: invoice.tax_cents,
        discountCents: invoice.discount_cents,
        totalCents: invoice.total_cents,
        paidCents: invoice.paid_cents,
      },
      message: 'Invoice created successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to create invoice:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create invoice',
    });
  }
}

/**
 * Generate an invoice from a booking
 * POST /api/v1/financial/invoices/generate/{bookingId}
 */
async function handleGenerateInvoiceFromBooking(tenantId, bookingId) {
  console.log('[FINANCIAL-SERVICE] Generating invoice for booking:', bookingId);

  try {
    await getPoolAsync();

    // Fetch booking with related data
    const bookingResult = await query(
      `SELECT
         b.id,
         b.tenant_id,
         b.owner_id,
         b.pet_id,
         b.status,
         b.check_in,
         b.check_out,
         b.total_price_in_cents,
         b.deposit_in_cents,
         b.notes,
         b.service_type,
         b.kennel_id,
         b.service_id,
         COALESCE(b.kennel_name, k.name) as kennel_name,
         COALESCE(b.service_name, s.name) as service_name,
         s.price_in_cents as service_price_cents,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email
       FROM "Booking" b
       LEFT JOIN "Kennel" k ON b.kennel_id = k.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       WHERE b.id = $1 AND b.tenant_id = $2 `,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
        code: 'BOOKING_NOT_FOUND',
      });
    }

    const booking = bookingResult.rows[0];

    // Validate booking has an owner
    if (!booking.owner_id) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Booking does not have an associated owner',
        code: 'BOOKING_NO_OWNER',
      });
    }

    // Check if invoice already exists for this booking
    const existingInvoice = await query(
      `SELECT id, invoice_number, status FROM "Invoice"
       WHERE booking_id = $1 AND tenant_id = $2 `,
      [bookingId, tenantId]
    );

    if (existingInvoice.rows.length > 0) {
      const existing = existingInvoice.rows[0];
      return createResponse(409, {
        error: 'Conflict',
        message: `Invoice already exists for this booking: ${existing.invoice_number}`,
        code: 'INVOICE_EXISTS',
        existingInvoiceId: existing.id,
        existingInvoiceNumber: existing.invoice_number,
      });
    }

    // Calculate totals from booking
    const totalCents = booking.total_price_in_cents || 0;
    const depositCents = booking.deposit_in_cents || 0;
    const amountDueCents = totalCents - depositCents;

    // Calculate number of nights
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

    // Generate invoice number
    const timestamp = Date.now();
    const invoiceNumber = `INV-${timestamp}`;

    // Set due date to check-out date or 30 days from now
    const dueDate = booking.check_out || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Build line items description
    let lineItems = [];
    if (booking.service_name) {
      lineItems.push({
        description: `${booking.service_name} - ${nights} night${nights > 1 ? 's' : ''}`,
        quantity: nights,
        unitPriceCents: booking.service_price_cents || Math.round(totalCents / nights),
        totalCents: totalCents,
      });
    } else {
      lineItems.push({
        description: `Boarding - ${nights} night${nights > 1 ? 's' : ''}`,
        quantity: nights,
        unitPriceCents: Math.round(totalCents / nights),
        totalCents: totalCents,
      });
    }

    // Add deposit as negative line item if applicable
    if (depositCents > 0) {
      lineItems.push({
        description: 'Deposit (previously paid)',
        quantity: 1,
        unitPriceCents: -depositCents,
        totalCents: -depositCents,
      });
    }

    // Build invoice notes
    const invoiceNotes = [
      `Booking: ${checkIn.toLocaleDateString()} - ${checkOut.toLocaleDateString()}`,
      booking.kennel_name ? `Kennel: ${booking.kennel_name}` : null,
      booking.notes ? `Notes: ${booking.notes}` : null,
    ].filter(Boolean).join('\n');

    // Create invoice record
    const result = await query(
      `INSERT INTO "Invoice" (
         tenant_id, owner_id, booking_id, invoice_number,
         subtotal_cents, tax_cents, total_cents, amount_due_cents,
         due_date, notes, line_items, status,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'DRAFT', NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        booking.owner_id,
        bookingId,
        invoiceNumber,
        totalCents,       // subtotal_cents
        0,                // tax_cents (can be calculated later)
        totalCents,       // total_cents
        amountDueCents,   // amount_due_cents
        dueDate,
        invoiceNotes,
        JSON.stringify(lineItems),
      ]
    );

    const invoice = result.rows[0];

    console.log('[FINANCIAL-SERVICE] Invoice generated:', invoice.id, 'for booking:', bookingId);

    return createResponse(201, {
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        bookingId: invoice.booking_id,
        ownerId: invoice.owner_id,
        ownerName: `${booking.owner_first_name || ''} ${booking.owner_last_name || ''}`.trim(),
        ownerEmail: booking.owner_email,
        subtotalCents: invoice.subtotal_cents,
        taxCents: invoice.tax_cents,
        totalCents: invoice.total_cents,
        amountDueCents: invoice.amount_due_cents,
        // Also provide dollar amounts for convenience
        subtotal: (invoice.subtotal_cents / 100).toFixed(2),
        tax: (invoice.tax_cents / 100).toFixed(2),
        total: (invoice.total_cents / 100).toFixed(2),
        amountDue: (invoice.amount_due_cents / 100).toFixed(2),
        dueDate: invoice.due_date,
        status: invoice.status,
        lineItems: lineItems,
        notes: invoice.notes,
        createdAt: invoice.created_at,
      },
      message: 'Invoice generated successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to generate invoice from booking:', error.message);

    // Handle specific database errors
    if (error.code === '23505') {
      return createResponse(409, {
        error: 'Conflict',
        message: 'Invoice already exists for this booking',
        code: 'INVOICE_EXISTS',
      });
    }

    // Handle missing column errors gracefully
    if (error.message && error.message.includes('column')) {
      console.error('[FINANCIAL-SERVICE] Database schema issue:', error.message);
      return createResponse(500, {
        error: 'Internal Server Error',
        message: 'Database schema configuration issue. Please contact support.',
        code: 'SCHEMA_ERROR',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate invoice',
      code: 'INVOICE_GENERATION_FAILED',
    });
  }
}

async function handleUpdateInvoice(tenantId, invoiceId, body) {
  // Schema uses _cents columns (BIGINT), NOT amount
  const { amount, amountCents, totalCents, subtotalCents, taxCents, discountCents, paidCents, dueDate, notes, status } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [invoiceId, tenantId];
    let paramIndex = 3;

    // Support both dollar amount and cents - convert to cents if dollar amount provided
    if (totalCents !== undefined) {
      updates.push(`total_cents = $${paramIndex++}`);
      values.push(totalCents);
    } else if (amountCents !== undefined) {
      updates.push(`total_cents = $${paramIndex++}`);
      values.push(amountCents);
    } else if (amount !== undefined) {
      updates.push(`total_cents = $${paramIndex++}`);
      values.push(Math.round(amount * 100));
    }

    if (subtotalCents !== undefined) {
      updates.push(`subtotal_cents = $${paramIndex++}`);
      values.push(subtotalCents);
    }
    if (taxCents !== undefined) {
      updates.push(`tax_cents = $${paramIndex++}`);
      values.push(taxCents);
    }
    if (discountCents !== undefined) {
      updates.push(`discount_cents = $${paramIndex++}`);
      values.push(discountCents);
    }
    if (paidCents !== undefined) {
      updates.push(`paid_cents = $${paramIndex++}`);
      values.push(paidCents);
    }
    if (dueDate) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(dueDate);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status.toUpperCase());
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Invoice"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Invoice not found',
      });
    }

    const invoice = result.rows[0];

    return createResponse(200, {
      success: true,
      invoice: {
        ...invoice,
        // Provide dollar amount for frontend compatibility
        amount: invoice.total_cents ? invoice.total_cents / 100 : 0,
      },
      message: 'Invoice updated successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to update invoice:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update invoice',
    });
  }
}

async function handleSendInvoice(tenantId, invoiceId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Invoice"
       SET status = 'SENT', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [invoiceId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Invoice not found',
      });
    }

    return createResponse(200, {
      success: true,
      sentAt: result.rows[0].sent_at,
      message: 'Invoice sent successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to send invoice:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send invoice',
    });
  }
}

async function handleVoidInvoice(tenantId, invoiceId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Invoice"
       SET status = 'VOIDED', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [invoiceId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Invoice not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Invoice voided successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to void invoice:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to void invoice',
    });
  }
}

async function handleGetInvoicePdf(tenantId, invoiceId) {
  // Placeholder - PDF generation would need additional library
  return createResponse(200, {
    data: {
      pdfUrl: null,
    },
    message: 'PDF generation not yet implemented',
  });
}

// =============================================================================
// PAYMENTS HANDLERS
// =============================================================================

/**
 * Get all payments for tenant
 *
 * Schema (Payment table):
 *   id, tenant_id, invoice_id, owner_id, amount_cents, method, processor,
 *   processor_transaction_id, status, processed_at, notes, created_at, updated_at
 *   NOTE: No deleted_at, refunded_at, or refund_amount_cents columns!
 */
async function handleGetPayments(tenantId, queryParams) {
  const { status, limit = 50, offset = 0 } = queryParams;

  console.log('[Payments][list] tenantId:', tenantId);
  console.log('[Payments][list] query:', JSON.stringify(queryParams || {}));
  console.log('[Payments][list] env DB_NAME:', process.env.DB_NAME || process.env.DB_DATABASE);

  try {
    await getPoolAsync();

    // Diagnostic: count for THIS tenant only (tenant-scoped for security)
    try {
      const diagCount = await query(
        `SELECT COUNT(*) as cnt FROM "Payment" WHERE tenant_id = $1`,
        [tenantId]
      );
      console.log('[Payments][diag] count for tenant', tenantId, ':', diagCount.rows[0]?.cnt || 0);
    } catch (diagErr) {
      console.warn('[Payments][diag] count query failed:', diagErr.message);
    }

    // Note: Payment table has no deleted_at column
    let whereClause = 'p.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex++}`;
      params.push(status.toLowerCase()); // Payment status is lowercase in schema
    }

    // Schema columns (no deleted_at, refunded_at, or refund_amount_cents)
    const result = await query(
      `SELECT
         p.id,
         p.invoice_id,
         p.owner_id,
         p.amount_cents,
         p.method,
         p.processor,
         p.processor_transaction_id,
         p.status,
         p.notes,
         p.processed_at,
         p.created_at,
         p.updated_at,
         o.first_name,
         o.last_name,
         o.email as owner_email
       FROM "Payment" p
       LEFT JOIN "Owner" o ON p.owner_id = o.id
       WHERE ${whereClause}
       ORDER BY p.processed_at DESC NULLS LAST, p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    console.log('[Payments][list] query returned:', result.rows.length, 'rows');

    const payments = result.rows.map(row => ({
      id: row.id,
      invoiceId: row.invoice_id,
      ownerId: row.owner_id,
      amount: row.amount_cents ? row.amount_cents / 100 : 0,  // Convert cents to dollars
      amountCents: row.amount_cents,
      status: row.status,
      paymentMethod: row.method,
      method: row.method,
      processor: row.processor,
      processorTransactionId: row.processor_transaction_id,
      notes: row.notes,
      processedAt: row.processed_at,
      paidAt: row.processed_at, // Alias for frontend compatibility
      customerName: row.first_name ? `${row.first_name} ${row.last_name}`.trim() : null,
      ownerEmail: row.owner_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: { payments },
      payments: payments, // Compatibility
      total: payments.length,
      message: 'Payments retrieved successfully',
    });

  } catch (error) {
    // Handle missing table gracefully (table doesn't exist yet)
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[FINANCIAL-SERVICE] Payment table not found, returning empty list');
      return createResponse(200, {
        data: { payments: [] },
        payments: [],
        total: 0,
        message: 'No payments (table not initialized)',
      });
    }
    console.error('[FINANCIAL-SERVICE] Failed to get payments:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve payments',
    });
  }
}

/**
 * Get single payment
 * Schema: amount_cents, method (not amount, payment_method)
 */
async function handleGetPayment(tenantId, paymentId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT p.*, o.first_name, o.last_name, o.email
       FROM "Payment" p
       LEFT JOIN "Owner" o ON p.owner_id = o.id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [paymentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      amount: row.amount_cents ? row.amount_cents / 100 : 0,
      amountCents: row.amount_cents,
      status: row.status,
      paymentMethod: row.method,
      method: row.method,
      processor: row.processor,
      processorTransactionId: row.processor_transaction_id,
      processedAt: row.processed_at,
      notes: row.notes,
      customer: row.first_name ? {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      } : null,
      createdAt: row.created_at,
      message: 'Payment retrieved successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to get payment:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve payment',
    });
  }
}

/**
 * Create payment
 * Schema: amount_cents, method (not amount, payment_method)
 */
async function handleCreatePayment(tenantId, body) {
  const { ownerId, amount, amountCents, paymentMethod, method, invoiceId } = body;

  // Support both dollar amount and cents
  const cents = amountCents || (amount ? Math.round(amount * 100) : null);

  if (!cents) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Amount is required',
    });
  }

  try {
    await getPoolAsync();

    const paymentMethodValue = method || paymentMethod || 'card';

    const result = await query(
      `INSERT INTO "Payment" (tenant_id, owner_id, invoice_id, amount_cents, method, status, processed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'completed', NOW(), NOW(), NOW())
       RETURNING *`,
      [tenantId, ownerId || null, invoiceId || null, cents, paymentMethodValue.toLowerCase()]
    );

    const payment = result.rows[0];

    return createResponse(201, {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount_cents / 100,
        amountCents: payment.amount_cents,
        status: payment.status,
        method: payment.method,
      },
      message: 'Payment created successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to create payment:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create payment',
    });
  }
}

async function handleRefundPayment(tenantId, paymentId, body) {
  const { amount } = body;

  try {
    await getPoolAsync();

    // TODO: When the Payment schema gains refunded_at / refund_amount_cents columns,
    //       extend this UPDATE to record refund metadata (timestamp, amount, etc.).
    //       For now, we only flip status to 'refunded' to avoid touching non-existent columns.
    //       See schema note at line ~698: "No deleted_at, refunded_at, or refund_amount_cents columns!"
    const result = await query(
      `UPDATE "Payment"
       SET status = 'refunded', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [paymentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    return createResponse(200, {
      success: true,
      refundId: `REF-${Date.now()}`,
      message: 'Payment refunded successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to refund payment:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to refund payment',
    });
  }
}

async function handleCapturePayment(tenantId, paymentId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Payment"
       SET status = 'CAPTURED', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [paymentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Payment captured successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to capture payment:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to capture payment',
    });
  }
}

/**
 * Get receipt data for a payment
 * Schema: Payment uses amount_cents (NOT amount_in_cents)
 */
async function handleGetReceipt(tenantId, paymentId) {
  console.log('[Receipt][get] paymentId:', paymentId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Get payment with related data
    // Schema uses amount_cents (NOT amount_in_cents)
    const result = await query(
      `SELECT
         p.id,
         p.amount_cents,
         p.method,
         p.status,
         p.processed_at,
         p.notes,
         p.invoice_id,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         o.address_street,
         o.address_city,
         o.address_state,
         o.address_zip,
         t.name as tenant_name,
         t.business_address_street,
         t.business_address_city,
         t.business_address_state,
         t.business_address_zip,
         t.business_phone,
         t.business_email
       FROM "Payment" p
       LEFT JOIN "Owner" o ON o.id = p.owner_id
       LEFT JOIN "Tenant" t ON t.id = p.tenant_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [paymentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    const payment = result.rows[0];
    const amountCents = payment.amount_cents || 0;

    // Generate receipt data
    const receipt = {
      receiptNumber: `RCP-${paymentId.split('-')[0].toUpperCase()}`,
      paymentId: payment.id,
      paymentDate: payment.processed_at || new Date().toISOString(),
      amount: amountCents / 100,
      amountCents: amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      paymentMethod: payment.method || 'Card',
      status: payment.status,

      // Business info
      business: {
        name: payment.tenant_name || 'BarkBase',
        address: [
          payment.business_address_street,
          `${payment.business_address_city || ''}, ${payment.business_address_state || ''} ${payment.business_address_zip || ''}`.trim(),
        ].filter(Boolean).join('\n'),
        phone: payment.business_phone,
        email: payment.business_email,
      },

      // Customer info
      customer: {
        id: payment.owner_id,
        name: `${payment.owner_first_name || ''} ${payment.owner_last_name || ''}`.trim() || 'Customer',
        email: payment.owner_email,
        phone: payment.owner_phone,
        address: [
          payment.address_street,
          `${payment.address_city || ''}, ${payment.address_state || ''} ${payment.address_zip || ''}`.trim(),
        ].filter(Boolean).join('\n'),
      },

      notes: payment.notes,
      generatedAt: new Date().toISOString(),
    };

    return createResponse(200, {
      success: true,
      receipt: receipt,
      message: 'Receipt generated successfully',
    });

  } catch (error) {
    console.error('[Receipt][get] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate receipt',
    });
  }
}

/**
 * Send receipt via email
 * Body: { email?: string } - optional email override
 * Schema: Payment uses amount_cents (NOT amount_in_cents)
 */
async function handleSendReceipt(tenantId, paymentId, body) {
  const { email } = body;

  console.log('[Receipt][send] paymentId:', paymentId, 'tenantId:', tenantId, 'email:', email);

  try {
    await getPoolAsync();

    // Get payment and owner details
    // Schema uses amount_cents (NOT amount_in_cents)
    const result = await query(
      `SELECT
         p.id,
         p.amount_cents,
         p.method,
         p.status,
         p.processed_at,
         o.email as owner_email,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         t.name as tenant_name
       FROM "Payment" p
       LEFT JOIN "Owner" o ON o.id = p.owner_id
       LEFT JOIN "Tenant" t ON t.id = p.tenant_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [paymentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    const payment = result.rows[0];
    const recipientEmail = email || payment.owner_email;

    if (!recipientEmail) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No email address available. Please provide an email in the request.',
      });
    }

    // For now, we'll just mark the receipt as "sent" and return success
    // In production, this would integrate with an email service like SES, SendGrid, etc.

    // Log the receipt send attempt
    console.log('[Receipt][send] Would send receipt to:', recipientEmail, {
      paymentId,
      amount: (payment.amount_cents || 0) / 100,
      customerName: `${payment.owner_first_name || ''} ${payment.owner_last_name || ''}`.trim(),
      business: payment.tenant_name,
    });

    // Generate receipt URL (in production, this would be a real URL)
    const receiptUrl = `/api/v1/financial/payments/${paymentId}/receipt`;

    return createResponse(200, {
      success: true,
      sentTo: recipientEmail,
      receiptUrl: receiptUrl,
      receiptNumber: `RCP-${paymentId.split('-')[0].toUpperCase()}`,
      message: `Receipt sent successfully to ${recipientEmail}`,
      // Note: In production, implement actual email sending
      note: 'Email service integration pending. Receipt data is available at the receiptUrl.',
    });

  } catch (error) {
    console.error('[Receipt][send] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send receipt',
    });
  }
}

// =============================================================================
// PAYMENT METHODS HANDLERS
// =============================================================================

async function handleGetPaymentMethods(tenantId) {
  console.log('[PaymentMethods][list] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Query distinct payment methods from Payment table
    // Since there's no dedicated PaymentMethod table, we aggregate from payments
    const result = await query(
      `SELECT DISTINCT ON (method, processor)
         method,
         processor,
         MAX(processed_at) as last_used_at,
         COUNT(*) as usage_count
       FROM "Payment"
       WHERE tenant_id = $1
       GROUP BY method, processor
       ORDER BY method, processor, MAX(processed_at) DESC`,
      [tenantId]
    );

    // Transform to payment method format expected by frontend
    const methods = result.rows.map((row, index) => ({
      id: `pm_${index + 1}`,
      type: row.method || 'card',
      processor: row.processor,
      last4: '****', // Not stored in current schema
      isPrimary: index === 0,
      lastUsedAt: row.last_used_at,
      usageCount: parseInt(row.usage_count, 10),
    }));

    console.log('[PaymentMethods][list] Found:', methods.length, 'methods');

    return createResponse(200, {
      data: {
        methods: methods,
        paymentMethods: methods,
      },
      methods: methods,
      message: 'Payment methods retrieved successfully',
    });

  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[PaymentMethods] Table not found, returning empty array');
      return createResponse(200, {
        data: { methods: [], paymentMethods: [] },
        methods: [],
        message: 'Payment methods retrieved (no payments on file)',
      });
    }

    console.error('[PaymentMethods] Failed to get:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve payment methods',
    });
  }
}

async function handleGetPaymentMethod(tenantId, pmId) {
  return createResponse(404, {
    error: 'Not Found',
    message: 'Payment method not found (feature pending implementation)',
  });
}

async function handleAddPaymentMethod(tenantId, body) {
  return createResponse(201, {
    success: true,
    methodId: `PM-${Date.now()}`,
    message: 'Payment method added (feature pending implementation)',
  });
}

async function handleUpdatePaymentMethod(tenantId, pmId, body) {
  return createResponse(200, {
    success: true,
    message: 'Payment method updated (feature pending implementation)',
  });
}

async function handleDeletePaymentMethod(tenantId, pmId) {
  return createResponse(200, {
    success: true,
    message: 'Payment method deleted (feature pending implementation)',
  });
}

async function handleSetDefaultPaymentMethod(tenantId, pmId) {
  return createResponse(200, {
    success: true,
    message: 'Default payment method set (feature pending implementation)',
  });
}

// =============================================================================
// PRICING HANDLERS
// =============================================================================

async function handleGetPricing(tenantId) {
  try {
    await getPoolAsync();

    // Schema uses price_in_cents (BIGINT), NOT price
    const result = await query(
      `SELECT id, name, description, price_in_cents, unit, is_active
       FROM "Service"
       WHERE tenant_id = $1
       ORDER BY name`,
      [tenantId]
    );

    const items = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      // Convert cents to dollars for frontend compatibility
      price: row.price_in_cents ? row.price_in_cents / 100 : 0,
      priceInCents: row.price_in_cents,
      unit: row.unit || 'per day',
      isActive: row.is_active,
    }));

    return createResponse(200, {
      data: { items },
      items: items, // Compatibility
      message: 'Pricing retrieved successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to get pricing:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve pricing',
    });
  }
}

async function handleGetPriceItem(tenantId, priceId) {
  try {
    await getPoolAsync();

    // Schema uses price_in_cents (BIGINT), NOT price
    const result = await query(
      `SELECT id, name, description, price_in_cents, unit, is_active, created_at, updated_at
       FROM "Service" WHERE id = $1 AND tenant_id = $2`,
      [priceId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Price item not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      name: row.name,
      description: row.description,
      // Convert cents to dollars for frontend compatibility
      price: row.price_in_cents ? row.price_in_cents / 100 : 0,
      priceInCents: row.price_in_cents,
      unit: row.unit,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      message: 'Price item retrieved successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to get price item:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve price item',
    });
  }
}

async function handleCreatePriceItem(tenantId, body) {
  const { name, description, price, priceInCents, unit } = body;

  // Support both dollar amount and cents - schema uses price_in_cents (BIGINT)
  const priceInCentsValue = priceInCents || (price !== undefined ? Math.round(price * 100) : null);

  if (!name || priceInCentsValue === null) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Name and price (or priceInCents) are required',
    });
  }

  try {
    await getPoolAsync();

    // Schema uses price_in_cents (BIGINT), NOT price
    const result = await query(
      `INSERT INTO "Service" (tenant_id, name, description, price_in_cents, unit, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING *`,
      [tenantId, name, description, priceInCentsValue, unit || 'per day']
    );

    const service = result.rows[0];

    return createResponse(201, {
      success: true,
      item: {
        id: service.id,
        name: service.name,
        description: service.description,
        // Convert cents to dollars for frontend compatibility
        price: service.price_in_cents / 100,
        priceInCents: service.price_in_cents,
        unit: service.unit,
        isActive: service.is_active,
      },
      message: 'Price item created successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to create price item:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create price item',
    });
  }
}

async function handleUpdatePriceItem(tenantId, priceId, body) {
  const { name, description, price, priceInCents, unit, isActive } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [priceId, tenantId];
    let paramIndex = 3;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    // Schema uses price_in_cents (BIGINT), NOT price
    if (priceInCents !== undefined) {
      updates.push(`price_in_cents = $${paramIndex++}`);
      values.push(priceInCents);
    } else if (price !== undefined) {
      // Convert dollars to cents
      updates.push(`price_in_cents = $${paramIndex++}`);
      values.push(Math.round(price * 100));
    }
    if (unit) {
      updates.push(`unit = $${paramIndex++}`);
      values.push(unit);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Service"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Price item not found',
      });
    }

    const service = result.rows[0];

    return createResponse(200, {
      success: true,
      item: {
        ...service,
        // Convert cents to dollars for frontend compatibility
        price: service.price_in_cents ? service.price_in_cents / 100 : 0,
        priceInCents: service.price_in_cents,
      },
      message: 'Price item updated successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to update price item:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update price item',
    });
  }
}

async function handleDeletePriceItem(tenantId, priceId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Service"
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [priceId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Price item not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Price item deleted successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to delete price item:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete price item',
    });
  }
}

async function handleCalculatePrice(tenantId, queryParams) {
  const { serviceId, quantity = 1, discountPercent = 0 } = queryParams;

  try {
    await getPoolAsync();

    let basePriceCents = 0;

    if (serviceId) {
      // Schema uses price_in_cents (BIGINT), NOT price
      const result = await query(
        `SELECT price_in_cents FROM "Service" WHERE id = $1 AND tenant_id = $2`,
        [serviceId, tenantId]
      );
      basePriceCents = parseInt(result.rows[0]?.price_in_cents || 0);
    }

    const subtotalCents = basePriceCents * parseInt(quantity);
    const discountCents = Math.round(subtotalCents * (parseFloat(discountPercent) / 100));
    const totalCents = subtotalCents - discountCents;

    return createResponse(200, {
      data: {
        // Provide both cents and dollars
        subtotalCents,
        discountCents,
        taxCents: 0, // Tax calculation would depend on location
        totalCents,
        // Dollar amounts for frontend compatibility
        subtotal: subtotalCents / 100,
        discount: discountCents / 100,
        tax: 0,
        total: totalCents / 100,
      },
      message: 'Price calculated successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to calculate price:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to calculate price',
    });
  }
}

// =============================================================================
// BILLING HANDLERS
// =============================================================================

/**
 * Get billing summary
 * Schema: Invoice uses total_cents (not amount), Payment uses amount_cents & processed_at
 */
async function handleGetBillingSummary(tenantId) {
  try {
    await getPoolAsync();

    let currentBalance = 0;
    let lastPaymentDate = null;
    let lastPaymentAmount = 0;

    // Get outstanding invoices - use total_cents (not amount)
    try {
      const outstandingResult = await query(
        `SELECT COALESCE(SUM(total_cents - COALESCE(paid_cents, 0)), 0) as total_cents
         FROM "Invoice"
         WHERE tenant_id = $1 AND status IN ('SENT', 'OVERDUE') `,
        [tenantId]
      );
      // Convert cents to dollars
      currentBalance = (parseInt(outstandingResult.rows[0]?.total_cents || 0)) / 100;
    } catch (e) {
      if (!e.message?.includes('does not exist') && e.code !== '42P01') {
        console.warn('[FINANCIAL-SERVICE] Invoice query error:', e.message);
      }
    }

    // Get last payment - use amount_cents & processed_at (status is lowercase)
    try {
      const lastPaymentResult = await query(
        `SELECT processed_at, amount_cents
         FROM "Payment"
         WHERE tenant_id = $1 AND status = 'completed'
         ORDER BY processed_at DESC NULLS LAST
         LIMIT 1`,
        [tenantId]
      );
      lastPaymentDate = lastPaymentResult.rows[0]?.processed_at || null;
      // Convert cents to dollars
      lastPaymentAmount = (parseInt(lastPaymentResult.rows[0]?.amount_cents || 0)) / 100;
    } catch (e) {
      if (!e.message?.includes('does not exist') && e.code !== '42P01') {
        console.warn('[FINANCIAL-SERVICE] Payment query error:', e.message);
      }
    }

    return createResponse(200, {
      data: {
        currentBalance,
        lastPaymentDate,
        lastPaymentAmount,
      },
      message: 'Billing summary retrieved successfully',
    });

  } catch (error) {
    console.error('[FINANCIAL-SERVICE] Failed to get billing summary:', error.message);
    // Return safe fallback instead of 500
    return createResponse(200, {
      data: {
        currentBalance: 0,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
      },
      message: 'Billing summary (tables not initialized)',
    });
  }
}

/**
 * Get billing history
 * Schema: amount_cents, method, processed_at (not amount, payment_method, created_at)
 */
async function handleGetBillingHistory(tenantId, queryParams) {
  const { limit = 50, offset = 0 } = queryParams;

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT id, amount_cents, status, processed_at, method
       FROM "Payment"
       WHERE tenant_id = $1
       ORDER BY processed_at DESC NULLS LAST, created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, parseInt(limit), parseInt(offset)]
    );

    return createResponse(200, {
      data: {
        transactions: result.rows.map(row => ({
          id: row.id,
          amount: row.amount_cents ? row.amount_cents / 100 : 0,
          amountCents: row.amount_cents,
          status: row.status,
          paymentMethod: row.method,
          method: row.method,
          date: row.processed_at,
        })),
      },
      message: 'Billing history retrieved successfully',
    });

  } catch (error) {
    // Handle missing table gracefully
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[FINANCIAL-SERVICE] Payment table not found, returning empty history');
      return createResponse(200, {
        data: { transactions: [] },
        message: 'Billing history (table not initialized)',
      });
    }
    console.error('[FINANCIAL-SERVICE] Failed to get billing history:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve billing history',
    });
  }
}

/**
 * Get upcoming charges
 * Schema: Booking uses check_in and total_price_in_cents (not start_date, total_price)
 */
async function handleGetUpcomingCharges(tenantId) {
  try {
    await getPoolAsync();

    // Get upcoming bookings that haven't been invoiced
    const result = await query(
      `SELECT b.id, b.total_price_in_cents, b.check_in
       FROM "Booking" b
       WHERE b.tenant_id = $1
       AND b.status IN ('PENDING', 'CONFIRMED')
       AND b.check_in >= CURRENT_DATE
             ORDER BY b.check_in
       LIMIT 10`,
      [tenantId]
    );

    return createResponse(200, {
      data: {
        charges: result.rows.map(row => ({
          id: row.id,
          amount: row.total_price_in_cents ? row.total_price_in_cents / 100 : 0,
          amountCents: row.total_price_in_cents,
          date: row.check_in,
          type: 'booking',
        })),
      },
      message: 'Upcoming charges retrieved successfully',
    });

  } catch (error) {
    // Handle missing table or column gracefully
    if (error.message?.includes('does not exist') || error.code === '42P01' || error.code === '42703') {
      console.log('[FINANCIAL-SERVICE] Booking table/column not found for upcoming charges');
      return createResponse(200, {
        data: { charges: [] },
        message: 'Upcoming charges (feature not initialized)',
      });
    }
    console.error('[FINANCIAL-SERVICE] Failed to get upcoming charges:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve upcoming charges',
    });
  }
}

async function handleCreateCharge(tenantId, body) {
  // Alias for create payment
  return handleCreatePayment(tenantId, body);
}

/**
 * Get detailed billing usage statistics
 * Returns real counts from database for bookings, pets, staff, storage
 */
async function handleGetBillingUsage(tenantId) {
  console.log('[Billing][usage] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Get tenant plan info
    const tenantResult = await query(
      `SELECT plan FROM "Tenant" WHERE id = $1 `,
      [tenantId]
    );
    const plan = tenantResult.rows[0]?.plan || 'FREE';

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Run all usage queries in parallel
    const [bookingsResult, petsResult, staffResult, storageResult, trendsResult] = await Promise.all([
      // Bookings this month
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1         AND created_at >= $2 AND created_at <= $3`,
        [tenantId, monthStart.toISOString(), monthEnd.toISOString()]
      ),
      // Active pets
      query(
        `SELECT COUNT(*) as count FROM "Pet"
         WHERE tenant_id = $1  AND is_active = true`,
        [tenantId]
      ),
      // Team members (staff/users)
      query(
        `SELECT COUNT(*) as count FROM "User"
         WHERE tenant_id = $1  AND is_active = true`,
        [tenantId]
      ),
      // Storage used (placeholder - would need file tracking table)
      Promise.resolve({ rows: [{ total_bytes: 0 }] }),
      // Usage trends - last 6 months of bookings
      query(
        `SELECT
           date_trunc('month', created_at) as month,
           COUNT(*) as count
         FROM "Booking"
         WHERE tenant_id = $1
                     AND created_at >= NOW() - INTERVAL '6 months'
         GROUP BY date_trunc('month', created_at)
         ORDER BY month DESC`,
        [tenantId]
      ),
    ]);

    const bookingsThisMonth = parseInt(bookingsResult.rows[0]?.count || '0', 10);
    const activePets = parseInt(petsResult.rows[0]?.count || '0', 10);
    const teamSeats = parseInt(staffResult.rows[0]?.count || '0', 10);
    const storageUsedMB = Math.round((parseInt(storageResult.rows[0]?.total_bytes || '0', 10)) / (1024 * 1024));

    // Define plan limits
    const planLimits = {
      FREE: { bookings: 150, pets: 100, seats: 2, storageMB: 100 },
      PRO: { bookings: 2500, pets: -1, seats: 5, storageMB: 1000 },
      ENTERPRISE: { bookings: -1, pets: -1, seats: -1, storageMB: 10000 },
    };
    const limits = planLimits[plan] || planLimits.FREE;

    // Format trends for chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trends = trendsResult.rows.map(row => ({
      month: monthNames[new Date(row.month).getMonth()],
      bookings: parseInt(row.count, 10),
    })).reverse();

    // Calculate average and trend
    const totalBookings = trends.reduce((sum, t) => sum + t.bookings, 0);
    const avgBookings = trends.length > 0 ? Math.round(totalBookings / trends.length) : 0;
    const lastMonth = trends[trends.length - 1]?.bookings || 0;
    const prevMonth = trends[trends.length - 2]?.bookings || 0;
    const growthPercent = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

    // Calculate percentages
    const getPercentage = (used, limit) => {
      if (limit === -1) return 0; // Unlimited
      return Math.min(Math.round((used / limit) * 100), 100);
    };

    // Current period info
    const periodStart = monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const periodEnd = monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return createResponse(200, {
      success: true,
      usage: {
        period: `${periodStart} - ${periodEnd}`,
        resetDate,
        bookings: {
          used: bookingsThisMonth,
          limit: limits.bookings,
          percentage: getPercentage(bookingsThisMonth, limits.bookings),
        },
        activePets: {
          used: activePets,
          limit: limits.pets,
          percentage: getPercentage(activePets, limits.pets),
        },
        storage: {
          used: storageUsedMB,
          limit: limits.storageMB,
          percentage: getPercentage(storageUsedMB, limits.storageMB),
          details: { photos: Math.round(storageUsedMB * 0.7), documents: Math.round(storageUsedMB * 0.3) },
        },
        seats: {
          used: teamSeats,
          limit: limits.seats,
          percentage: getPercentage(teamSeats, limits.seats),
        },
      },
      trends,
      insights: {
        avgBookings,
        busiestMonth: trends.reduce((max, t) => t.bookings > max.bookings ? t : max, { month: 'N/A', bookings: 0 }),
        growthPercent,
        growthDirection: growthPercent >= 0 ? 'up' : 'down',
      },
      plan,
    });

  } catch (error) {
    console.error('[Billing][usage] Failed:', error.message);
    // Return safe fallback
    return createResponse(200, {
      success: true,
      usage: {
        period: 'Current Month',
        resetDate: 'Next Month',
        bookings: { used: 0, limit: 150, percentage: 0 },
        activePets: { used: 0, limit: 100, percentage: 0 },
        storage: { used: 0, limit: 100, percentage: 0, details: { photos: 0, documents: 0 } },
        seats: { used: 0, limit: 2, percentage: 0 },
      },
      trends: [],
      insights: { avgBookings: 0, busiestMonth: { month: 'N/A', bookings: 0 }, growthPercent: 0, growthDirection: 'up' },
      plan: 'FREE',
    });
  }
}

/**
 * Handle plan upgrade request
 * In production, this would integrate with Stripe checkout
 */
async function handleUpgradePlan(tenantId, body) {
  const { plan, billingCycle = 'monthly' } = body;
  console.log('[Billing][upgrade] tenantId:', tenantId, 'plan:', plan, 'cycle:', billingCycle);

  if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Invalid plan. Must be PRO or ENTERPRISE.',
    });
  }

  try {
    await getPoolAsync();

    // In production, this would:
    // 1. Create a Stripe checkout session
    // 2. Return the checkout URL
    // 3. Handle webhook to update tenant plan after payment

    // For now, we'll just return info about what would happen
    const pricing = {
      PRO: { monthly: 149, annual: 79 },
      ENTERPRISE: { monthly: 399, annual: 299 },
    };

    const price = pricing[plan]?.[billingCycle] || 0;
    const annualSavings = billingCycle === 'annual' ? (pricing[plan].monthly - pricing[plan].annual) * 12 : 0;

    return createResponse(200, {
      success: true,
      message: `Upgrade to ${plan} plan initiated`,
      checkout: {
        plan,
        billingCycle,
        pricePerMonth: price,
        annualSavings,
        // In production: checkoutUrl: 'https://checkout.stripe.com/...'
        checkoutUrl: null, // Not implemented - would redirect to Stripe
      },
    });

  } catch (error) {
    console.error('[Billing][upgrade] Failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to process upgrade request',
    });
  }
}

// =============================================================================
// SUBSCRIPTIONS HANDLERS
// =============================================================================

async function handleGetSubscriptions(tenantId) {
  console.log('[Subscriptions][list] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Get tenant plan info
    const tenantResult = await query(
      `SELECT id, name, plan, created_at, updated_at
       FROM "Tenant"
       WHERE id = $1 `,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    const tenant = tenantResult.rows[0];

    // Get usage statistics for the subscription
    const usageQueries = await Promise.all([
      // Count bookings this month
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1         AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [tenantId]
      ),
      // Count active pets
      query(
        `SELECT COUNT(*) as count FROM "Pet"
         WHERE tenant_id = $1  AND is_active = true`,
        [tenantId]
      ),
      // Count team members (users)
      query(
        `SELECT COUNT(*) as count FROM "User"
         WHERE tenant_id = $1  AND is_active = true`,
        [tenantId]
      ),
    ]);

    const bookingsThisMonth = parseInt(usageQueries[0].rows[0]?.count || '0', 10);
    const activePets = parseInt(usageQueries[1].rows[0]?.count || '0', 10);
    const teamSeats = parseInt(usageQueries[2].rows[0]?.count || '0', 10);

    // Define plan limits based on subscription tier
    const planLimits = {
      FREE: { bookings: 150, storage: 100, seats: 2 },
      PRO: { bookings: 1000, storage: 1000, seats: 10 },
      ENTERPRISE: { bookings: -1, storage: -1, seats: -1 }, // unlimited
    };

    const limits = planLimits[tenant.plan] || planLimits.FREE;

    // Build subscription object matching frontend expectations
    const subscription = {
      id: tenant.id,
      tenantId: tenant.id,
      plan: tenant.plan || 'FREE',
      planName: tenant.plan || 'FREE',
      description: getPlanDescription(tenant.plan),
      status: 'active',
      currentPeriodStart: getMonthStart(),
      currentPeriodEnd: getMonthEnd(),
      createdAt: tenant.created_at,
      usage: {
        bookings: { used: bookingsThisMonth, limit: limits.bookings },
        activePets: activePets,
        storage: { used: 0, limit: limits.storage }, // Storage tracking not implemented yet
        seats: { used: teamSeats, limit: limits.seats },
      },
    };

    console.log('[Subscriptions][list] Returning subscription for tenant:', tenant.name);

    return createResponse(200, {
      data: {
        subscriptions: [subscription],
        currentPlan: subscription,
      },
      subscriptions: [subscription],
      message: 'Subscriptions retrieved successfully',
    });

  } catch (error) {
    console.error('[Subscriptions] Failed to get:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve subscriptions',
    });
  }
}

function getPlanDescription(plan) {
  const descriptions = {
    FREE: 'Community support tier',
    PRO: 'Professional tier with advanced features',
    ENTERPRISE: 'Enterprise tier with unlimited access',
  };
  return descriptions[plan] || descriptions.FREE;
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function getMonthEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
}

async function handleGetSubscription(tenantId, subId) {
  return createResponse(404, {
    error: 'Not Found',
    message: 'Subscription not found (feature pending implementation)',
  });
}

async function handleCreateSubscription(tenantId, body) {
  return createResponse(201, {
    success: true,
    subscriptionId: `SUB-${Date.now()}`,
    message: 'Subscription created (feature pending implementation)',
  });
}

async function handleUpdateSubscription(tenantId, subId, body) {
  return createResponse(200, {
    success: true,
    message: 'Subscription updated (feature pending implementation)',
  });
}

async function handleCancelSubscription(tenantId, subId) {
  return createResponse(200, {
    success: true,
    message: 'Subscription cancelled (feature pending implementation)',
  });
}

async function handlePauseSubscription(tenantId, subId) {
  return createResponse(200, {
    success: true,
    message: 'Subscription paused (feature pending implementation)',
  });
}

async function handleResumeSubscription(tenantId, subId) {
  return createResponse(200, {
    success: true,
    message: 'Subscription resumed (feature pending implementation)',
  });
}

// =============================================================================
// STRIPE PAYMENT HANDLERS
// =============================================================================

/**
 * Create a Stripe PaymentIntent for a one-time payment
 * Frontend uses this with Stripe Elements to collect card details
 *
 * @param {string} tenantId - Tenant ID
 * @param {object} body - { amount, currency, ownerId, invoiceId, description, metadata }
 */
async function handleCreatePaymentIntent(tenantId, body) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'Payment processing is not configured. Please contact support.',
    });
  }

  const { amount, currency = 'usd', ownerId, invoiceId, description, metadata = {} } = body;

  if (!amount || amount <= 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Amount must be a positive number (in cents)',
    });
  }

  try {
    await getPoolAsync();

    // Get owner details for Stripe metadata (exclude soft-deleted)
    let ownerEmail = null;
    let stripeCustomerId = null;
    if (ownerId) {
      const ownerResult = await query(
        `SELECT email, stripe_customer_id FROM "Owner" WHERE id = $1 AND tenant_id = $2 `,
        [ownerId, tenantId]
      );
      if (ownerResult.rows[0]) {
        ownerEmail = ownerResult.rows[0].email;
        stripeCustomerId = ownerResult.rows[0].stripe_customer_id;
      }
    }

    const paymentIntentParams = {
      amount: Math.round(amount), // Ensure integer cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        tenant_id: tenantId,
        owner_id: ownerId || '',
        invoice_id: invoiceId || '',
        ...metadata,
      },
    };

    // Add description if provided
    if (description) {
      paymentIntentParams.description = description;
    }

    // Add receipt email if owner has email
    if (ownerEmail) {
      paymentIntentParams.receipt_email = ownerEmail;
    }

    // Attach to existing Stripe customer if they have one
    if (stripeCustomerId) {
      paymentIntentParams.customer = stripeCustomerId;
    }

    console.log('[Stripe] Creating PaymentIntent:', { amount, currency, ownerId, invoiceId });

    const paymentIntent = await stripeClient.paymentIntents.create(paymentIntentParams);

    console.log('[Stripe] PaymentIntent created:', paymentIntent.id);

    return createResponse(200, {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

  } catch (error) {
    console.error('[Stripe] Failed to create PaymentIntent:', error.message);

    // Return Stripe-specific error info if available
    if (error.type === 'StripeCardError') {
      return createResponse(400, {
        error: 'Payment Error',
        message: error.message,
        code: error.code,
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create payment intent',
    });
  }
}

/**
 * Confirm a payment after frontend processes with Stripe.js
 * Records the payment in our database
 *
 * @param {string} tenantId - Tenant ID
 * @param {object} body - { paymentIntentId, ownerId, invoiceId }
 */
async function handleConfirmPayment(tenantId, body) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'Payment processing is not configured.',
    });
  }

  const { paymentIntentId, ownerId, invoiceId } = body;

  if (!paymentIntentId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'paymentIntentId is required',
    });
  }

  try {
    await getPoolAsync();

    // Retrieve the PaymentIntent from Stripe to get status
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    console.log('[Stripe] PaymentIntent status:', paymentIntent.status);

    if (paymentIntent.status !== 'succeeded') {
      return createResponse(400, {
        error: 'Payment Not Complete',
        message: `Payment status is ${paymentIntent.status}. Expected 'succeeded'.`,
        status: paymentIntent.status,
      });
    }

    // Check if we already recorded this payment (idempotency)
    const existingPayment = await query(
      `SELECT id FROM "Payment" WHERE stripe_payment_intent_id = $1 AND tenant_id = $2`,
      [paymentIntentId, tenantId]
    );

    if (existingPayment.rows.length > 0) {
      console.log('[Stripe] Payment already recorded:', existingPayment.rows[0].id);
      return createResponse(200, {
        success: true,
        paymentId: existingPayment.rows[0].id,
        message: 'Payment already recorded',
      });
    }

    // Record the payment in our database
    const result = await query(
      `INSERT INTO "Payment" (
        tenant_id, owner_id, invoice_id, amount_cents, method, processor,
        processor_transaction_id, stripe_payment_intent_id, status, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        tenantId,
        ownerId || paymentIntent.metadata?.owner_id || null,
        invoiceId || paymentIntent.metadata?.invoice_id || null,
        paymentIntent.amount,
        paymentIntent.payment_method_types?.[0] || 'card',
        'stripe',
        paymentIntent.latest_charge || paymentIntentId,
        paymentIntentId,
        'completed',
      ]
    );

    const payment = result.rows[0];

    // If linked to an invoice, update the invoice paid amount
    const linkedInvoiceId = invoiceId || paymentIntent.metadata?.invoice_id;
    if (linkedInvoiceId) {
      await query(
        `UPDATE "Invoice"
         SET paid_cents = COALESCE(paid_cents, 0) + $1,
             status = CASE
               WHEN COALESCE(paid_cents, 0) + $1 >= total_cents THEN 'PAID'
               WHEN COALESCE(paid_cents, 0) + $1 > 0 THEN 'PARTIAL'
               ELSE status
             END,
             paid_at = CASE
               WHEN COALESCE(paid_cents, 0) + $1 >= total_cents THEN NOW()
               ELSE paid_at
             END,
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [paymentIntent.amount, linkedInvoiceId, tenantId]
      );
    }

    console.log('[Stripe] Payment recorded:', payment.id);

    return createResponse(200, {
      success: true,
      paymentId: payment.id,
      amount: payment.amount_cents / 100,
      status: payment.status,
      message: 'Payment confirmed and recorded',
    });

  } catch (error) {
    console.error('[Stripe] Failed to confirm payment:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to confirm payment',
    });
  }
}

/**
 * Create a Stripe Customer for an owner (for card-on-file)
 *
 * @param {string} tenantId - Tenant ID
 * @param {object} body - { ownerId }
 */
async function handleCreateStripeCustomer(tenantId, body) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'Payment processing is not configured.',
    });
  }

  const { ownerId } = body;

  if (!ownerId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'ownerId is required',
    });
  }

  try {
    await getPoolAsync();

    // Get owner details (exclude soft-deleted)
    const ownerResult = await query(
      `SELECT id, first_name, last_name, email, phone, stripe_customer_id
       FROM "Owner" WHERE id = $1 AND tenant_id = $2 `,
      [ownerId, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Owner not found',
      });
    }

    const owner = ownerResult.rows[0];

    // If owner already has a Stripe customer, return it
    if (owner.stripe_customer_id) {
      console.log('[Stripe] Owner already has customer:', owner.stripe_customer_id);
      return createResponse(200, {
        success: true,
        customerId: owner.stripe_customer_id,
        message: 'Stripe customer already exists',
      });
    }

    // Create Stripe customer
    const customer = await stripeClient.customers.create({
      email: owner.email,
      name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || undefined,
      phone: owner.phone,
      metadata: {
        tenant_id: tenantId,
        owner_id: ownerId,
        barkbase_owner: 'true',
      },
    });

    console.log('[Stripe] Customer created:', customer.id);

    // Save Stripe customer ID to owner record
    await query(
      `UPDATE "Owner" SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [customer.id, ownerId, tenantId]
    );

    return createResponse(201, {
      success: true,
      customerId: customer.id,
      message: 'Stripe customer created',
    });

  } catch (error) {
    console.error('[Stripe] Failed to create customer:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create Stripe customer',
    });
  }
}

/**
 * Get Stripe customer for an owner
 */
async function handleGetStripeCustomer(tenantId, ownerId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT id, stripe_customer_id, first_name, last_name, email
       FROM "Owner" WHERE id = $1 AND tenant_id = $2 `,
      [ownerId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Owner not found',
      });
    }

    const owner = result.rows[0];

    return createResponse(200, {
      ownerId: owner.id,
      customerId: owner.stripe_customer_id,
      hasStripeCustomer: !!owner.stripe_customer_id,
      ownerName: `${owner.first_name || ''} ${owner.last_name || ''}`.trim(),
      email: owner.email,
    });

  } catch (error) {
    console.error('[Stripe] Failed to get customer:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to get Stripe customer',
    });
  }
}

/**
 * Attach a payment method to a Stripe customer and save to database
 *
 * @param {string} tenantId - Tenant ID
 * @param {object} body - { paymentMethodId, ownerId, setAsDefault }
 */
async function handleAttachPaymentMethod(tenantId, body) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'Payment processing is not configured.',
    });
  }

  const { paymentMethodId, ownerId, setAsDefault = true } = body;

  if (!paymentMethodId || !ownerId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'paymentMethodId and ownerId are required',
    });
  }

  try {
    await getPoolAsync();

    // Get owner with Stripe customer ID (exclude soft-deleted)
    const ownerResult = await query(
      `SELECT id, stripe_customer_id FROM "Owner" WHERE id = $1 AND tenant_id = $2 `,
      [ownerId, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Owner not found',
      });
    }

    let stripeCustomerId = ownerResult.rows[0].stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customerResult = await handleCreateStripeCustomer(tenantId, { ownerId });
      const customerData = JSON.parse(customerResult.body);
      if (!customerData.success) {
        return customerResult;
      }
      stripeCustomerId = customerData.customerId;
    }

    // Attach payment method to customer in Stripe
    const paymentMethod = await stripeClient.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    console.log('[Stripe] Payment method attached:', paymentMethodId);

    // Set as default if requested
    if (setAsDefault) {
      await stripeClient.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Save payment method to our database
    const card = paymentMethod.card;
    const insertResult = await query(
      `INSERT INTO "PaymentMethod" (
        tenant_id, owner_id, stripe_payment_method_id, type,
        card_brand, card_last4, card_exp_month, card_exp_year,
        is_default, billing_name, billing_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (stripe_payment_method_id) DO UPDATE SET
        is_default = EXCLUDED.is_default,
        updated_at = NOW()
      RETURNING *`,
      [
        tenantId,
        ownerId,
        paymentMethodId,
        paymentMethod.type,
        card?.brand,
        card?.last4,
        card?.exp_month,
        card?.exp_year,
        setAsDefault,
        paymentMethod.billing_details?.name,
        paymentMethod.billing_details?.email,
      ]
    );

    const savedMethod = insertResult.rows[0];

    return createResponse(200, {
      success: true,
      paymentMethod: {
        id: savedMethod.id,
        stripePaymentMethodId: savedMethod.stripe_payment_method_id,
        type: savedMethod.type,
        brand: savedMethod.card_brand,
        last4: savedMethod.card_last4,
        expMonth: savedMethod.card_exp_month,
        expYear: savedMethod.card_exp_year,
        isDefault: savedMethod.is_default,
      },
      message: 'Payment method saved successfully',
    });

  } catch (error) {
    console.error('[Stripe] Failed to attach payment method:', error.message);

    if (error.code === 'resource_already_exists') {
      return createResponse(400, {
        error: 'Already Attached',
        message: 'This payment method is already attached to a customer',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to attach payment method',
    });
  }
}

/**
 * List saved payment methods for an owner
 */
async function handleListStripePaymentMethods(tenantId, ownerId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
        pm.id,
        pm.stripe_payment_method_id,
        pm.type,
        pm.card_brand,
        pm.card_last4,
        pm.card_exp_month,
        pm.card_exp_year,
        pm.is_default,
        pm.billing_name,
        pm.created_at
       FROM "PaymentMethod" pm
       WHERE pm.owner_id = $1 AND pm.tenant_id = $2
       ORDER BY pm.is_default DESC, pm.created_at DESC`,
      [ownerId, tenantId]
    );

    const methods = result.rows.map(row => ({
      id: row.id,
      stripePaymentMethodId: row.stripe_payment_method_id,
      type: row.type,
      brand: row.card_brand,
      last4: row.card_last4,
      expMonth: row.card_exp_month,
      expYear: row.card_exp_year,
      isDefault: row.is_default,
      billingName: row.billing_name,
      createdAt: row.created_at,
    }));

    return createResponse(200, {
      paymentMethods: methods,
      total: methods.length,
    });

  } catch (error) {
    // Handle missing table gracefully
    if (error.code === '42P01') {
      return createResponse(200, {
        paymentMethods: [],
        total: 0,
        message: 'PaymentMethod table not yet created',
      });
    }

    console.error('[Stripe] Failed to list payment methods:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to list payment methods',
    });
  }
}

/**
 * Detach (remove) a payment method from Stripe and our database
 */
async function handleDetachPaymentMethod(tenantId, stripePaymentMethodId) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'Payment processing is not configured.',
    });
  }

  try {
    await getPoolAsync();

    // Verify the payment method belongs to this tenant
    const pmResult = await query(
      `SELECT id, owner_id FROM "PaymentMethod"
       WHERE stripe_payment_method_id = $1 AND tenant_id = $2`,
      [stripePaymentMethodId, tenantId]
    );

    if (pmResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Payment method not found',
      });
    }

    // Detach from Stripe
    await stripeClient.paymentMethods.detach(stripePaymentMethodId);

    console.log('[Stripe] Payment method detached:', stripePaymentMethodId);

    // Remove from our database
    await query(
      `DELETE FROM "PaymentMethod" WHERE stripe_payment_method_id = $1 AND tenant_id = $2`,
      [stripePaymentMethodId, tenantId]
    );

    return createResponse(200, {
      success: true,
      message: 'Payment method removed successfully',
    });

  } catch (error) {
    console.error('[Stripe] Failed to detach payment method:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to remove payment method',
    });
  }
}

/**
 * Create a SetupIntent for saving a card without immediate payment
 * Used for adding cards to customer's saved payment methods
 */
async function handleCreateSetupIntent(tenantId, body) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'Payment processing is not configured.',
    });
  }

  const { ownerId } = body;

  if (!ownerId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'ownerId is required',
    });
  }

  try {
    await getPoolAsync();

    // Get or create Stripe customer (exclude soft-deleted)
    const ownerResult = await query(
      `SELECT stripe_customer_id FROM "Owner" WHERE id = $1 AND tenant_id = $2 `,
      [ownerId, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Owner not found',
      });
    }

    let stripeCustomerId = ownerResult.rows[0].stripe_customer_id;

    if (!stripeCustomerId) {
      const customerResult = await handleCreateStripeCustomer(tenantId, { ownerId });
      const customerData = JSON.parse(customerResult.body);
      if (!customerData.success) {
        return customerResult;
      }
      stripeCustomerId = customerData.customerId;
    }

    // Create SetupIntent
    const setupIntent = await stripeClient.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        tenant_id: tenantId,
        owner_id: ownerId,
      },
    });

    console.log('[Stripe] SetupIntent created:', setupIntent.id);

    return createResponse(200, {
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: stripeCustomerId,
    });

  } catch (error) {
    console.error('[Stripe] Failed to create SetupIntent:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create setup intent',
    });
  }
}

/**
 * Handle Stripe webhook events
 * Verifies webhook signature and processes events
 */
async function handleStripeWebhook(event) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe Webhook] Stripe not configured');
    return createResponse(503, { error: 'Service unavailable' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return createResponse(500, { error: 'Webhook not configured' });
  }

  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header');
    return createResponse(400, { error: 'Missing signature' });
  }

  let stripeEvent;
  try {
    // Use raw body for signature verification
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    stripeEvent = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return createResponse(400, { error: 'Invalid signature' });
  }

  console.log('[Stripe Webhook] Received event:', stripeEvent.type, stripeEvent.id);

  try {
    await getPoolAsync();

    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object;
        console.log('[Stripe Webhook] Payment succeeded:', paymentIntent.id);

        const tenantId = paymentIntent.metadata?.tenant_id;
        if (!tenantId) {
          console.warn('[Stripe Webhook] No tenant_id in metadata');
          break;
        }

        // Check if payment already recorded
        const existing = await query(
          `SELECT id FROM "Payment" WHERE stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );

        if (existing.rows.length === 0) {
          // Record the payment
          await query(
            `INSERT INTO "Payment" (
              tenant_id, owner_id, invoice_id, amount_cents, method, processor,
              processor_transaction_id, stripe_payment_intent_id, status, processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              tenantId,
              paymentIntent.metadata?.owner_id || null,
              paymentIntent.metadata?.invoice_id || null,
              paymentIntent.amount,
              'card',
              'stripe',
              paymentIntent.latest_charge,
              paymentIntent.id,
              'completed',
            ]
          );
          console.log('[Stripe Webhook] Payment recorded via webhook');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object;
        console.log('[Stripe Webhook] Payment failed:', paymentIntent.id);

        const tenantId = paymentIntent.metadata?.tenant_id;
        if (!tenantId) break;

        // Record the failed payment attempt
        await query(
          `INSERT INTO "Payment" (
            tenant_id, owner_id, invoice_id, amount_cents, method, processor,
            stripe_payment_intent_id, status, failure_code, failure_message, processed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL
          DO UPDATE SET
            status = 'failed',
            failure_code = EXCLUDED.failure_code,
            failure_message = EXCLUDED.failure_message,
            updated_at = NOW()`,
          [
            tenantId,
            paymentIntent.metadata?.owner_id || null,
            paymentIntent.metadata?.invoice_id || null,
            paymentIntent.amount,
            'card',
            'stripe',
            paymentIntent.id,
            'failed',
            paymentIntent.last_payment_error?.code,
            paymentIntent.last_payment_error?.message,
          ]
        );
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object;
        console.log('[Stripe Webhook] Charge refunded:', charge.id);

        // Update payment record with refund info
        // NOTE: Payment table does NOT have refund_amount_cents or refunded_at columns
        // Just update the status and add a note about the refund amount
        await query(
          `UPDATE "Payment"
           SET status = 'refunded',
               notes = COALESCE(notes, '') || ' [Refunded: $' || ($1::numeric / 100)::text || ' on ' || NOW()::text || ']',
               updated_at = NOW()
           WHERE processor_transaction_id = $2`,
          [charge.amount_refunded, charge.id]
        );
        break;
      }

      case 'customer.deleted': {
        const customer = stripeEvent.data.object;
        console.log('[Stripe Webhook] Customer deleted:', customer.id);

        // Clear Stripe customer ID from owner
        await query(
          `UPDATE "Owner" SET stripe_customer_id = NULL, updated_at = NOW()
           WHERE stripe_customer_id = $1`,
          [customer.id]
        );

        // Remove associated payment methods
        await query(
          `DELETE FROM "PaymentMethod"
           WHERE owner_id IN (SELECT id FROM "Owner" WHERE stripe_customer_id = $1)`,
          [customer.id]
        );
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', stripeEvent.type);
    }

    return createResponse(200, { received: true });

  } catch (error) {
    console.error('[Stripe Webhook] Processing error:', error.message);
    // Return 200 to prevent Stripe from retrying (we logged the error)
    return createResponse(200, { received: true, error: 'Processing error logged' });
  }
}

// =============================================================================
// PACKAGE/CREDIT HANDLERS
// =============================================================================

/**
 * Get packages for tenant/owner
 */
async function handleGetPackages(tenantId, queryParams) {
  const { status, limit = 50, offset = 0 } = queryParams;

  console.log('[Packages][list] tenantId:', tenantId, queryParams);

  try {
    await getPoolAsync();

    let whereClause = 'p.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (status === 'active') {
      whereClause += ` AND p.is_active = true`;
    }

    // Get packages with their included services
    const result = await query(
      `SELECT
         p.id,
         p.tenant_id,
         p.name,
         p.description,
         p.price_in_cents,
         p.discount_percent,
         p.is_active,
         p.created_at,
         p.updated_at,
         COALESCE(
           json_agg(
             json_build_object(
               'serviceId', ps.service_id,
               'serviceName', s.name,
               'quantity', ps.quantity,
               'unitPriceInCents', s.price_in_cents
             )
           ) FILTER (WHERE ps.service_id IS NOT NULL),
           '[]'
         ) as services
       FROM "Package" p
       LEFT JOIN "PackageService" ps ON p.id = ps.package_id
       LEFT JOIN "Service" s ON ps.service_id = s.id
       WHERE ${whereClause}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const packages = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      priceInCents: row.price_in_cents,
      price: row.price_in_cents / 100,
      discountPercent: row.discount_percent,
      isActive: row.is_active,
      services: row.services || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log('[Packages][list] Found:', packages.length);

    return createResponse(200, {
      data: packages,
      packages: packages,
      total: packages.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('[Packages] Get packages failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve packages',
    });
  }
}

/**
 * Get single package
 */
async function handleGetPackage(tenantId, packageId) {
  console.log('[Packages][get] id:', packageId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         p.*,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         (p.total_credits - COALESCE(p.used_credits, 0)) as remaining_credits
       FROM "Package" p
       LEFT JOIN "Owner" o ON p.owner_id = o.id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [packageId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Package not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      tenantId: row.tenant_id,
      ownerId: row.owner_id,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      ownerEmail: row.owner_email,
      name: row.name,
      description: row.description,
      totalCredits: row.total_credits,
      usedCredits: row.used_credits || 0,
      remainingCredits: row.remaining_credits,
      priceInCents: row.price_in_cents,
      purchasedAt: row.purchased_at,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
    });

  } catch (error) {
    console.error('[Packages] Get package failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve package',
    });
  }
}

/**
 * Create/purchase a package
 */
async function handleCreatePackage(tenantId, body) {
  const { ownerId, name, description, totalCredits, priceInCents, expiresAt } = body;

  console.log('[Packages][create] tenantId:', tenantId);

  if (!ownerId || !name || !totalCredits) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'ownerId, name, and totalCredits are required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "Package" (
         tenant_id, owner_id, name, description, total_credits, used_credits,
         price_in_cents, purchased_at, expires_at, is_active
       )
       VALUES ($1, $2, $3, $4, $5, 0, $6, NOW(), $7, true)
       RETURNING *`,
      [tenantId, ownerId, name, description || null, totalCredits, priceInCents || 0, expiresAt || null]
    );

    const pkg = result.rows[0];
    console.log('[Packages][create] Created:', pkg.id);

    return createResponse(201, {
      success: true,
      id: pkg.id,
      name: pkg.name,
      totalCredits: pkg.total_credits,
      remainingCredits: pkg.total_credits,
      message: 'Package created successfully',
    });

  } catch (error) {
    console.error('[Packages] Create failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create package',
    });
  }
}

/**
 * Update package
 */
async function handleUpdatePackage(tenantId, packageId, body) {
  const { name, description, totalCredits, expiresAt, isActive } = body;

  console.log('[Packages][update] id:', packageId);

  try {
    await getPoolAsync();

    const updates = [];
    const values = [packageId, tenantId];
    let paramIndex = 3;

    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (totalCredits !== undefined) { updates.push(`total_credits = $${paramIndex++}`); values.push(totalCredits); }
    if (expiresAt !== undefined) { updates.push(`expires_at = $${paramIndex++}`); values.push(expiresAt); }
    if (isActive !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(isActive); }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Package" SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Package not found',
      });
    }

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      message: 'Package updated',
    });

  } catch (error) {
    console.error('[Packages] Update failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update package',
    });
  }
}

/**
 * Delete package
 */
async function handleDeletePackage(tenantId, packageId) {
  console.log('[Packages][delete] id:', packageId);

  try {
    await getPoolAsync();

    const result = await query(
      `DELETE FROM "Package" WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [packageId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Package not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Package deleted',
    });

  } catch (error) {
    console.error('[Packages] Delete failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete package',
    });
  }
}

/**
 * Use credits from a package
 */
async function handleUsePackageCredits(tenantId, packageId, body) {
  const { creditsUsed, bookingId, notes } = body;

  console.log('[Packages][use] id:', packageId, 'credits:', creditsUsed);

  if (!creditsUsed || creditsUsed <= 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'creditsUsed must be a positive number',
    });
  }

  try {
    await getPoolAsync();

    // Get current package
    const pkgResult = await query(
      `SELECT * FROM "Package" WHERE id = $1 AND tenant_id = $2`,
      [packageId, tenantId]
    );

    if (pkgResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Package not found',
      });
    }

    const pkg = pkgResult.rows[0];

    // Check if package is active
    if (!pkg.is_active) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Package is not active',
      });
    }

    // Check if expired
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Package has expired',
      });
    }

    // Check available credits
    const availableCredits = pkg.total_credits - (pkg.used_credits || 0);
    if (creditsUsed > availableCredits) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Insufficient credits. Available: ${availableCredits}, Requested: ${creditsUsed}`,
        availableCredits,
      });
    }

    // Update package credits
    await query(
      `UPDATE "Package" SET used_credits = used_credits + $1, updated_at = NOW() WHERE id = $2`,
      [creditsUsed, packageId]
    );

    // Record usage
    const usageResult = await query(
      `INSERT INTO "PackageUsage" (package_id, booking_id, credits_used, used_at, notes)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING *`,
      [packageId, bookingId || null, creditsUsed, notes || null]
    );

    const newAvailable = availableCredits - creditsUsed;

    console.log('[Packages][use] Used', creditsUsed, 'credits, remaining:', newAvailable);

    return createResponse(200, {
      success: true,
      usageId: usageResult.rows[0].id,
      creditsUsed,
      previousBalance: availableCredits,
      newBalance: newAvailable,
      message: `${creditsUsed} credits used successfully`,
    });

  } catch (error) {
    console.error('[Packages] Use credits failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to use package credits',
    });
  }
}

/**
 * Get package usage history
 */
async function handleGetPackageUsage(tenantId, packageId) {
  console.log('[Packages][usage] id:', packageId);

  try {
    await getPoolAsync();

    // Verify package belongs to tenant
    const pkgResult = await query(
      `SELECT id FROM "Package" WHERE id = $1 AND tenant_id = $2`,
      [packageId, tenantId]
    );

    if (pkgResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Package not found',
      });
    }

    // Get usage history
    const result = await query(
      `SELECT
         pu.*,
         b.check_in as booking_check_in,
         b.check_out as booking_check_out,
         p.name as pet_name
       FROM "PackageUsage" pu
       LEFT JOIN "Booking" b ON pu.booking_id = b.id
       LEFT JOIN "Pet" p ON b.pet_id = p.id
       WHERE pu.package_id = $1
       ORDER BY pu.used_at DESC`,
      [packageId]
    );

    const usage = result.rows.map(row => ({
      id: row.id,
      packageId: row.package_id,
      bookingId: row.booking_id,
      bookingCheckIn: row.booking_check_in,
      bookingCheckOut: row.booking_check_out,
      petName: row.pet_name,
      creditsUsed: row.credits_used,
      usedAt: row.used_at,
      notes: row.notes,
    }));

    return createResponse(200, {
      data: usage,
      usage: usage,
      total: usage.length,
    });

  } catch (error) {
    console.error('[Packages] Get usage failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve package usage',
    });
  }
}

// =============================================================================
// COMMISSION TRACKING HANDLERS
// =============================================================================

/**
 * Get commission rates
 */
async function handleGetCommissionRates(tenantId, queryParams) {
  const { staffId, serviceId, active = 'true' } = queryParams;

  console.log('[Commission][rates] Get rates for tenant:', tenantId);

  try {
    await getPoolAsync();

    let whereClause = 'cr.tenant_id = $1';
    const params = [tenantId];

    if (active === 'true') {
      whereClause += ` AND cr.is_active = true`;
    }
    if (staffId) {
      whereClause += ` AND (cr.staff_id = $${params.length + 1} OR cr.staff_id IS NULL)`;
      params.push(staffId);
    }
    if (serviceId) {
      whereClause += ` AND (cr.service_id = $${params.length + 1} OR cr.service_id IS NULL)`;
      params.push(serviceId);
    }

    const result = await query(
      `SELECT 
         cr.*,
         s.first_name as staff_first_name,
         s.last_name as staff_last_name,
         svc.name as service_name
       FROM "CommissionRate" cr
       LEFT JOIN "Staff" s ON cr.staff_id = s.id
       LEFT JOIN "Service" svc ON cr.service_id = svc.id
       WHERE ${whereClause}
       ORDER BY cr.created_at DESC`,
      params
    );

    const rates = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      staffId: row.staff_id,
      staffName: row.staff_first_name ? `${row.staff_first_name} ${row.staff_last_name}`.trim() : null,
      serviceId: row.service_id,
      serviceName: row.service_name,
      rateType: row.rate_type,
      rateValue: parseFloat(row.rate_value),
      minBookingValue: row.min_booking_value ? parseFloat(row.min_booking_value) : null,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: rates,
      rates,
      total: rates.length,
      message: 'Commission rates retrieved successfully',
    });

  } catch (error) {
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, {
        data: [],
        rates: [],
        total: 0,
        message: 'Commission rates (table not initialized)',
      });
    }
    console.error('[Commission] Get rates failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve commission rates',
    });
  }
}

/**
 * Create commission rate
 */
async function handleCreateCommissionRate(tenantId, body) {
  const { staffId, serviceId, rateType = 'percentage', rateValue, minBookingValue, effectiveFrom, effectiveTo } = body;

  console.log('[Commission][rates] Create rate:', { tenantId, staffId, rateValue });

  if (rateValue === undefined || rateValue === null || rateValue < 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'rateValue is required and must be non-negative',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "CommissionRate" (
         tenant_id, staff_id, service_id, rate_type, rate_value,
         min_booking_value, effective_from, effective_to, is_active, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
       RETURNING *`,
      [
        tenantId,
        staffId || null,
        serviceId || null,
        rateType,
        rateValue,
        minBookingValue || null,
        effectiveFrom || new Date().toISOString().split('T')[0],
        effectiveTo || null,
      ]
    );

    const row = result.rows[0];

    return createResponse(201, {
      success: true,
      data: {
        id: row.id,
        recordId: row.id,
        rateType: row.rate_type,
        rateValue: parseFloat(row.rate_value),
        isActive: row.is_active,
      },
      message: 'Commission rate created successfully',
    });

  } catch (error) {
    console.error('[Commission] Create rate failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create commission rate',
    });
  }
}

/**
 * Get single commission rate
 */
async function handleGetCommissionRate(tenantId, rateId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT cr.*, s.first_name as staff_first_name, s.last_name as staff_last_name, svc.name as service_name
       FROM "CommissionRate" cr
       LEFT JOIN "Staff" s ON cr.staff_id = s.id
       LEFT JOIN "Service" svc ON cr.service_id = svc.id
       WHERE cr.id = $1 AND cr.tenant_id = $2`,
      [rateId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Commission rate not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      data: {
        id: row.id,
        staffId: row.staff_id,
        staffName: row.staff_first_name ? `${row.staff_first_name} ${row.staff_last_name}` : null,
        serviceId: row.service_id,
        serviceName: row.service_name,
        rateType: row.rate_type,
        rateValue: parseFloat(row.rate_value),
        minBookingValue: row.min_booking_value ? parseFloat(row.min_booking_value) : null,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
        isActive: row.is_active,
      },
    });

  } catch (error) {
    console.error('[Commission] Get rate failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve commission rate',
    });
  }
}

/**
 * Update commission rate
 */
async function handleUpdateCommissionRate(tenantId, rateId, body) {
  const updates = [];
  const values = [rateId, tenantId];
  let paramIndex = 3;

  if (body.rateType !== undefined) {
    updates.push(`rate_type = $${paramIndex++}`);
    values.push(body.rateType);
  }
  if (body.rateValue !== undefined) {
    updates.push(`rate_value = $${paramIndex++}`);
    values.push(body.rateValue);
  }
  if (body.minBookingValue !== undefined) {
    updates.push(`min_booking_value = $${paramIndex++}`);
    values.push(body.minBookingValue);
  }
  if (body.effectiveFrom !== undefined) {
    updates.push(`effective_from = $${paramIndex++}`);
    values.push(body.effectiveFrom);
  }
  if (body.effectiveTo !== undefined) {
    updates.push(`effective_to = $${paramIndex++}`);
    values.push(body.effectiveTo);
  }
  if (body.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(body.isActive);
  }

  if (updates.length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'No fields to update',
    });
  }

  updates.push('updated_at = NOW()');

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "CommissionRate"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Commission rate not found',
      });
    }

    return createResponse(200, {
      success: true,
      data: result.rows[0],
      message: 'Commission rate updated successfully',
    });

  } catch (error) {
    console.error('[Commission] Update rate failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update commission rate',
    });
  }
}

/**
 * Delete (deactivate) commission rate
 */
async function handleDeleteCommissionRate(tenantId, rateId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "CommissionRate"
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [rateId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Commission rate not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Commission rate deactivated',
    });

  } catch (error) {
    console.error('[Commission] Delete rate failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete commission rate',
    });
  }
}

/**
 * Get commission records
 */
async function handleGetCommissions(tenantId, queryParams) {
  const { staffId, status, startDate, endDate, limit = 50 } = queryParams;

  console.log('[Commission][ledger] Get commissions:', { tenantId, staffId, status });

  try {
    await getPoolAsync();

    let whereClause = 'cl.tenant_id = $1';
    const params = [tenantId];

    if (staffId) {
      whereClause += ` AND cl.staff_id = $${params.length + 1}`;
      params.push(staffId);
    }
    if (status) {
      whereClause += ` AND cl.status = $${params.length + 1}`;
      params.push(status);
    }
    if (startDate) {
      whereClause += ` AND cl.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND cl.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    params.push(parseInt(limit));

    const result = await query(
      `SELECT 
         cl.*,
         s.first_name as staff_first_name,
         s.last_name as staff_last_name,
         b.start_date as booking_start_date,
         b.end_date as booking_end_date,
         svc.name as service_name
       FROM "CommissionLedger" cl
       LEFT JOIN "Staff" s ON cl.staff_id = s.id
       LEFT JOIN "Booking" b ON cl.booking_id = b.id
       LEFT JOIN "Service" svc ON cl.service_id = svc.id
       WHERE ${whereClause}
       ORDER BY cl.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    const commissions = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      staffId: row.staff_id,
      staffName: row.staff_first_name ? `${row.staff_first_name} ${row.staff_last_name}`.trim() : null,
      bookingId: row.booking_id,
      bookingStartDate: row.booking_start_date,
      bookingEndDate: row.booking_end_date,
      serviceId: row.service_id,
      serviceName: row.service_name,
      bookingAmount: parseFloat(row.booking_amount),
      commissionAmount: parseFloat(row.commission_amount),
      rateType: row.rate_type,
      rateValue: parseFloat(row.rate_value),
      status: row.status,
      approvedAt: row.approved_at,
      paidAt: row.paid_at,
      paymentReference: row.payment_reference,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    return createResponse(200, {
      data: commissions,
      commissions,
      total: commissions.length,
      message: 'Commissions retrieved successfully',
    });

  } catch (error) {
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, {
        data: [],
        commissions: [],
        total: 0,
        message: 'Commissions (table not initialized)',
      });
    }
    console.error('[Commission] Get ledger failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve commissions',
    });
  }
}

/**
 * Get single commission record
 */
async function handleGetCommission(tenantId, commissionId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT cl.*, s.first_name as staff_first_name, s.last_name as staff_last_name, svc.name as service_name
       FROM "CommissionLedger" cl
       LEFT JOIN "Staff" s ON cl.staff_id = s.id
       LEFT JOIN "Service" svc ON cl.service_id = svc.id
       WHERE cl.id = $1 AND cl.tenant_id = $2`,
      [commissionId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Commission record not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      data: {
        id: row.id,
        staffId: row.staff_id,
        staffName: row.staff_first_name ? `${row.staff_first_name} ${row.staff_last_name}` : null,
        bookingId: row.booking_id,
        serviceId: row.service_id,
        serviceName: row.service_name,
        bookingAmount: parseFloat(row.booking_amount),
        commissionAmount: parseFloat(row.commission_amount),
        rateType: row.rate_type,
        rateValue: parseFloat(row.rate_value),
        status: row.status,
        approvedAt: row.approved_at,
        paidAt: row.paid_at,
        paymentReference: row.payment_reference,
        notes: row.notes,
        createdAt: row.created_at,
      },
    });

  } catch (error) {
    console.error('[Commission] Get record failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve commission record',
    });
  }
}

/**
 * Update commission record
 */
async function handleUpdateCommission(tenantId, commissionId, body) {
  const updates = [];
  const values = [commissionId, tenantId];
  let paramIndex = 3;

  if (body.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(body.notes);
  }
  if (body.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(body.status);
  }

  if (updates.length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'No fields to update',
    });
  }

  updates.push('updated_at = NOW()');

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "CommissionLedger"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Commission record not found',
      });
    }

    return createResponse(200, {
      success: true,
      data: result.rows[0],
      message: 'Commission updated successfully',
    });

  } catch (error) {
    console.error('[Commission] Update failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update commission',
    });
  }
}

/**
 * Approve commission
 */
async function handleApproveCommission(tenantId, commissionId, user) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "CommissionLedger"
       SET status = 'approved', approved_by = $3, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
       RETURNING *`,
      [commissionId, tenantId, user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Commission not found or not in pending status',
      });
    }

    return createResponse(200, {
      success: true,
      data: result.rows[0],
      message: 'Commission approved successfully',
    });

  } catch (error) {
    console.error('[Commission] Approve failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to approve commission',
    });
  }
}

/**
 * Mark commission as paid
 */
async function handleMarkCommissionPaid(tenantId, commissionId, body) {
  const { paymentReference } = body;

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "CommissionLedger"
       SET status = 'paid', paid_at = NOW(), payment_reference = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'approved'
       RETURNING *`,
      [commissionId, tenantId, paymentReference || null]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Commission not found or not in approved status',
      });
    }

    return createResponse(200, {
      success: true,
      data: result.rows[0],
      message: 'Commission marked as paid',
    });

  } catch (error) {
    console.error('[Commission] Mark paid failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to mark commission as paid',
    });
  }
}

/**
 * Get staff commission summary
 */
async function handleGetStaffCommissionSummary(tenantId, staffId, queryParams) {
  const { startDate, endDate } = queryParams;

  console.log('[Commission][summary] Staff:', staffId);

  try {
    await getPoolAsync();

    let whereClause = 'cl.tenant_id = $1 AND cl.staff_id = $2';
    const params = [tenantId, staffId];

    if (startDate) {
      whereClause += ` AND cl.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND cl.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    const summaryResult = await query(
      `SELECT
         COUNT(*) as total_commissions,
         COALESCE(SUM(commission_amount), 0) as total_amount,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0) as approved_amount,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
       FROM "CommissionLedger" cl
       WHERE ${whereClause}`,
      params
    );

    const summary = summaryResult.rows[0];

    // Get recent commissions
    const recentResult = await query(
      `SELECT cl.*, svc.name as service_name
       FROM "CommissionLedger" cl
       LEFT JOIN "Service" svc ON cl.service_id = svc.id
       WHERE cl.tenant_id = $1 AND cl.staff_id = $2
       ORDER BY cl.created_at DESC
       LIMIT 10`,
      [tenantId, staffId]
    );

    return createResponse(200, {
      data: {
        totalCommissions: parseInt(summary.total_commissions),
        totalAmount: parseFloat(summary.total_amount),
        pendingAmount: parseFloat(summary.pending_amount),
        approvedAmount: parseFloat(summary.approved_amount),
        paidAmount: parseFloat(summary.paid_amount),
        pendingCount: parseInt(summary.pending_count),
        approvedCount: parseInt(summary.approved_count),
        paidCount: parseInt(summary.paid_count),
        recentCommissions: recentResult.rows.map(row => ({
          id: row.id,
          bookingAmount: parseFloat(row.booking_amount),
          commissionAmount: parseFloat(row.commission_amount),
          serviceName: row.service_name,
          status: row.status,
          createdAt: row.created_at,
        })),
      },
      message: 'Staff commission summary retrieved successfully',
    });

  } catch (error) {
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, {
        data: {
          totalCommissions: 0,
          totalAmount: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
          recentCommissions: [],
        },
        message: 'No commission data available',
      });
    }
    console.error('[Commission] Get summary failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve commission summary',
    });
  }
}

/**
 * Calculate commission for a booking
 */
async function handleCalculateCommission(tenantId, body) {
  const { bookingId, staffId, bookingAmount, serviceId } = body;

  console.log('[Commission][calculate]', { tenantId, staffId, bookingAmount });

  if (!staffId || bookingAmount === undefined) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'staffId and bookingAmount are required',
    });
  }

  try {
    await getPoolAsync();

    // Find applicable commission rate
    const rateResult = await query(
      `SELECT * FROM "CommissionRate"
       WHERE tenant_id = $1
       AND is_active = true
       AND (staff_id = $2 OR staff_id IS NULL)
       AND (service_id = $3 OR service_id IS NULL)
       AND effective_from <= CURRENT_DATE
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       AND (min_booking_value IS NULL OR min_booking_value <= $4)
       ORDER BY 
         CASE WHEN staff_id IS NOT NULL THEN 0 ELSE 1 END,
         CASE WHEN service_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1`,
      [tenantId, staffId, serviceId || null, bookingAmount]
    );

    if (rateResult.rows.length === 0) {
      return createResponse(200, {
        data: {
          hasRate: false,
          commissionAmount: 0,
          message: 'No applicable commission rate found',
        },
      });
    }

    const rate = rateResult.rows[0];
    let commissionAmount = 0;

    if (rate.rate_type === 'percentage') {
      commissionAmount = (bookingAmount * parseFloat(rate.rate_value)) / 100;
    } else {
      commissionAmount = parseFloat(rate.rate_value);
    }

    // Round to 2 decimal places
    commissionAmount = Math.round(commissionAmount * 100) / 100;

    // If bookingId provided, create the commission record
    let commissionRecord = null;
    if (bookingId) {
      const insertResult = await query(
        `INSERT INTO "CommissionLedger" (
           tenant_id, staff_id, booking_id, service_id, commission_rate_id,
           booking_amount, commission_amount, rate_type, rate_value, status, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
         RETURNING *`,
        [
          tenantId,
          staffId,
          bookingId,
          serviceId || null,
          rate.id,
          bookingAmount,
          commissionAmount,
          rate.rate_type,
          rate.rate_value,
        ]
      );
      commissionRecord = insertResult.rows[0];
    }

    return createResponse(200, {
      data: {
        hasRate: true,
        rateId: rate.id,
        rateType: rate.rate_type,
        rateValue: parseFloat(rate.rate_value),
        bookingAmount,
        commissionAmount,
        commissionRecord: commissionRecord ? {
          id: commissionRecord.id,
          status: commissionRecord.status,
        } : null,
      },
      message: 'Commission calculated successfully',
    });

  } catch (error) {
    console.error('[Commission] Calculate failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to calculate commission',
    });
  }
}
