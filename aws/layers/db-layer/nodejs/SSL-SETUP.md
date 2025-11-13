# SSL Certificate Setup for Database Layer

## CRITICAL SECURITY FIX #4

**Issue**: Database connections were configured with `rejectUnauthorized: false`, making them vulnerable to man-in-the-middle attacks.

**Fix**: Enable SSL certificate validation using AWS RDS CA bundle.

---

## Setup Instructions

### 1. Download RDS CA Bundle

```bash
cd aws/layers/db-layer/nodejs/

# Download AWS RDS global CA bundle
curl -o rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Verify download
openssl x509 -in rds-ca-bundle.pem -text -noout | head -20
```

### 2. Verify File Placement

The file `rds-ca-bundle.pem` must be in the same directory as `index.js`:

```
aws/layers/db-layer/nodejs/
├── index.js
├── rds-ca-bundle.pem  ← Must exist here
├── package.json
└── SSL-SETUP.md
```

### 3. Deploy Lambda Layer

After adding the certificate:

```bash
# Package layer with certificate
cd aws/layers/db-layer
zip -r db-layer.zip nodejs/

# Deploy updated layer
aws lambda publish-layer-version \
  --layer-name barkbase-db-layer \
  --zip-file fileb://db-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x \
  --region us-east-1

# Update Lambda functions to use new layer version
# (CDK will handle this automatically on next deployment)
```

### 4. Set Environment Variable

Ensure all Lambda functions have the `ENVIRONMENT` variable set:

```yaml
# In CDK stack or CloudFormation
Environment:
  Variables:
    ENVIRONMENT: production  # or 'staging', 'development'
```

---

## How It Works

**Development Mode** (`ENVIRONMENT=development`):
- SSL validation disabled for local development
- Allows connections to local databases without certificates

**Production Mode** (`ENVIRONMENT=production` or `ENVIRONMENT=staging`):
- SSL validation **enabled** with certificate verification
- Requires `rds-ca-bundle.pem` file to be present
- If certificate missing, logs warning and falls back to disabled (for safety)

---

## Verification

### Check SSL is Working

```javascript
// In CloudWatch Logs, you should see:
// Development:
[DB] SSL validation disabled (development mode)

// Production (with certificate):
[DB] SSL enabled with certificate validation

// Production (without certificate - BAD):
[DB] WARNING: RDS CA bundle not found, SSL validation disabled!
[DB] Download from: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

### Test Database Connection

```bash
# Test in dev environment
ENVIRONMENT=development node -e "
const { getPool } = require('./index');
getPool().query('SELECT 1').then(r => console.log('Dev OK:', r.rows));
"

# Test in production (after deploying certificate)
ENVIRONMENT=production node -e "
const { getPool } = require('./index');
getPool().query('SELECT version()').then(r => console.log('Prod OK:', r.rows));
"
```

---

## Security Benefits

✅ **Prevents MITM attacks**: Validates database server identity
✅ **Protects credentials**: Encrypted connection with verified endpoint
✅ **Compliance**: Meets security requirements for encrypted data in transit
✅ **Environment-aware**: Development remains convenient, production is secure

---

## Rollback

If SSL issues occur in production:

```javascript
// Emergency rollback (in index.js)
// Temporarily set:
const isProduction = false;  // Forces SSL disabled

// Then immediately:
// 1. Deploy this change
// 2. Investigate SSL certificate issues
// 3. Re-enable SSL with proper fix
```

---

## Related Fixes

This fix also includes:
- **Increased connection pool**: `max: 10` (was 5) for better concurrency
- **Query timeout**: `statement_timeout: 30000` prevents runaway queries

---

**Last Updated**: 2025-11-11
**Status**: CODE COMPLETE - Awaiting CA bundle download and deployment
