/**
 * =============================================================================
 * BarkBase Webhook Utilities
 * =============================================================================
 * 
 * Utilities for sending outbound webhooks to external systems
 * 
 * =============================================================================
 */

const crypto = require('crypto');

// Webhook event types
const WEBHOOK_EVENTS = {
  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  
  // Customer events
  OWNER_CREATED: 'owner.created',
  OWNER_UPDATED: 'owner.updated',
  
  // Pet events
  PET_CREATED: 'pet.created',
  PET_UPDATED: 'pet.updated',
  
  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_REFUNDED: 'payment.refunded',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  
  // Staff events
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_RESOLVED: 'incident.resolved',
  
  // Vaccination events
  VACCINATION_EXPIRING: 'vaccination.expiring',
  VACCINATION_EXPIRED: 'vaccination.expired',
};

/**
 * Generate webhook signature using HMAC-SHA256
 * @param {string} payload - JSON payload string
 * @param {string} secret - Webhook secret
 * @returns {string} - Signature
 */
function generateSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify webhook signature
 * @param {string} payload - JSON payload string
 * @param {string} signature - Received signature header
 * @param {string} secret - Webhook secret
 * @param {number} tolerance - Time tolerance in seconds (default 300)
 * @returns {boolean}
 */
function verifySignature(payload, signature, secret, tolerance = 300) {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));
    
    if (!timestampPart || !signaturePart) {
      return false;
    }
    
    const timestamp = parseInt(timestampPart.split('=')[1], 10);
    const receivedSignature = signaturePart.split('=')[1];
    
    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      return false;
    }
    
    // Generate expected signature
    const signaturePayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
    
    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[WEBHOOK] Signature verification failed:', error.message);
    return false;
  }
}

/**
 * Send a webhook to an endpoint
 * @param {object} endpoint - Webhook endpoint config
 * @param {string} eventType - Event type
 * @param {object} payload - Event payload
 * @returns {Promise<object>}
 */
async function sendWebhook(endpoint, eventType, payload) {
  const { url, secret, headers: customHeaders, timeout_seconds = 30 } = endpoint;
  
  const webhookPayload = {
    id: crypto.randomUUID(),
    type: eventType,
    created: new Date().toISOString(),
    data: payload,
  };
  
  const payloadString = JSON.stringify(webhookPayload);
  
  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'BarkBase-Webhook/1.0',
    'X-Webhook-Event': eventType,
    'X-Webhook-Delivery': webhookPayload.id,
    ...customHeaders,
  };
  
  // Add signature if secret is configured
  if (secret) {
    headers['X-Webhook-Signature'] = generateSignature(payloadString, secret);
  }
  
  console.log('[WEBHOOK] Sending to:', url, 'Event:', eventType);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout_seconds * 1000);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseBody = await response.text();
    
    console.log('[WEBHOOK] Response:', response.status);
    
    return {
      success: response.ok,
      status: response.status,
      body: responseBody,
      deliveryId: webhookPayload.id,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[WEBHOOK] Delivery failed:', error.message);
    
    return {
      success: false,
      status: null,
      error: error.message,
      deliveryId: webhookPayload.id,
    };
  }
}

/**
 * Queue a webhook delivery (for async processing)
 * @param {object} db - Database query function
 * @param {string} tenantId - Tenant ID
 * @param {string} eventType - Event type
 * @param {string} eventId - ID of entity that triggered event
 * @param {object} payload - Event payload
 * @returns {Promise<object[]>} - List of delivery records created
 */
async function queueWebhookDeliveries(db, tenantId, eventType, eventId, payload) {
  try {
    // Get active endpoints subscribed to this event
    const endpointsResult = await db.query(
      `SELECT * FROM "WebhookEndpoint"
       WHERE tenant_id = $1
       AND is_active = true
       AND $2 = ANY(events)
       AND deleted_at IS NULL`,
      [tenantId, eventType]
    );
    
    if (endpointsResult.rows.length === 0) {
      console.log('[WEBHOOK] No active endpoints for event:', eventType);
      return [];
    }
    
    // Create delivery records
    const deliveries = [];
    for (const endpoint of endpointsResult.rows) {
      const deliveryResult = await db.query(
        `INSERT INTO "WebhookDelivery" (
           tenant_id, endpoint_id, event_type, event_id, payload, status
         ) VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [tenantId, endpoint.id, eventType, eventId, JSON.stringify(payload)]
      );
      deliveries.push(deliveryResult.rows[0]);
    }
    
    console.log('[WEBHOOK] Queued', deliveries.length, 'deliveries for', eventType);
    
    return deliveries;
  } catch (error) {
    console.error('[WEBHOOK] Queue failed:', error.message);
    return [];
  }
}

/**
 * Process pending webhook deliveries
 * @param {object} db - Database query function
 * @returns {Promise<object>} - Processing results
 */
async function processPendingDeliveries(db) {
  const results = { processed: 0, succeeded: 0, failed: 0 };
  
  try {
    // Get pending deliveries that are due for retry
    const deliveriesResult = await db.query(
      `SELECT d.*, e.url, e.secret, e.headers, e.timeout_seconds, e.retry_count as max_retries
       FROM "WebhookDelivery" d
       JOIN "WebhookEndpoint" e ON d.endpoint_id = e.id
       WHERE d.status IN ('pending', 'retrying')
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW())
       AND d.attempt_count < e.retry_count
       ORDER BY d.created_at ASC
       LIMIT 100`
    );
    
    for (const delivery of deliveriesResult.rows) {
      results.processed++;
      
      const payload = typeof delivery.payload === 'string' 
        ? JSON.parse(delivery.payload) 
        : delivery.payload;
      
      const endpoint = {
        url: delivery.url,
        secret: delivery.secret,
        headers: delivery.headers,
        timeout_seconds: delivery.timeout_seconds,
      };
      
      const result = await sendWebhook(endpoint, delivery.event_type, payload);
      
      if (result.success) {
        // Mark as success
        await db.query(
          `UPDATE "WebhookDelivery"
           SET status = 'success',
               attempt_count = attempt_count + 1,
               response_status = $2,
               response_body = $3,
               delivered_at = NOW()
           WHERE id = $1`,
          [delivery.id, result.status, result.body]
        );
        results.succeeded++;
      } else {
        // Calculate next retry time with exponential backoff
        const attemptCount = delivery.attempt_count + 1;
        const backoffMinutes = Math.pow(2, attemptCount); // 2, 4, 8, 16...
        
        const status = attemptCount >= delivery.max_retries ? 'failed' : 'retrying';
        
        await db.query(
          `UPDATE "WebhookDelivery"
           SET status = $2,
               attempt_count = $3,
               response_status = $4,
               error_message = $5,
               next_retry_at = NOW() + INTERVAL '${backoffMinutes} minutes'
           WHERE id = $1`,
          [delivery.id, status, attemptCount, result.status, result.error]
        );
        
        if (status === 'failed') {
          results.failed++;
        }
      }
    }
    
    console.log('[WEBHOOK] Processed:', results);
    return results;
    
  } catch (error) {
    console.error('[WEBHOOK] Processing failed:', error.message);
    return results;
  }
}

module.exports = {
  WEBHOOK_EVENTS,
  generateSignature,
  verifySignature,
  sendWebhook,
  queueWebhookDeliveries,
  processPendingDeliveries,
};

