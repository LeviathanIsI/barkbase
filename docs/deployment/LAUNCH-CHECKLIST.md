# Launch Checklist

## Overview

This checklist ensures BarkBase is ready for beta launch. All items must be verified before deploying to production.

---

## Pre-Launch Requirements

### ✅ Phase 1-5 Completion

- [x] **Phase 1: Security Lockdown**
  - [x] Payment idempotency implemented
  - [x] Input validation for all endpoints
  - [x] Environment variable logging removed
  - [x] Foreign key validation added
  - [x] Email format validation added

- [x] **Phase 2: Integration & Stability**
  - [x] API endpoint paths corrected
  - [x] Error boundaries implemented
  - [x] Console.log statements removed
  - [x] Snake_case to camelCase transformation
  - [x] Mutation error handling added

- [x] **Phase 3: Testing Foundation**
  - [x] Test utilities configured
  - [x] Mock data factories created
  - [x] MSW handlers implemented
  - [x] Unit tests for critical paths

- [x] **Phase 4: Performance & Accessibility**
  - [x] List virtualization for large datasets
  - [x] Query optimizations (N+1 fixes)
  - [x] HTTP cache headers configured
  - [x] Database indexes created
  - [x] ARIA attributes added
  - [x] Keyboard navigation working

- [x] **Phase 5: Polish & Launch Prep**
  - [x] Sentry error tracking configured
  - [x] Request ID tracking implemented
  - [x] Rate limiting ready
  - [x] Environment variables documented

---

## Environment Setup

### Frontend Configuration

```bash
# Required environment variables
VITE_API_URL=https://api.yourdomain.com
VITE_COGNITO_USER_POOL_ID=us-east-2_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_DOMAIN=your-domain.auth.us-east-2.amazoncognito.com
VITE_COGNITO_REGION=us-east-2
VITE_REDIRECT_URI=https://app.yourdomain.com/auth/callback
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Backend Configuration

```bash
# Required for Lambda
DATABASE_URL=postgresql://...
AWS_REGION=us-east-2
COGNITO_USER_POOL_ID=us-east-2_XXXXXXXXX
COGNITO_CLIENT_ID=xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
S3_BUCKET=barkbase-uploads-production
SES_FROM_EMAIL=noreply@yourdomain.com
```

### Verification

```bash
# Run the pre-launch verification script
./scripts/verify-launch-ready.sh production
```

---

## Database Migration

### Pre-Migration Checklist

- [ ] Database backup completed
- [ ] Migration tested in staging
- [ ] Rollback plan documented
- [ ] Maintenance window scheduled

### Run Migrations

```bash
# From backend directory
cd backend

# Check pending migrations
npx prisma migrate status

# Apply migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull --print
```

### Post-Migration Verification

```bash
# Verify tables exist
psql $DATABASE_URL -c "\dt"

# Verify indexes
psql $DATABASE_URL -c "\di"

# Run schema validation
npx prisma validate
```

---

## Infrastructure Deployment

### AWS Resources Required

| Resource | Description | Status |
|----------|-------------|--------|
| RDS PostgreSQL | Primary database | ☐ |
| Cognito User Pool | Authentication | ☐ |
| S3 Bucket | File uploads | ☐ |
| CloudFront | CDN for frontend | ☐ |
| API Gateway | API routing | ☐ |
| Lambda Functions | Backend services | ☐ |
| DynamoDB | Rate limiting | ☐ |
| SES | Email sending | ☐ |
| CloudWatch | Logging & monitoring | ☐ |

### CDK/SAM Deployment

```bash
# Deploy infrastructure
sam build
sam deploy --stack-name barkbase-production \
  --parameter-overrides Environment=production

# Or using CDK
cdk deploy --all --require-approval never
```

### Verify Deployment

```bash
# Check Lambda functions
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'barkbase')]"

# Check API Gateway
aws apigateway get-rest-apis

# Check CloudFront distribution
aws cloudfront list-distributions
```

---

## DNS Configuration

### Required DNS Records

| Type | Name | Value |
|------|------|-------|
| A/ALIAS | `app.yourdomain.com` | CloudFront distribution |
| A/ALIAS | `api.yourdomain.com` | API Gateway/CloudFront |
| CNAME | `auth.yourdomain.com` | Cognito domain |
| MX | `yourdomain.com` | SES (for email) |
| TXT | `_amazonses.yourdomain.com` | SES verification |

### SSL Certificates

- [ ] Frontend certificate in ACM (us-east-1 for CloudFront)
- [ ] API certificate in ACM (deployment region)
- [ ] Cognito custom domain certificate

### Verification

```bash
# Check DNS propagation
dig app.yourdomain.com
dig api.yourdomain.com

