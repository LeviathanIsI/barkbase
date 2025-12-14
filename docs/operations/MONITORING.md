# Monitoring & Observability

## Overview

BarkBase implements comprehensive monitoring across frontend and backend:

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend Errors | Sentry | Error tracking, session replay |
| Backend Errors | Sentry | Lambda error tracking |
| Logs | CloudWatch | Structured logging |
| Metrics | CloudWatch | Performance metrics |
| Tracing | Request IDs | Request correlation |

---

## Error Tracking (Sentry)

### Frontend Configuration

**File:** `frontend/src/lib/sentry.js`

```javascript
import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENV || 'production',

      integrations: [
        // Performance monitoring
        Sentry.browserTracingIntegration(),
        // Session replay for debugging
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Sample rates
      tracesSampleRate: 0.1,           // 10% of transactions
      replaysSessionSampleRate: 0.1,   // 10% of sessions
      replaysOnErrorSampleRate: 1.0,   // 100% of error sessions

      // Filter noise
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        /Loading chunk \d+ failed/,
        /Network Error/,
        /AbortError/,
        /ChunkLoadError/,
      ],

      // Privacy: Remove sensitive headers
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['X-Tenant-Id'];
        }
        return event;
      },
    });
  }
}
```

### User Context

```javascript
// Set after login
export function setSentryUser(user) {
  if (import.meta.env.PROD && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // Don't include name for privacy
    });
  }
}

// Clear on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Set tenant context
export function setSentryTenant(tenant) {
  if (import.meta.env.PROD && tenant) {
    Sentry.setTag('tenant_id', tenant.id);
    Sentry.setTag('tenant_name', tenant.name);
  }
}
```

### Manual Error Capture

```javascript
import { captureError, trackEvent } from '@/lib/sentry';

// Capture with context
try {
  await processPayment(data);
} catch (error) {
  captureError(error, {
    invoiceId: data.invoiceId,
    amount: data.amount,
    action: 'payment_processing',
  });
  throw error;
}

// Track custom events
trackEvent('booking_created', {
  serviceType: booking.serviceType,
  duration: booking.nights,
});
```

### Session Replay

Session replay captures user interactions leading up to an error:
- Mouse movements and clicks
- Form inputs (sensitive fields masked)
- Network requests
- Console logs

**Viewing replays:** Sentry dashboard → Issues → Click issue → Session Replay tab

### Privacy Considerations

1. **PII Masking:** Names and emails not included in user context
2. **Header Stripping:** Authorization and tenant headers removed
3. **Session Replay:** Can mask sensitive text if needed
4. **Data Retention:** Configurable in Sentry (default 90 days)

---

## Request Tracing

### Request ID Generation

**File:** `aws/layers/shared-layer/nodejs/requestContext.js`

```javascript
const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const asyncLocalStorage = new AsyncLocalStorage();

function generateRequestId() {
  return `req_${crypto.randomBytes(12).toString('hex')}`;
}

function initRequestContext(event) {
  // Use incoming request ID if present, otherwise generate
  const requestId =
    event.headers?.['x-request-id'] ||
    event.headers?.['X-Request-Id'] ||
    generateRequestId();

  return {
    requestId,
    tenantId: event.headers?.['x-tenant-id'],
    userId: event.requestContext?.authorizer?.claims?.sub,
    startTime: Date.now(),
    path: event.path || event.requestContext?.http?.path,
    method: event.httpMethod || event.requestContext?.http?.method,
  };
}

function getRequestContext() {
  return asyncLocalStorage.getStore() || {};
}

function runWithContext(context, fn) {
  return asyncLocalStorage.run(context, fn);
}
```

### Middleware Wrapper

```javascript
function withRequestContext(handler) {
  return async (event, lambdaContext) => {
    const context = initRequestContext(event);

    return runWithContext(context, async () => {
      logger.info('Request started');

      try {
        const result = await handler(event, lambdaContext);

        logger.info('Request completed', {
          statusCode: result.statusCode,
        });

        // Add request ID to response
        return {
          ...result,
          headers: {
            ...result.headers,
            'X-Request-ID': context.requestId,
          },
        };
      } catch (error) {
        logger.error('Request failed', {
          error: error.message,
          stack: error.stack,
        });

        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': context.requestId,
          },
          body: JSON.stringify({
            error: 'Internal server error',
            requestId: context.requestId,
          }),
        };
      }
    });
  };
}
```

### Tracing a Request

1. **Frontend:** Request ID returned in `X-Request-ID` header
2. **Error Response:** Request ID included in error body
3. **CloudWatch:** Search logs by request ID

```sql
-- CloudWatch Logs Insights query
fields @timestamp, @message, requestId, statusCode, durationMs
| filter requestId = 'req_abc123xyz'
| sort @timestamp asc
```

---

## Structured Logging

### Log Format

All logs are JSON for CloudWatch Logs Insights parsing:

```javascript
function createLogger() {
  const log = (level, message, data = {}) => {
    const context = getRequestContext();

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: context.requestId,
      tenantId: context.tenantId,
      userId: context.userId,
      path: context.path,
      method: context.method,
      message,
      ...data,
      ...(context.startTime && {
        durationMs: Date.now() - context.startTime,
      }),
    };

    console.log(JSON.stringify(logEntry));
  };

  return {
    info: (message, data) => log('INFO', message, data),
    warn: (message, data) => log('WARN', message, data),
    error: (message, data) => log('ERROR', message, data),
    debug: (message, data) => {
      if (process.env.LOG_LEVEL === 'DEBUG') {
        log('DEBUG', message, data);
      }
    },
  };
}
```

