const crypto = require('crypto');
const prisma = require('../config/prisma');

/**
 * Idempotency middleware - Prevents duplicate operations
 * Client sends `Idempotency-Key` header with unique UUID
 * If key already processed, return cached response
 */
const ensureIdempotent = (options = {}) => {
  const { ttlHours = 24 } = options;

  return async (req, res, next) => {
    const idempotencyKey = req.headers['idempotency-key'];
    
    // Only enforce on mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // If no key provided, allow (optional idempotency)
    if (!idempotencyKey) {
      return next();
    }

    try {
      const tenantId = req.tenantId || null;
      const endpoint = `${req.method} ${req.path}`;
      
      // Generate request hash for additional safety
      const requestHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({
          method: req.method,
          path: req.path,
          body: req.body,
        }))
        .digest('hex');

      // Check if key exists
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing) {
        // Key exists - check status
        if (existing.status === 'completed') {
          // Return cached response
          return res.status(200).json(existing.responsePayload);
        }

        if (existing.status === 'pending') {
          // Request in progress - tell client to retry
          return res.status(409).json({
            message: 'Request is currently being processed. Please retry.',
            idempotencyKey,
          });
        }

        if (existing.status === 'failed') {
          // Previous attempt failed - allow retry
          await prisma.idempotencyKey.update({
            where: { recordId: existing.recordId },
            data: { status: 'pending', requestHash },
          });
        }
      } else {
        // Create new idempotency key
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + ttlHours);

        await prisma.idempotencyKey.create({
          data: {
            tenantId,
            key: idempotencyKey,
            endpoint,
            requestHash,
            status: 'pending',
            expiresAt,
          },
        });
      }

      // Intercept res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = async function (data) {
        // Only cache successful responses (2xx status)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            await prisma.idempotencyKey.update({
              where: { key: idempotencyKey },
              data: {
                status: 'completed',
                responsePayload: data,
              },
            });
          } catch (error) {
            // Log but don't fail the response
            console.error('Failed to cache idempotent response:', error);
          }
        } else {
          // Mark as failed for non-success responses
          try {
            await prisma.idempotencyKey.update({
              where: { key: idempotencyKey },
              data: { status: 'failed' },
            });
          } catch (error) {
            console.error('Failed to mark idempotency key as failed:', error);
          }
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Idempotency middleware error:', error);
      // Don't block request on idempotency errors
      next();
    }
  };
};

/**
 * Cleanup expired idempotency keys (run as cron job)
 */
const cleanupExpiredKeys = async () => {
  const deleted = await prisma.idempotencyKey.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`Cleaned up ${deleted.count} expired idempotency keys`);
  return deleted.count;
};

module.exports = {
  ensureIdempotent,
  cleanupExpiredKeys,
};

