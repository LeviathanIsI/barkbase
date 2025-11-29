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

const { getPoolAsync, query } = dbLayer;
const {
  authenticateRequest,
  createResponse,
  parseBody,
} = sharedLayer;

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
  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[FINANCIAL-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
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
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetPayment(tenantId, paymentId);
        }
      }
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
 *   due_date, issued_at, sent_at, paid_at, notes, line_items, created_at, updated_at, deleted_at
 */
async function handleGetInvoices(tenantId, queryParams) {
  const { status, customerId, limit = 50, offset = 0 } = queryParams;

  console.log('[Invoices][list] tenantId:', tenantId);
  console.log('[Invoices][list] query:', JSON.stringify(queryParams || {}));
  console.log('[Invoices][list] env DB_NAME:', process.env.DB_NAME || process.env.DB_DATABASE);

  try {
    await getPoolAsync();

    // Diagnostic: counts per tenant
    try {
      const diagCounts = await query(
        `SELECT tenant_id, COUNT(*) as cnt FROM "Invoice" GROUP BY tenant_id`
      );
      console.log('[Invoices][diag] counts per tenant:', JSON.stringify(diagCounts.rows));
    } catch (diagErr) {
      console.warn('[Invoices][diag] count query failed:', diagErr.message);
    }

    // Diagnostic: sample rows for this tenant
    try {
      const diagSample = await query(
        `SELECT id, status, total_cents, due_date FROM "Invoice" WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [tenantId]
      );
      console.log('[Invoices][diag] sample for tenant', tenantId, ':', JSON.stringify(diagSample.rows));
    } catch (diagErr) {
      console.warn('[Invoices][diag] sample query failed:', diagErr.message);
    }

    let whereClause = 'i.tenant_id = $1 AND i.deleted_at IS NULL';
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
      amount: parseFloat(row.amount || 0),
      dueDate: row.due_date,
      notes: row.notes,
      customer: row.first_name ? {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      } : null,
      createdAt: row.created_at,
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
  const { ownerId, amount, dueDate, notes, lineItems } = body;

  if (!ownerId || !amount) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Owner ID and amount are required',
    });
  }

  try {
    await getPoolAsync();

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    const result = await query(
      `INSERT INTO "Invoice" (tenant_id, owner_id, invoice_number, amount, due_date, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', NOW(), NOW())
       RETURNING *`,
      [tenantId, ownerId, invoiceNumber, amount, dueDate, notes]
    );

    return createResponse(201, {
      success: true,
      invoice: {
        id: result.rows[0].id,
        invoiceNumber: result.rows[0].invoice_number,
        status: result.rows[0].status,
        amount: parseFloat(result.rows[0].amount),
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

async function handleUpdateInvoice(tenantId, invoiceId, body) {
  const { amount, dueDate, notes, status } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [invoiceId, tenantId];
    let paramIndex = 3;

    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
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

    return createResponse(200, {
      success: true,
      invoice: result.rows[0],
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

    // Diagnostic: counts per tenant
    try {
      const diagCounts = await query(
        `SELECT tenant_id, COUNT(*) as cnt FROM "Payment" GROUP BY tenant_id`
      );
      console.log('[Payments][diag] counts per tenant:', JSON.stringify(diagCounts.rows));
    } catch (diagErr) {
      console.warn('[Payments][diag] count query failed:', diagErr.message);
    }

    // Diagnostic: sample rows for this tenant
    try {
      const diagSample = await query(
        `SELECT id, status, amount_cents, processed_at FROM "Payment" WHERE tenant_id = $1 ORDER BY processed_at DESC LIMIT 5`,
        [tenantId]
      );
      console.log('[Payments][diag] sample for tenant', tenantId, ':', JSON.stringify(diagSample.rows));
    } catch (diagErr) {
      console.warn('[Payments][diag] sample query failed:', diagErr.message);
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

    const result = await query(
      `SELECT id, name, description, price, unit, is_active
       FROM "Service"
       WHERE tenant_id = $1
       ORDER BY name`,
      [tenantId]
    );

    const items = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price || 0),
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

    const result = await query(
      `SELECT * FROM "Service" WHERE id = $1 AND tenant_id = $2`,
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
      price: parseFloat(row.price || 0),
      unit: row.unit,
      isActive: row.is_active,
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
  const { name, description, price, unit } = body;

  if (!name || price === undefined) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Name and price are required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "Service" (tenant_id, name, description, price, unit, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING *`,
      [tenantId, name, description, price, unit || 'per day']
    );

    return createResponse(201, {
      success: true,
      item: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        price: parseFloat(result.rows[0].price),
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
  const { name, description, price, unit, isActive } = body;

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
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
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

    return createResponse(200, {
      success: true,
      item: result.rows[0],
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

    let basePrice = 0;

    if (serviceId) {
      const result = await query(
        `SELECT price FROM "Service" WHERE id = $1 AND tenant_id = $2`,
        [serviceId, tenantId]
      );
      basePrice = parseFloat(result.rows[0]?.price || 0);
    }

    const subtotal = basePrice * parseInt(quantity);
    const discount = subtotal * (parseFloat(discountPercent) / 100);
    const total = subtotal - discount;

    return createResponse(200, {
      data: {
        subtotal,
        discount,
        tax: 0, // Tax calculation would depend on location
        total,
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
         WHERE tenant_id = $1 AND status IN ('SENT', 'OVERDUE') AND deleted_at IS NULL`,
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
       AND b.deleted_at IS NULL
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
       WHERE id = $1 AND deleted_at IS NULL`,
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
         WHERE tenant_id = $1 AND deleted_at IS NULL
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [tenantId]
      ),
      // Count active pets
      query(
        `SELECT COUNT(*) as count FROM "Pet"
         WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true`,
        [tenantId]
      ),
      // Count team members (users)
      query(
        `SELECT COUNT(*) as count FROM "User"
         WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true`,
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