### Log Entry Example

```json
{
  "timestamp": "2024-12-13T15:30:45.123Z",
  "level": "INFO",
  "requestId": "req_abc123xyz789",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "path": "/api/v1/operations/bookings",
  "method": "POST",
  "message": "Booking created successfully",
  "bookingId": "booking-uuid",
  "durationMs": 245
}
```

### Log Levels

| Level | Use Case |
|-------|----------|
| `DEBUG` | Detailed debugging (disabled in production) |
| `INFO` | Normal operations |
| `WARN` | Potential issues |
| `ERROR` | Errors requiring attention |

---

## CloudWatch Logs Insights Queries

### Common Queries

**Find errors in last hour:**
```sql
fields @timestamp, @message, requestId, tenantId
| filter level = 'ERROR'
| sort @timestamp desc
| limit 100
```

**Request latency percentiles:**
```sql
fields durationMs
| filter level = 'INFO' and message = 'Request completed'
| stats
    avg(durationMs) as avg_ms,
    percentile(durationMs, 50) as p50,
    percentile(durationMs, 95) as p95,
    percentile(durationMs, 99) as p99
```

**Requests by tenant:**
```sql
fields tenantId
| filter level = 'INFO' and message = 'Request started'
| stats count() as requests by tenantId
| sort requests desc
```

**Error rate by endpoint:**
```sql
fields path, level
| stats
    count(*) as total,
    sum(level = 'ERROR') as errors
by path
| extend error_rate = (errors / total) * 100
| sort error_rate desc
```

**Slow requests (>1 second):**
```sql
fields @timestamp, path, durationMs, requestId
| filter durationMs > 1000
| sort durationMs desc
| limit 50
```

**Payment failures:**
```sql
fields @timestamp, @message, requestId, tenantId
| filter @message like /payment/i and level = 'ERROR'
| sort @timestamp desc
```

---

## CloudWatch Metrics

### Custom Metrics

```javascript
const { CloudWatch } = require('@aws-sdk/client-cloudwatch');
const cloudwatch = new CloudWatch({});

async function recordMetric(name, value, unit = 'Count', dimensions = {}) {
  await cloudwatch.putMetricData({
    Namespace: 'BarkBase',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    }],
  });
}

// Usage
await recordMetric('BookingCreated', 1, 'Count', {
  TenantId: tenantId,
  ServiceType: 'BOARDING',
});

await recordMetric('PaymentProcessed', amount, 'None', {
  TenantId: tenantId,
  Method: 'CARD',
});
```

### Key Metrics to Track

| Metric | Unit | Description |
|--------|------|-------------|
| `BookingCreated` | Count | New bookings |
| `BookingCancelled` | Count | Cancelled bookings |
| `PaymentProcessed` | Amount | Payment amounts |
| `PaymentFailed` | Count | Failed payments |
| `APILatency` | Milliseconds | Request duration |
| `Error4xx` | Count | Client errors |
| `Error5xx` | Count | Server errors |

---

## Alerting

### CloudWatch Alarms

```yaml
# Example alarm configuration
- AlarmName: HighErrorRate
  MetricName: Error5xx
  Namespace: BarkBase
  Statistic: Sum
  Period: 300  # 5 minutes
  EvaluationPeriods: 2
  Threshold: 10
  ComparisonOperator: GreaterThanThreshold
  AlarmActions:
    - !Ref AlertSNSTopic

- AlarmName: HighLatency
  MetricName: APILatency
  Namespace: BarkBase
  Statistic: p95
  Period: 300
  EvaluationPeriods: 3
  Threshold: 2000  # 2 seconds
  ComparisonOperator: GreaterThanThreshold
```

### Alert Thresholds

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Error Rate > 5% | 5 minutes | Critical |
| P95 Latency > 2s | 5 minutes | Warning |
| Payment Failures > 3 | 15 minutes | Critical |
| No Bookings (business hours) | 2 hours | Warning |

---

## Dashboard

### Key Dashboard Widgets

1. **Request Rate** - Requests per minute
2. **Error Rate** - Errors as % of requests
3. **Latency (P50, P95, P99)** - Response times
4. **Active Users** - Unique users per hour
5. **Bookings Created** - Bookings per hour
6. **Revenue** - Payment volume
7. **Top Errors** - Most common errors
8. **Tenant Activity** - Requests by tenant

### Creating Dashboard

```bash
# Using AWS CLI
aws cloudwatch put-dashboard \
  --dashboard-name BarkBase-Operations \
  --dashboard-body file://dashboard.json
```

---

## Performance Monitoring

### Lambda Cold Starts

Monitor via CloudWatch Logs:
```sql
fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed
| filter @type = 'REPORT'
| stats
    avg(@duration) as avg_duration,
    max(@duration) as max_duration,
    count(*) as invocations
by bin(1h)
```

### Database Performance

Track slow queries:
```javascript
const startTime = Date.now();
const result = await query(sql, params);
const duration = Date.now() - startTime;

if (duration > 100) {
  logger.warn('Slow query detected', {
    sql: sql.substring(0, 100),
    durationMs: duration,
  });
}
```

### API Latency Tracking

```javascript
// Add timing to response headers
function withTiming(handler) {
  return async (event, context) => {
    const start = Date.now();
    const result = await handler(event, context);
    const duration = Date.now() - start;

    return {
      ...result,
      headers: {
        ...result.headers,
        'X-Response-Time': `${duration}ms`,
      },
    };
  };
}
```