# Verify SSL
curl -I https://app.yourdomain.com
curl -I https://api.yourdomain.com
```

---

## Third-Party Services

### Stripe

- [ ] Production API keys configured
- [ ] Webhook endpoint registered
- [ ] Webhook events selected:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `customer.created`
  - `invoice.paid`

```bash
# Verify Stripe webhook
curl -X POST https://api.yourdomain.com/api/v1/financial/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

### Sentry

- [ ] Project created
- [ ] DSN configured in frontend
- [ ] Source maps uploaded
- [ ] Alerts configured

```bash
# Upload source maps
npx @sentry/cli sourcemaps upload \
  --org your-org \
  --project barkbase \
  ./dist
```

### Twilio (if using SMS)

- [ ] Account verified
- [ ] Phone number purchased
- [ ] Credentials configured

---

## Security Checklist

### Authentication

- [ ] Cognito User Pool configured
- [ ] MFA enabled (optional)
- [ ] Password policy set
- [ ] JWT validation working

### Authorization

- [ ] Role-based access control working
- [ ] Tenant isolation verified
- [ ] Admin-only routes protected

### Data Protection

- [ ] Database encryption enabled
- [ ] S3 bucket encryption enabled
- [ ] HTTPS enforced everywhere
- [ ] Sensitive headers stripped from logs

### Rate Limiting

- [ ] DynamoDB table created
- [ ] Rate limits configured
- [ ] 429 responses working

---

## Performance Checklist

### Frontend

- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 80
- [ ] Core Web Vitals passing
- [ ] Images optimized
- [ ] Code splitting working

```bash
# Build and analyze
cd frontend
npm run build
npx source-map-explorer dist/assets/*.js
```

### Backend

- [ ] Cold start < 3 seconds
- [ ] API response < 500ms (p95)
- [ ] Database queries < 100ms
- [ ] Memory usage within limits

### CDN

- [ ] CloudFront caching configured
- [ ] Cache headers correct
- [ ] Gzip/Brotli compression enabled

---

## Monitoring Setup

### CloudWatch

- [ ] Log groups created
- [ ] Log retention configured (30 days)
- [ ] Alarms configured:
  - [ ] Error rate > 5%
  - [ ] P95 latency > 2s
  - [ ] 5xx errors > 10/min

### Sentry

- [ ] Error alerts configured
- [ ] Performance monitoring enabled
- [ ] Release tracking configured

### Uptime Monitoring

- [ ] Health check endpoint working
- [ ] Uptime monitor configured (e.g., Pingdom, UptimeRobot)

---

## Demo Account

- [ ] Demo tenant created
- [ ] Sample data seeded:
  - [ ] 50+ owners
  - [ ] 100+ pets
  - [ ] 200+ bookings
  - [ ] Realistic distribution across dates
- [ ] Demo user credentials documented

---

## Documentation

- [ ] API documentation complete
- [ ] User guide ready
- [ ] Admin guide ready
- [ ] Troubleshooting guide ready
- [ ] Internal runbook ready

---

## Post-Launch Verification

### Immediately After Deploy

```bash
# 1. Verify frontend loads
curl -I https://app.yourdomain.com

# 2. Verify API health
curl https://api.yourdomain.com/health

# 3. Check authentication
# (manual - log in via UI)

# 4. Create test booking
# (manual - use demo account)

# 5. Check logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/barkbase-entity-service \
  --filter-pattern "ERROR" \
  --start-time $(date -d '5 minutes ago' +%s000)
```

### First Hour

- [ ] Monitor error rate in Sentry
- [ ] Monitor API latency in CloudWatch
- [ ] Verify Stripe webhooks processing
- [ ] Check database connections
- [ ] Verify email delivery

### First Day

- [ ] Review all error logs
- [ ] Check performance metrics
- [ ] Verify backup job ran
- [ ] Review user feedback

---

## Rollback Plan

### If Critical Issue Found

```bash
# 1. Revert frontend to previous version
aws s3 sync s3://barkbase-frontend-backup/ s3://barkbase-frontend/
aws cloudfront create-invalidation --distribution-id EXXX --paths "/*"

# 2. Revert Lambda functions
sam deploy --stack-name barkbase-production --template-file previous-template.yaml

# 3. Revert database (if needed)
# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier barkbase-prod-restored \
  --db-snapshot-identifier pre-launch-snapshot
```

### Contact Information

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | TBD | TBD |
| DevOps | TBD | TBD |
| Product | TBD | TBD |

---

## Sign-Off

| Item | Verified By | Date |
|------|-------------|------|
| Code Complete | | |
| Tests Passing | | |
| Security Review | | |
| Performance Review | | |
| Final Approval | | |

**Launch Date:** _______________

**Launch Time:** _______________
