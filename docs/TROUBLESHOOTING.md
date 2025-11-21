# Troubleshooting Guide

## Overview
This guide helps diagnose and resolve common issues in the Barkbase application.

## How to Read CloudWatch Logs

### Accessing Logs
```bash
# List all log groups
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `Barkbase`)].[logGroupName]'

# Tail specific Lambda logs
aws logs tail /aws/lambda/EntityServiceFunction --follow

# Search logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/EntityServiceFunction \
  --filter-pattern "ERROR"
```

### Log Format
```javascript
// Standard log entry structure
{
  "timestamp": "2024-01-20T12:00:00.000Z",
  "requestId": "abc123-def456",
  "level": "ERROR",
  "message": "Database connection failed",
  "error": {
    "code": "ECONNREFUSED",
    "message": "Connection refused"
  },
  "context": {
    "userId": "user-123",
    "tenantId": "tenant-456",
    "operation": "listPets"
  }
}
```

### CloudWatch Insights Queries
```sql
-- Find all errors in last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

-- Count errors by type
fields @message
| filter @message like /ERROR/
| parse @message /Error: (?<error_type>[^\n]*)/
| stats count() by error_type

-- Find slow Lambda invocations
fields @timestamp, @duration
| filter @duration > 3000
| sort @duration desc
| limit 20

-- Track specific user activity
fields @timestamp, @message
| filter @message like /user-123/
| sort @timestamp desc
```

---

## Common Error Patterns

### 1. 401 Unauthorized
**Symptoms:**
- API calls return 401
- "Unauthorized" in response

**Diagnosis:**
```javascript
// Check for JWT token
console.log('Authorization header:', event.headers.Authorization);

// Check claims extraction
const claims = event?.requestContext?.authorizer?.jwt?.claims;
console.log('JWT claims:', claims);
```

**Solutions:**
1. Verify token is being sent: `Authorization: Bearer {token}`
2. Check token expiration
3. Verify JWT authorizer configuration in CDK
4. Ensure proxy routes have authorizer configured

---

### 2. 403 Forbidden
**Symptoms:**
- User authenticated but lacks permissions
- "Insufficient permissions" error

**Diagnosis:**
```javascript
// Check user role
console.log('User role:', userInfo.role);

// Check tenant association
console.log('User tenantId:', userInfo.tenantId);
```

**Solutions:**
1. Verify user has correct role in database
2. Check tenant membership is active
3. Ensure permissions are properly configured

---

### 3. Database Connection Errors
**Symptoms:**
- "Connection refused" errors
- Timeout errors
- "Too many connections"

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Show all active queries
SELECT pid, state, query_start, query
FROM pg_stat_activity
WHERE state != 'idle';

-- Check connection limit
SHOW max_connections;
```

**Solutions:**
```javascript
// 1. Implement connection pooling
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 2. Close connections properly
finally {
  await client.end();
}

// 3. Increase RDS connection limit if needed
```

---

### 4. Lambda Cold Start Issues
**Symptoms:**
- First request takes 5-10 seconds
- Intermittent timeouts
- Slow response after periods of inactivity

**Diagnosis:**
```javascript
// Add cold start logging
const isCodeStart = !global.initialized;
if (isCodeStart) {
  console.log('COLD START');
  global.initialized = true;
}
```

**Solutions:**
1. Increase Lambda memory (reduces init time)
2. Add provisioned concurrency
3. Initialize connections outside handler
4. Use Lambda SnapStart (Java)

---

### 5. Duplicate Function Declaration
**Symptoms:**
- `SyntaxError: Identifier has already been declared`
- Lambda fails to initialize

**Diagnosis:**
```bash
# Search for duplicate declarations
grep -n "function listPets" entity-service/index.js
grep -n "const listPets" entity-service/index.js
```

**Solution:**
Remove duplicate declarations, keep only one format:
```javascript
// Keep this:
const listPets = async (event, tenantId) => { ... }

// Remove this:
async function listPets(event, tenantId) { ... }
```

---

### 6. Missing TenantId
**Symptoms:**
- "No tenant association" errors
- Empty result sets
- Cross-tenant data leakage

**Diagnosis:**
```javascript
// Check tenant extraction
console.log('Claims:', claims);
console.log('TenantId from claims:', claims.tenantId);
console.log('TenantId from custom:', claims['custom:tenantId']);

// Verify database lookup
const result = await pool.query(
  'SELECT * FROM "Membership" WHERE "userId" = $1',
  [userId]
);
console.log('Membership result:', result.rows);
```

**Solutions:**
1. Implement fallback to database lookup
2. Ensure Cognito custom attributes are set
3. Verify membership records exist

---

## Debug Checklist

### Initial Investigation
- [ ] Check CloudWatch logs for errors
- [ ] Verify API Gateway logs
- [ ] Check Lambda metrics (errors, throttles, duration)
- [ ] Review recent deployments
- [ ] Check database status

### API Issues
- [ ] Verify endpoint URL is correct
- [ ] Check HTTP method (GET/POST/PUT/DELETE)
- [ ] Verify Authorization header format
- [ ] Check CORS configuration
- [ ] Test with curl or Postman

### Lambda Issues
- [ ] Check environment variables
- [ ] Verify IAM permissions
- [ ] Check memory and timeout settings
- [ ] Review cold start patterns
- [ ] Check for syntax errors

### Database Issues
- [ ] Verify connection string
- [ ] Check Secrets Manager access
- [ ] Review connection pool settings
- [ ] Check for long-running queries
- [ ] Verify table permissions

---

## Performance Optimization Tips

### 1. Database Query Optimization
```javascript
// Bad: N+1 query problem
const pets = await getPets();
for (const pet of pets) {
  pet.owner = await getOwner(pet.ownerId); // N queries
}

// Good: Single query with JOIN
const petsWithOwners = await pool.query(`
  SELECT p.*, o.firstName, o.lastName
  FROM pets p
  LEFT JOIN owners o ON p."ownerId" = o."recordId"
  WHERE p."tenantId" = $1
`, [tenantId]);
```

### 2. Connection Pool Reuse
```javascript
// Initialize outside handler
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(config);
  }
  return pool;
}

// Use in handler
exports.handler = async (event) => {
  const pool = getPool(); // Reuses connection
  // ...
};
```

### 3. Lambda Memory Optimization
```typescript
// Monitor memory usage
console.log('Memory used:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');

// Adjust in CDK based on actual usage
new Function(this, 'Function', {
  memorySize: 1024, // Start with 1GB, adjust based on metrics
});
```

### 4. Caching Strategy
```javascript
// In-memory cache for Lambda
const cache = new Map();

async function getCachedData(key, fetcher) {
  if (cache.has(key)) {
    const { data, timestamp } = cache.get(key);
    if (Date.now() - timestamp < 60000) { // 1 minute cache
      return data;
    }
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

---

## Monitoring Commands

### Real-time Monitoring
```bash
# Watch Lambda invocations
aws logs tail /aws/lambda/EntityServiceFunction --follow --format short

# Monitor API Gateway
aws apigatewayv2 get-api --api-id {api-id}

# Check RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=barkbase-dev \
  --start-time 2024-01-20T00:00:00Z \
  --end-time 2024-01-20T01:00:00Z \
  --period 300 \
  --statistics Average
```

### Debugging SQL Queries
```sql
-- Enable query logging
ALTER DATABASE barkbase SET log_statement = 'all';

-- View slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

---

## Emergency Response Procedures

### High Error Rate (>10%)
1. Check CloudWatch alarms
2. Review recent deployments
3. Check database status
4. Review Lambda logs for patterns
5. Consider rollback if needed

### Database Down
1. Check RDS instance status
2. Verify security groups
3. Check connection limits
4. Review recent changes
5. Failover to read replica if available

### API Gateway Issues
1. Check throttling limits
2. Verify authorizer function
3. Check integration timeouts
4. Review CORS settings
5. Check CloudFront if applicable

---

## Known Issues and Workarounds

### Issue: Cognito tokens missing tenantId
**Workaround:** Implemented database lookup fallback
```javascript
if (!tenantId && claims.sub) {
  tenantId = await lookupTenantForUser(claims.sub);
}
```

### Issue: Lambda in VPC increases costs
**Workaround:** Deploy Lambda outside VPC, use public RDS endpoint with SSL

### Issue: Cold starts affect user experience
**Workaround:**
- Keep Lambda warm with scheduled pings
- Use provisioned concurrency for critical functions
- Increase memory allocation (faster CPU)

---

## Helpful Scripts

### Test Endpoint Script
```javascript
// test-endpoint.js
async function testEndpoint(path, method = 'GET') {
  const token = 'your-jwt-token';
  const response = await fetch(`https://api.barkbase.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Status:', response.status);
  console.log('Response:', await response.json());
}
```

### Database Health Check
```javascript
// db-health.js
const { Pool } = require('pg');

async function checkDatabase() {
  const pool = new Pool({
    host: 'barkbase-dev.xxx.rds.amazonaws.com',
    port: 5432,
    database: 'barkbase',
    user: 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database healthy:', result.rows[0].now);
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}
```

---

## Support Resources

### AWS Support
- AWS Console: https://console.aws.amazon.com
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch
- RDS Console: https://console.aws.amazon.com/rds

### Documentation
- Internal: `/docs` directory
- AWS CDK: https://docs.aws.amazon.com/cdk/
- PostgreSQL: https://www.postgresql.org/docs/

### Contact
- DevOps Team: devops@barkbase.com
- On-call Engineer: See PagerDuty rotation